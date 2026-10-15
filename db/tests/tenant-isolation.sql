-- Run AFTER db/migrations/0001_ppp_orders.sql on a throwaway PostgreSQL database
-- as the actual non-superuser, non-BYPASSRLS application role.
-- Do not run this probe against real orders. All changes roll back.
\set ON_ERROR_STOP on
BEGIN;

SET LOCAL ppp.tenant_id = 'ppp_ci_tenant_a';
INSERT INTO ppp.orders
  (id, tenant_id, location_id, provider, idempotency_key,
   order_status, payment_status, order_document)
VALUES
  ('ord_ci_tenant_a_0001', 'ppp_ci_tenant_a', 'loc-ndg-somerled',
   'clover', 'ci_test_idempotency_a', 'CREATED', 'UNPAID', '{}'::jsonb);

SET LOCAL ppp.tenant_id = 'ppp_ci_tenant_b';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ppp.orders WHERE id = 'ord_ci_tenant_a_0001'
  ) THEN
    RAISE EXCEPTION 'TENANT LEAK: tenant B could read tenant A order';
  END IF;
END
$$;

INSERT INTO ppp.orders
  (id, tenant_id, location_id, provider, idempotency_key,
   order_status, payment_status, order_document)
VALUES
  ('ord_ci_tenant_b_0001', 'ppp_ci_tenant_b', 'loc-ndg-somerled',
   'clover', 'ci_test_idempotency_b', 'CREATED', 'UNPAID', '{}'::jsonb);

DO $$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO ppp.fulfillment_outbox (tenant_id, order_id, effect, dedup_key)
    VALUES ('ppp_ci_tenant_b', 'ord_ci_tenant_a_0001', 'CLOVER_TITLE', 'ci_cross_tenant');
  EXCEPTION WHEN foreign_key_violation THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'TENANT LEAK: cross-tenant outbox reference was accepted';
  END IF;
END
$$;

DO $$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO ppp.orders
      (id, tenant_id, location_id, provider, idempotency_key,
       order_status, payment_status, order_document)
    VALUES
      ('ord_ci_wrong_tenant_0001', 'ppp_ci_tenant_a', 'loc-ndg-somerled',
       'clover', 'ci_wrong_tenant', 'CREATED', 'UNPAID', '{}'::jsonb);
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'TENANT LEAK: session B could write tenant A order';
  END IF;
END
$$;

ROLLBACK;
