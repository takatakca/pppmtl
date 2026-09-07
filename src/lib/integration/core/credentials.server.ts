/**
 * Credential presence checks. SERVER ONLY.
 *
 * Values are read inside functions (never at module scope) and are never
 * returned to the client — only booleans describing whether a provider could
 * be configured at all.
 */

export const INTEGRATION_ENV_KEYS = [
  "URBANPIPER_API_KEY",
  "URBANPIPER_BASE_URL",
  "URBANPIPER_LOCATION_ID",
  "URBANPIPER_WEBHOOK_SECRET",
  "CLOVER_API_KEY",
  "CLOVER_MERCHANT_ID",
  "CLOVER_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
] as const;

export type IntegrationEnvKey = (typeof INTEGRATION_ENV_KEYS)[number];

function read(key: IntegrationEnvKey): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export function hasCredentials(...keys: IntegrationEnvKey[]): boolean {
  return keys.every((k) => read(k) !== undefined);
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
