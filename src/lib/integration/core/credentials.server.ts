/**
 * Credential presence checks. SERVER ONLY.
 *
 * Values are read inside functions (never at module scope) and are never
 * returned to the client — only booleans describing whether a provider could
 * be configured at all.
 */

export const INTEGRATION_ENV_KEYS = [
  "URBANPIPER_API_URL",
  "URBANPIPER_API_KEY",
  "URBANPIPER_CLIENT_ID",
  "URBANPIPER_CLIENT_SECRET",
  "URBANPIPER_BASE_URL",
  "URBANPIPER_LOCATION_ID",
  "URBANPIPER_WEBHOOK_SECRET",
  "CLOVER_API_KEY",
  "CLOVER_MERCHANT_ID",
  "CLOVER_WEBHOOK_SECRET",
  /** Clover: "sandbox" or "production" (default). */
  "CLOVER_ENV",
  /** Clover REST API token (inventory read, orders read/write, payments read). Alias: CLOVER_API_KEY. */
  "CLOVER_API_TOKEN",
  /** Clover Ecommerce private key of a "Hosted Checkout" API token. */
  "CLOVER_ECOMM_PRIVATE_KEY",
  /** Optional JSON tax rates, e.g. [{"name":"TPS","rate":500000},{"name":"TVQ","rate":997500}]. */
  "CLOVER_TAX_RATES",
  /** "off" = do not print paid website orders on the Clover order printer. */
  "CLOVER_PRINT_WEB_ORDERS",
  /** Public address of this site for Clover's return links (default https://pppmtl.com). */
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
  return keys.every((k) => read(k) !== undefined);
}

/** True when at least one of the given keys is set (aliased credentials). */
export function hasAnyCredential(...keys: IntegrationEnvKey[]): boolean {
  return keys.some((k) => read(k) !== undefined);
}

/** UrbanPiper accepts either the new API url or the legacy base url. */
export function urbanPiperApiUrl(): string | undefined {
  return read("URBANPIPER_API_URL") ?? read("URBANPIPER_BASE_URL");
}

export function requireCredential(key: IntegrationEnvKey): string {
  const value = read(key);
  if (!value) throw new Error(`Missing integration credential: ${key}`);
  return value;
}

export function optionalCredential(key: IntegrationEnvKey): string | undefined {
  return read(key);
}

/** Non-secret snapshot for the internal integrations screen. */
export function credentialPresence(): Record<IntegrationEnvKey, boolean> {
  return Object.fromEntries(INTEGRATION_ENV_KEYS.map((k) => [k, read(k) !== undefined])) as Record<
    IntegrationEnvKey,
    boolean
  >;
}
