/**
 * Active integration credential presence only. SERVER ONLY.
 * The retired provider has NO keys, credentials, URLs or dispatch paths here.
 * Values are never returned to browser clients.
 */
export const INTEGRATION_ENV_KEYS = [
  "CLOVER_API_KEY",
  "CLOVER_MERCHANT_ID",
  "CLOVER_WEBHOOK_SECRET",
  "CLOVER_ENV",
  "CLOVER_API_TOKEN",
  "CLOVER_ECOMM_PRIVATE_KEY",
  "CLOVER_TAX_RATES",
  "CLOVER_PRINT_WEB_ORDERS",
  "PUBLIC_SITE_URL",
  "STRIPE_SECRET_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  // TAKATAK Food Hub (first-party): customer identity + Interac e-Transfer website orders.
  // The secret is sent as a Bearer header from this server only; the browser never sees it.
  "FOODHUB_URL",
  "FOODHUB_WEBSITE_ORDER_SECRET",
  "FOODHUB_TENANT",
  "FOODHUB_BRAND",
  "FOODHUB_LOCATION_CODES",
  "FOODHUB_INTERAC_ENABLED",
  "FOODHUB_INTERAC_FEE",
  "FOODHUB_INTERAC_FEE_TAXABLE",
  "FOODHUB_DELIVERY_FEE",
] as const;

export type IntegrationEnvKey = (typeof INTEGRATION_ENV_KEYS)[number];

function read(key: IntegrationEnvKey): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export function hasCredentials(...keys: IntegrationEnvKey[]): boolean {
  return keys.every((key) => read(key) !== undefined);
}

export function hasAnyCredential(...keys: IntegrationEnvKey[]): boolean {
  return keys.some((key) => read(key) !== undefined);
}

export function requireCredential(key: IntegrationEnvKey): string {
  const value = read(key);
  if (!value) throw new Error(`Missing integration credential: ${key}`);
  return value;
}

export function optionalCredential(key: IntegrationEnvKey): string | undefined {
  return read(key);
}

/** Only names and presence bits, never secrets. */
export function credentialPresence(): Record<IntegrationEnvKey, boolean> {
  return Object.fromEntries(
    INTEGRATION_ENV_KEYS.map((key) => [key, read(key) !== undefined]),
  ) as Record<IntegrationEnvKey, boolean>;
}
