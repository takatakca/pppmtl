-- PPPMTL durable fulfillment worker leasing (NOT APPLIED).
-- Requires 0001 + 0002. No live workers, printer, tenant credentials or pool are
-- activated by this migration. Apply only to a reviewed, authorized database.
BEGIN;

-- Fencing token prevents stale workers from acknowledging a claimed task.
ALTER TABLE ppp.fulfillment_outbox
  ADD COLUMN IF NOT EXISTS lease_token uuid;

-- Tenant-scoped claim. The app role is NOT BYPASSRLS and MUST set the verified
-- TAKATAK product tenant in the current transaction before invoking.
-- Expired title attempts are safe to re-claim ONLY if the worker checks Clover
-- for an existing site title before making the external title request.
-- Expired print attempts are deliberately NEVER claimed automatically.
CREATE OR REPLACE FUNCTION ppp.claim_due_fulfillment(
  p_limit integer DEFAULT 10,
  p_lease_seconds integer DEFAULT 90
) RETURNS SETOF ppp.fulfillment_outbox
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, ppp
AS $$
DECLARE
  v_tenant text := nullif(current_setting('ppp.tenant_id', true), '');
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Verified tenant context required' USING ERRCODE = '42501';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50
     OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 30 AND 600 THEN
    RAISE EXCEPTION 'Invalid claim lease parameters' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH due AS (
    SELECT work.id
      FROM ppp.fulfillment_outbox AS work
     WHERE work.tenant_id = v_tenant
       AND (
         (work.state IN ('PENDING', 'RETRY') AND work.next_attempt_at <= now())
         OR (work.effect = 'CLOVER_TITLE' AND work.state = 'RUNNING'
             AND work.locked_until < now())
       )
     ORDER BY work.next_attempt_at, work.id
     LIMIT p_limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE ppp.fulfillment_outbox AS outbox
     SET state = 'RUNNING',
         attempts = outbox.attempts + 1,
         lease_token = gen_random_uuid(),
         locked_until = now() + make_interval(secs => p_lease_seconds),
         last_error = NULL
    FROM due
   WHERE outbox.id = due.id AND outbox.tenant_id = v_tenant
  RETURNING outbox.*;
END
$$;

-- Finalize one claimed task. A stale token or expired lease fails closed.
-- Only a successful CLOVER_TITLE may enqueue print intent. The worker MUST
-- have verified that Clover acknowledged the title, and should pass
-- p_enable_print only when this merchant's print feature is enabled.
-- A failed print is ambiguous (the provider may have printed despite a
-- timeout): do not retry it automatically and risk a second kitchen ticket.
CREATE OR REPLACE FUNCTION ppp.finish_fulfillment(
  p_id bigint,
  p_lease_token uuid,
  p_success boolean,
  p_retryable boolean DEFAULT false,
  p_error text DEFAULT NULL,
  p_enable_print boolean DEFAULT false
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, ppp
AS $$
DECLARE
  v_tenant text := nullif(current_setting('ppp.tenant_id', true), '');
  v_item ppp.fulfillment_outbox%ROWTYPE;
  v_new_state text;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Verified tenant context required' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR p_lease_token IS NULL OR p_success IS NULL THEN
    RAISE EXCEPTION 'Incomplete fulfillment acknowledgement' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_item
    FROM ppp.fulfillment_outbox
   WHERE id = p_id AND tenant_id = v_tenant
     AND state = 'RUNNING' AND lease_token = p_lease_token
     AND locked_until > now()
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fulfillment claim expired, unowned or already finalized';
  END IF;

  v_new_state := CASE
    WHEN p_success THEN 'DONE'
    WHEN v_item.effect = 'CLOVER_TITLE' AND coalesce(p_retryable, false)
         AND v_item.attempts < 8 THEN 'RETRY'
    ELSE 'FAILED'
  END;

  UPDATE ppp.fulfillment_outbox
     SET state = v_new_state,
         locked_until = NULL,
         lease_token = NULL,
         completed_at = CASE WHEN p_success THEN now() ELSE completed_at END,
         next_attempt_at = CASE WHEN v_new_state = 'RETRY'
           THEN now() + make_interval(secs => least(
             3600, (30 * power(2, least(v_item.attempts, 6)))::integer
           ))
           ELSE next_attempt_at END,
         last_error = CASE WHEN p_success THEN NULL
           ELSE left(coalesce(nullif(p_error, ''), 'provider result not confirmed'), 500) END
   WHERE id = v_item.id AND tenant_id = v_tenant;

  IF p_success AND v_item.effect = 'CLOVER_TITLE' AND coalesce(p_enable_print, false) THEN
    INSERT INTO ppp.fulfillment_outbox
      (tenant_id, order_id, effect, dedup_key, payload)
    VALUES
      (v_tenant, v_item.order_id, 'CLOVER_PRINT', v_item.dedup_key, v_item.payload)
    ON CONFLICT (tenant_id, effect, dedup_key) DO NOTHING;
  END IF;
  RETURN v_new_state;
END
$$;

-- A crashed print worker may have physically printed before its timeout.
-- Quarantine for operator reconciliation instead of reprinting automatically.
CREATE OR REPLACE FUNCTION ppp.quarantine_expired_prints()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, ppp
AS $$
DECLARE
  v_tenant text := nullif(current_setting('ppp.tenant_id', true), '');
  v_count integer;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Verified tenant context required' USING ERRCODE = '42501';
  END IF;
  UPDATE ppp.fulfillment_outbox
     SET state = 'FAILED',
         lease_token = NULL,
         locked_until = NULL,
         last_error = 'Print result uncertain after worker lease expiry; manual review required'
   WHERE tenant_id = v_tenant
     AND effect = 'CLOVER_PRINT' AND state = 'RUNNING'
     AND locked_until < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;

-- Functions default to PUBLIC EXECUTE in PostgreSQL; grant to approved
-- least-privileged application/worker roles explicitly at deployment.
REVOKE ALL ON FUNCTION ppp.claim_due_fulfillment(integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION ppp.finish_fulfillment(bigint,uuid,boolean,boolean,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION ppp.quarantine_expired_prints() FROM PUBLIC;

COMMIT;
