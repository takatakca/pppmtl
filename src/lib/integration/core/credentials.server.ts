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
  /** Twilio sender (E.164) for the optional text to the restaurant's own driver. */
  "TWILIO_FROM_NUMBER",
  /** DoorDash Drive access key (developer.doordash.com → Developer Portal → Credentials). */
  "DOORDASH_DEVELOPER_ID",
  "DOORDASH_KEY_ID",
  "DOORDASH_SIGNING_SECRET",
  /** "sandbox" while the access key is a sandbox key (labels quotes as test); empty for production. */
  "DOORDASH_ENV",
  /** The exact Authorization header value set on the DoorDash webhook (Developer Portal → Webhooks). */
  "DOORDASH_WEBHOOK_SECRET",
  /** Uber Direct (direct.uber.com → Developer): client credentials, customer id, webhook signing key. */
  "UBER_DIRECT_CLIENT_ID",
  "UBER_DIRECT_CLIENT_SECRET",
  "UBER_DIRECT_CUSTOMER_ID",
  "UBER_DIRECT_WEBHOOK_SECRET",
  /** "test" while using Uber Direct test credentials (labels quotes as test); empty for live. */
  "UBER_DIRECT_ENV",
  /** Optional saved list of the restaurant's own drivers: "Name:+15145550100;Name 2:+15145550101". */
  "PPP_OWN_DRIVERS",
  /** Optional override of the SkipTheDishes restaurant portal link shown on the dispatch screen. */
  "SKIP_PORTAL_URL",
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
