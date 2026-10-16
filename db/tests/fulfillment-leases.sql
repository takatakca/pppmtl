-- Disposable PostgreSQL 16 fixture, run after 0001, 0002 and 0003.
-- Use an application role without SUPERUSER/BYPASSRLS and with explicit
-- GRANT EXECUTE on the three 0003 worker functions. All writes ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;

SET LOCAL ppp.tenant_id = 'ppp_ci_worker_a';
INSERT INTO ppp.orders
  (id, tenant_id, location_id, provider, idempotency_key,
   order_status, payment_status, order_document)
VALUES
  ('ord_ci_worker_a_00001', 'ppp_ci_worker_a', 'loc-ndg-somerled',
   'clover', 'worker_a_checkout', 'ACCEPTED', 'PAID', '{}'::jsonb);

INSERT INTO ppp.fulfillment_outbox
  (tenant_id, order_id, effect, dedup_key)
VALUES
  ('ppp_ci_worker_a', 'ord_ci_worker_a_00001', 'CLOVER_TITLE', 'SESSION_WORKER_A');

DO $$
DECLARE
  v_claim ppp.fulfillment_outbox%ROWTYPE;
  v_print ppp.fulfillment_outbox%ROWTYPE;
  v_state text;
  v_stale_blocked boolean := false;
BEGIN
  SELECT * INTO v_claim FROM ppp.claim_due_fulfillment(1, 60);
  IF v_claim.id IS NULL OR v_claim.effect <> 'CLOVER_TITLE'
     OR v_claim.lease_token IS NULL OR v_claim.attempts <> 1 THEN
    RAISE EXCEPTION 'Due Clover title was not claimed with a fencing token';
  END IF;

  v_state := ppp.finish_fulfillment(
    v_claim.id, v_claim.lease_token, true, false, NULL, true
  );
  IF v_state <> 'DONE' THEN
    RAISE EXCEPTION 'Confirmed title was not marked done';
  END IF;
  IF (SELECT count(*) FROM ppp.fulfillment_outbox
      WHERE tenant_id = 'ppp_ci_worker_a'
      AND effect = 'CLOVER_PRINT' AND dedup_key = 'SESSION_WORKER_A') <> 1 THEN
    RAISE EXCEPTION 'Exactly one print intent should follow confirmed title';
  END IF;

  BEGIN
    PERFORM ppp.finish_fulfillment(
      v_claim.id, v_claim.lease_token, true, false, NULL, true
    );
  EXCEPTION WHEN raise_exception THEN v_stale_blocked := true;
  END;
  IF NOT v_stale_blocked THEN
    RAISE EXCEPTION 'Stale worker fencing token reused successfully';
  END IF;

  SELECT * INTO v_print FROM ppp.claim_due_fulfillment(1, 60);
  IF v_print.effect <> 'CLOVER_PRINT' OR v_print.lease_token IS NULL THEN
    RAISE EXCEPTION 'Print intent not claimed after title completion';
  END IF;
  -- Even a 'retryable' transport error may hide a physical print. Fail manual.
  v_state := ppp.finish_fulfillment(
    v_print.id, v_print.lease_token, false, true, 'print timeout', false
  );
  IF v_state <> 'FAILED' THEN
    RAISE EXCEPTION 'Ambiguous print was incorrectly retried automatically';
  END IF;
  IF (SELECT count(*) FROM ppp.claim_due_fulfillment(5,60)) <> 0 THEN
    RAISE EXCEPTION 'Failed print was re-claimed';
  END IF;
END
$$;

-- An expired worker lease means the ticket could already be on the printer.
-- It MUST be quarantined for manual review; no automatic duplicate printing.
INSERT INTO ppp.fulfillment_outbox
  (tenant_id, order_id, effect, dedup_key, state, attempts,
   lease_token, locked_until)
VALUES
  ('ppp_ci_worker_a', 'ord_ci_worker_a_00001', 'CLOVER_PRINT',
   'SESSION_WORKER_EXPIRED', 'RUNNING', 1,
   gen_random_uuid(), now() - interval '5 seconds');

DO $$
BEGIN
  IF ppp.quarantine_expired_prints() <> 1 THEN
    RAISE EXCEPTION 'Expired print was not quarantined';
  END IF;
  IF (SELECT count(*) FROM ppp.fulfillment_outbox
      WHERE effect = 'CLOVER_PRINT'
        AND state = 'FAILED'
        AND tenant_id = 'ppp_ci_worker_a') <> 2 THEN
    RAISE EXCEPTION 'Unexpected expired-print quarantine state';
  END IF;
END
$$;

-- Tenant isolation is still enforced by FORCE RLS inside worker functions.
SET LOCAL ppp.tenant_id = 'ppp_ci_worker_b';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM ppp.fulfillment_outbox
             WHERE tenant_id = 'ppp_ci_worker_a') THEN
    RAISE EXCEPTION 'Worker tenant B can read tenant A outbox';
  END IF;
  IF (SELECT count(*) FROM ppp.claim_due_fulfillment(10,60)) <> 0 THEN
    RAISE EXCEPTION 'Worker tenant B claimed tenant A task';
  END IF;
  IF ppp.quarantine_expired_prints() <> 0 THEN
    RAISE EXCEPTION 'Worker tenant B quarantined tenant A print';
  END IF;
END
$$;

ROLLBACK;
