-- PPPMTL provider connection tokens (BMO Instant Payments OAuth), encrypted by the app.
-- Requires 0001. One row per tenant and provider; the token document is AES-256-GCM
-- ciphertext made by the application (key derived from PPP_ORDER_ACCESS_SECRET), never
-- a plain token. After applying, grant the runtime role:
--   GRANT SELECT, INSERT, UPDATE ON ppp.integration_tokens TO ppp_app;
BEGIN;

CREATE TABLE IF NOT EXISTS ppp.integration_tokens (
  tenant_id text NOT NULL CHECK (char_length(tenant_id) BETWEEN 1 AND 128),
  provider text NOT NULL CHECK (provider ~ '^[a-z][a-z0-9_]{1,31}$'),
  sealed_document text NOT NULL CHECK (char_length(sealed_document) BETWEEN 16 AND 16384),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider)
);

ALTER TABLE ppp.integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppp.integration_tokens FORCE ROW LEVEL SECURITY;

CREATE POLICY ppp_integration_tokens_tenant_policy ON ppp.integration_tokens
  USING (tenant_id = nullif(current_setting('ppp.tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('ppp.tenant_id', true), ''));

COMMIT;
