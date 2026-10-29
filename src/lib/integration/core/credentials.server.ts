/**
 * Credential presence checks. SERVER ONLY.
 *
 * Values are read inside functions (never at module scope) and are never
 * returned to the client — only booleans describing whether a provider could
 * be configured at all.
 */

/** Retired vendor variable names are retained in the type only until old
 * standalone test fixtures are removed. No active code reads their values. */
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
] as const;

export type IntegrationEnvKey = (typeof INTEGRATION_ENV_KEYS)[number];

function read(key: IntegrationEnvKey): string | undefined {
  // Explicit owner cancellation: even accidentally retained Coolify secrets
  // must NEVER enable the retired provider or appear in the admin snapshot.
  if (key.startsWith("URBANPIPER_")) return undefined;
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

/** Deprecated old adapter compatibility: always disabled, regardless of environment. */
export function urbanPiperApiUrl(): undefined {
  return undefined;
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
export function credentialPresence(): Record<string, boolean> {
  return Object.fromEntries(
    INTEGRATION_ENV_KEYS.filter((key) => !key.startsWith("URBANPIPER_")).map((key) => [
      key,
      read(key) !== undefined,
    ]),
  );
}
