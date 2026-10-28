-- Run in CI only, after 0001 and 0002, as the limited application DB role.
-- All fixtures are ephemeral and rolled back. No actual payment or external call.
\set ON_ERROR_STOP on
BEGIN;

SET LOCAL ppp.tenant_id = 'ppp_ci_atomic_a';
DO $$
DECLARE
  first_id text;
  second_id text;
BEGIN
  SELECT id INTO first_id FROM ppp.create_order_once(
    'ord_ci_atomic_one', 'loc-ndg-somerled', 'clover',
    'key_ci_atomic_1', '{"customer":{"isGuest":true}}'::jsonb, NULL
  );
  SELECT id INTO second_id FROM ppp.create_order_once(
    'ord_ci_atomic_duplicate', 'loc-ndg-somerled', 'clover',
    'key_ci_atomic_1', '{"customer":{"isGuest":true}}'::jsonb, NULL
  );
  IF first_id <> 'ord_ci_atomic_one' OR second_id <> first_id THEN
    RAISE EXCEPTION 'Atomic tenant idempotency failed';
  END IF;
  IF (SELECT count(*) FROM ppp.orders WHERE id = first_id) <> 1 THEN
    RAISE EXCEPTION 'Duplicate order was inserted';
  END IF;
END
$$;


-- Replaying a key must not silently reassign another cart or restaurant
-- to an earlier checkout, even if the provider session has already started.
DO $$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    PERFORM * FROM ppp.create_order_once(
      'ord_ci_mutated_cart_0001', 'loc-ndg-somerled', 'clover',
      'key_ci_atomic_1',
      '{"customer":{"isGuest":true},"items":[{"productId":"unexpected-pizza"}]}'::jsonb,
      NULL
    );
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'An idempotency key accepted a different shopping cart';
  END IF;

  blocked := false;
  BEGIN
    PERFORM * FROM ppp.create_order_once(
      'ord_ci_other_location_0001', 'loc-other-restaurant', 'clover',
      'key_ci_atomic_1', '{"customer":{"isGuest":true}}'::jsonb, NULL
    );
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'An idempotency key crossed restaurant location';
  END IF;
END
$$;

UPDATE ppp.orders SET provider_order_id = 'SESSION_ATOMIC_1'
  WHERE tenant_id = 'ppp_ci_atomic_a' AND id = 'ord_ci_atomic_one';

DO $$
DECLARE
  first_result record;
  second_result record;
  failed boolean := false;
BEGIN
  SELECT * INTO first_result FROM ppp.record_verified_clover_payment(
    'SESSION_ATOMIC_1', 'PAYMENT_ATOMIC_1', 'DELIVERY_ATOMIC_1',
    repeat('a', 64), 'APPROVED'
  );
  SELECT * INTO second_result FROM ppp.record_verified_clover_payment(
    'SESSION_ATOMIC_1', 'PAYMENT_ATOMIC_1', 'DELIVERY_ATOMIC_1',
    repeat('a', 64), 'APPROVED'
  );
  IF first_result.order_id <> 'ord_ci_atomic_one' OR
     NOT first_result.newly_processed OR second_result.newly_processed THEN
    RAISE EXCEPTION 'Payment event should be applied exactly once';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ppp.orders
     WHERE id = 'ord_ci_atomic_one' AND payment_status = 'PAID'
       AND provider_payment_id = 'PAYMENT_ATOMIC_1'
       AND order_status = 'ACCEPTED'
       AND order_document->>'paymentStatus' = 'PAID'
  ) THEN
    RAISE EXCEPTION 'Paid order is not persisted consistently';
  END IF;

  IF (SELECT count(*) FROM ppp.fulfillment_outbox
       WHERE order_id = 'ord_ci_atomic_one'
       AND effect = 'CLOVER_TITLE') <> 1 THEN
    RAISE EXCEPTION 'Outbox title must be unique';
  END IF;
  IF EXISTS (
    SELECT 1 FROM ppp.fulfillment_outbox
     WHERE order_id = 'ord_ci_atomic_one' AND effect = 'CLOVER_PRINT'
  ) THEN
    RAISE EXCEPTION 'Print cannot be queued before confirmed title';
  END IF;

  BEGIN
    PERFORM * FROM ppp.record_verified_clover_payment(
      'SESSION_ATOMIC_1', 'PAYMENT_ATOMIC_1', 'DELIVERY_ATOMIC_1',
      repeat('b', 64), 'APPROVED'
    );
  EXCEPTION WHEN raise_exception THEN failed := true;
  END;
  IF NOT failed THEN
    RAISE EXCEPTION 'Payload mismatch should be rejected';
  END IF;
END
$$;

SET LOCAL ppp.tenant_id = 'ppp_ci_atomic_b';
DO $$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    PERFORM * FROM ppp.record_verified_clover_payment(
      'SESSION_ATOMIC_1', 'PAYMENT_ATOMIC_1', 'DELIVERY_ATOMIC_B',
      repeat('c', 64), 'APPROVED'
    );
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'Cross-tenant Clover session should be invisible';
  END IF;
END
$$;

ROLLBACK;
