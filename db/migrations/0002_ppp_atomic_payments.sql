-- Transactional PostgreSQL repository operations for PPPMTL (NOT APPLIED).
-- Use only from a trusted server with a verified tenant and a dedicated application role.
-- Every call MUST occur inside a DB transaction after SET LOCAL ppp.tenant_id.
-- The SQL does not authenticate customers or verify a Clover signature; those checks
-- must happen on the server before calling it. The application still uses an in-memory
-- order store until an approved PostgreSQL connection/adapter and migrations are live.
BEGIN;

-- Atomically deduplicate a restaurant order by tenant and idempotency key.
CREATE OR REPLACE FUNCTION ppp.create_order_once(
  p_id text,
  p_location_id text,
  p_provider text,
  p_idempotency_key text,
  p_document jsonb,
  p_customer_ref text DEFAULT NULL
) RETURNS ppp.orders
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, ppp
AS $$
DECLARE
  v_tenant text := nullif(current_setting('ppp.tenant_id', true), '');
  v_order ppp.orders%ROWTYPE;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Verified tenant context required' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR p_location_id IS NULL OR p_provider IS NULL
     OR p_idempotency_key IS NULL OR jsonb_typeof(p_document) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid order input' USING ERRCODE = '22023';
  END IF;

  INSERT INTO ppp.orders (
    id, tenant_id, location_id, provider, idempotency_key, customer_ref,
    order_status, payment_status, order_document
  ) VALUES (
    p_id, v_tenant, p_location_id, p_provider, p_idempotency_key, p_customer_ref,
    'CREATED',
    CASE WHEN p_provider = 'clover' THEN 'UNPAID' ELSE 'PAY_AT_RESTAURANT' END,
    p_document
  )
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_order;

  IF v_order.id IS NULL THEN
    SELECT * INTO v_order FROM ppp.orders
      WHERE tenant_id = v_tenant AND idempotency_key = p_idempotency_key;
  END IF;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve order idempotency claim';
  END IF;
  -- A legitimate retry keeps the initial immutable order, even if a new
  -- request changed its body. The server must not charge a mutated cart.
  RETURN v_order;
END;
$$;

-- Transactionally mark a *server-verified signed* Clover event, update the
-- matching restaurant order and queue one durable fulfilment TITLE intent.
-- Printing is NOT queued here: a worker may only schedule CLOVER_PRINT after
-- Clover confirms the title was successfully written.
CREATE OR REPLACE FUNCTION ppp.record_verified_clover_payment(
  p_checkout_session text,
  p_payment_id text,
  p_delivery_key text,
  p_payload_digest text,
  p_result text
) RETURNS TABLE(order_id text, newly_processed boolean)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, ppp
AS $$
DECLARE
  v_tenant text := nullif(current_setting('ppp.tenant_id', true), '');
  v_order ppp.orders%ROWTYPE;
  v_receipt_id bigint;
  v_previous_digest text;
  v_next_status text;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Verified tenant context required' USING ERRCODE = '42501';
  END IF;
  IF p_checkout_session IS NULL OR p_checkout_session = '' OR
     p_payment_id IS NULL OR p_payment_id = '' OR
     p_delivery_key IS NULL OR p_delivery_key = '' OR
     coalesce(p_payload_digest, '') !~ '^[a-f0-9]{64}$' OR
     coalesce(p_result, '') NOT IN ('APPROVED', 'DECLINED') THEN
    RAISE EXCEPTION 'Invalid verified payment input' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM ppp.orders
    WHERE tenant_id = v_tenant
      AND provider = 'clover'
      AND provider_order_id = p_checkout_session
    FOR UPDATE;
  IF NOT FOUND THEN
    -- No ack: a queued checkout must be durably stored before webhook ack.
    RAISE EXCEPTION 'Checkout session not present in durable order store';
  END IF;
  IF v_order.provider_payment_id IS NOT NULL AND v_order.provider_payment_id <> p_payment_id THEN
    RAISE EXCEPTION 'Payment ID conflicts with existing order';
  END IF;

  INSERT INTO ppp.inbound_webhooks (
    tenant_id, provider, delivery_key, payload_digest, event_type,
    provider_payment_id, order_id
  ) VALUES (
    v_tenant, 'clover', p_delivery_key, p_payload_digest, p_result,
    p_payment_id, v_order.id
  )
  ON CONFLICT (tenant_id, provider, delivery_key) DO NOTHING
  RETURNING id INTO v_receipt_id;

  IF v_receipt_id IS NULL THEN
    SELECT payload_digest INTO v_previous_digest
      FROM ppp.inbound_webhooks
      WHERE tenant_id = v_tenant AND provider = 'clover' AND delivery_key = p_delivery_key;
    IF v_previous_digest IS DISTINCT FROM p_payload_digest THEN
      RAISE EXCEPTION 'Webhook delivery key reused with a different payload';
    END IF;
    RETURN QUERY SELECT v_order.id, false;
    RETURN;
  END IF;

  IF p_result = 'APPROVED' THEN
    IF v_order.order_status IN ('CANCELLED', 'FAILED') THEN
      RAISE EXCEPTION 'Paid terminal order requires manual reconciliation';
    END IF;
    v_next_status := CASE
      WHEN v_order.order_status IN ('CREATED', 'SUBMITTED') THEN 'ACCEPTED'
      ELSE v_order.order_status
    END;
    UPDATE ppp.orders
      SET payment_status = 'PAID',
          provider_payment_id = p_payment_id,
          order_status = v_next_status,
          order_document = jsonb_set(
            jsonb_set(
              jsonb_set(order_document, '{paymentStatus}', '"PAID"'::jsonb, true),
              '{providerPaymentId}', to_jsonb(p_payment_id), true
            ),
            '{status}', to_jsonb(v_next_status), true
          ),
          updated_at = now()
      WHERE id = v_order.id AND tenant_id = v_tenant;

    INSERT INTO ppp.fulfillment_outbox (
      tenant_id, order_id, effect, dedup_key, payload
    ) VALUES (
      v_tenant, v_order.id, 'CLOVER_TITLE', p_checkout_session,
      jsonb_build_object('paymentId', p_payment_id)
    ) ON CONFLICT (tenant_id, effect, dedup_key) DO NOTHING;
  END IF;

  UPDATE ppp.inbound_webhooks
    SET processing_state = 'PROCESSED', attempts = attempts + 1, processed_at = now()
    WHERE id = v_receipt_id AND tenant_id = v_tenant;

  RETURN QUERY SELECT v_order.id, true;
END;
$$;

-- Do not allow unscoped roles to call the routines merely because PostgreSQL
-- defaults to PUBLIC EXECUTE for functions. Grant to a dedicated PPP app role
-- after deployment; CI explicitly grants its disposable test role access.
REVOKE ALL ON FUNCTION ppp.create_order_once(text,text,text,text,jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION ppp.record_verified_clover_payment(text,text,text,text,text) FROM PUBLIC;

COMMIT;
