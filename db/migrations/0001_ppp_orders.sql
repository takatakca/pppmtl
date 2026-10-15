-- PPPMTL durable transactional order foundation (NOT YET APPLIED).
-- Apply only to an authorized PostgreSQL instance through a reviewed migration pipeline.
-- TAKATAK owns the master customer identity; this schema records tenant-scoped orders only.
BEGIN;

CREATE SCHEMA IF NOT EXISTS ppp;

CREATE TABLE IF NOT EXISTS ppp.orders (
  id text PRIMARY KEY CHECK (id ~ '^ord_[A-Za-z0-9_-]{5,80}$'),
  tenant_id text NOT NULL CHECK (char_length(tenant_id) BETWEEN 1 AND 128),
  customer_ref text,
  location_id text NOT NULL,
  provider text NOT NULL,
  provider_order_id text,
  provider_payment_id text,
  idempotency_key text NOT NULL,
  order_status text NOT NULL CHECK (order_status IN (
    'CREATED', 'SUBMITTED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'FAILED'
  )),
  payment_status text NOT NULL CHECK (payment_status IN (
    'UNPAID', 'AUTHORIZED', 'PAID', 'REFUNDED', 'FAILED', 'PAY_AT_RESTAURANT'
  )),
  order_document jsonb NOT NULL CHECK (jsonb_typeof(order_document) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ppp_orders_tenant_idempotency UNIQUE (tenant_id, idempotency_key)
);
-- Composite unique key permits tenant-safe foreign keys for event and outbox records.
CREATE UNIQUE INDEX IF NOT EXISTS ppp_orders_tenant_id_idx
  ON ppp.orders (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS ppp_orders_provider_session_idx
  ON ppp.orders (tenant_id, provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ppp_orders_provider_payment_idx
  ON ppp.orders (tenant_id, provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ppp_orders_tenant_created_idx
  ON ppp.orders (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ppp_orders_customer_ref_idx
  ON ppp.orders (tenant_id, customer_ref, created_at DESC)
  WHERE customer_ref IS NOT NULL;

-- Signed webhook receipts are deduplicated transactionally, not with a process-local Map.
-- Store only non-sensitive references/hashes, not full payment credentials or card data.
CREATE TABLE IF NOT EXISTS ppp.inbound_webhooks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  provider text NOT NULL,
  delivery_key text NOT NULL,
  payload_digest text NOT NULL CHECK (payload_digest ~ '^[a-f0-9]{64}$'),
  event_type text NOT NULL,
  provider_payment_id text,
  order_id text,
  CONSTRAINT ppp_inbound_webhook_order_same_tenant
    FOREIGN KEY (tenant_id, order_id) REFERENCES ppp.orders(tenant_id, id),
  processing_state text NOT NULL DEFAULT 'PENDING'
    CHECK (processing_state IN ('PENDING', 'PROCESSED', 'RETRY', 'FAILED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  last_error text,
  CONSTRAINT ppp_webhook_delivery_unique UNIQUE (tenant_id, provider, delivery_key)
);
CREATE INDEX IF NOT EXISTS ppp_webhook_retry_idx
  ON ppp.inbound_webhooks (next_attempt_at, received_at)
  WHERE processing_state IN ('PENDING', 'RETRY');

-- Exactly one durable fulfillment intent per paid order+effect. Workers claim with
-- SELECT ... FOR UPDATE SKIP LOCKED, retry transient failure with exponential backoff.
CREATE TABLE IF NOT EXISTS ppp.fulfillment_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  order_id text NOT NULL,
  CONSTRAINT ppp_fulfillment_order_same_tenant
    FOREIGN KEY (tenant_id, order_id) REFERENCES ppp.orders(tenant_id, id),
  effect text NOT NULL CHECK (effect IN ('CLOVER_TITLE', 'CLOVER_PRINT', 'CUSTOMER_NOTIFICATION')),
  dedup_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'PENDING'
    CHECK (state IN ('PENDING', 'RUNNING', 'DONE', 'RETRY', 'FAILED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_error text,
  CONSTRAINT ppp_fulfillment_once UNIQUE (tenant_id, effect, dedup_key)
);
CREATE INDEX IF NOT EXISTS ppp_fulfillment_due_idx
  ON ppp.fulfillment_outbox (next_attempt_at, created_at)
  WHERE state IN ('PENDING', 'RETRY');

-- Tenant scope is enforced at the database boundary in addition to PPP server auth.
-- The application must establish SET LOCAL ppp.tenant_id from VERIFIED TAKATAK
-- entitlements inside every DB transaction. Never accept tenant_id from browser payload.
ALTER TABLE ppp.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppp.inbound_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppp.fulfillment_outbox ENABLE ROW LEVEL SECURITY;

-- Table owners normally bypass RLS. FORCE also restricts table owners;
-- application database roles must NOT have SUPERUSER or BYPASSRLS grants.
ALTER TABLE ppp.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE ppp.inbound_webhooks FORCE ROW LEVEL SECURITY;
ALTER TABLE ppp.fulfillment_outbox FORCE ROW LEVEL SECURITY;

CREATE POLICY ppp_orders_tenant_policy ON ppp.orders
  USING (tenant_id = nullif(current_setting('ppp.tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('ppp.tenant_id', true), ''));
CREATE POLICY ppp_inbound_webhooks_tenant_policy ON ppp.inbound_webhooks
  USING (tenant_id = nullif(current_setting('ppp.tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('ppp.tenant_id', true), ''));
CREATE POLICY ppp_fulfillment_tenant_policy ON ppp.fulfillment_outbox
  USING (tenant_id = nullif(current_setting('ppp.tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('ppp.tenant_id', true), ''));

COMMIT;
