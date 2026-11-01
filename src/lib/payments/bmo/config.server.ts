/**
 * BMO Instant Payments (Interac "Request money") settings. SERVER ONLY. All empty = off: Interac stays manual
 * (staff send the request from the BMO app and tap Paid on /admin/interac).
 *
 *   BMO_CLIENT_ID, BMO_CLIENT_SECRET     the app registered on developer.bmo.com (OAuth 2.0, x-client-id)
 *   BMO_API_KEY                          x-api-key (defaults to BMO_CLIENT_ID)
 *   BMO_CREDITOR_ACCOUNT                 the restaurant's BMO account that receives the money (as BMO gives it)
 *   BMO_CREDITOR_NAME                    name shown on the request (default "PPP Pizzeria")
 *   BMO_ENV                              "sandbox" (default) or "production"
 *   BMO_API_BASE_URL, BMO_OAUTH_BASE_URL sandbox defaults built in; REQUIRED in production (BMO gives them)
 *   BMO_ENCRYPTION_PUBLIC_KEY, BMO_ENCRYPTION_KEY_ID   BMO's public key (PEM) and its id: requests are encrypted
 *   BMO_PRIVATE_KEY                      our private key (PEM; its public half is given to BMO): BMO's answers
 *   BMO_PAYLOAD_ENCRYPTION               "off" only if BMO says the sandbox takes plain JSON (default on)
 *   BMO_OAEP_HASH                        "sha1" (default) or "sha256"
 *   BMO_PUSH_SECRET                      the value BMO must send in x-api-key or Authorization on push notifications
 *   BMO_CREDITOR_AGENT_ID                default "001" (BMO)
 *   BMO_REQUEST_EXPIRY_MINUTES           default 60
 */
export type BmoEnv = "sandbox" | "production";

const env = (name: string) => process.env[name]?.trim() || "";
const pem = (name: string) => env(name).replace(/\\n/g, "\n") || null;

export function bmoEnv(): BmoEnv {
  return env("BMO_ENV").toLowerCase() === "production" ? "production" : "sandbox";
}

/** Sandbox URLs are BMO's published ones; production URLs come from BMO at go-live (no guess). */
export function bmoApiBaseUrl(): string {
  const fallback =
    bmoEnv() === "sandbox" ? "https://sandbox-open-api.bmo.com/open-banking/commercial-sb" : "";
  return (env("BMO_API_BASE_URL") || fallback).replace(/\/+$/, "");
}

export function bmoOAuthBaseUrl(): string {
  const fallback =
    bmoEnv() === "sandbox" ? "https://open-api.bmofg.com/open-banking/commercial-sb/oauth20" : "";
  return (env("BMO_OAUTH_BASE_URL") || fallback).replace(/\/+$/, "");
}

export interface BmoSettings {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  creditorAccount: string;
  creditorName: string;
  creditorAgentId: string;
  encrypt: boolean;
  bmoPublicKey: string | null;
  bmoKeyId: string | null;
  privateKey: string | null;
  oaepHash: "sha1" | "sha256";
  pushSecret: string | null;
  expiryMinutes: number;
}

export function bmoSettings(): BmoSettings {
  const minutes = Number(env("BMO_REQUEST_EXPIRY_MINUTES"));
  return {
    clientId: env("BMO_CLIENT_ID"),
    clientSecret: env("BMO_CLIENT_SECRET"),
    apiKey: env("BMO_API_KEY") || env("BMO_CLIENT_ID"),
    creditorAccount: env("BMO_CREDITOR_ACCOUNT"),
    creditorName: env("BMO_CREDITOR_NAME") || "PPP Pizzeria",
    creditorAgentId: env("BMO_CREDITOR_AGENT_ID") || "001",
    encrypt: !/^(off|false|no|0)$/i.test(env("BMO_PAYLOAD_ENCRYPTION")),
    bmoPublicKey: pem("BMO_ENCRYPTION_PUBLIC_KEY"),
    bmoKeyId: env("BMO_ENCRYPTION_KEY_ID") || null,
    privateKey: pem("BMO_PRIVATE_KEY"),
    oaepHash: env("BMO_OAEP_HASH").toLowerCase() === "sha256" ? "sha256" : "sha1",
    pushSecret: env("BMO_PUSH_SECRET") || null,
    expiryMinutes:
      Number.isFinite(minutes) && minutes >= 10 && minutes <= 7 * 24 * 60 ? minutes : 60,
  };
}

/** What is still missing before requests can go out automatically (empty = ready). */
export function bmoMissing(s = bmoSettings()): string[] {
  const missing: string[] = [];
  if (!s.clientId) missing.push("BMO_CLIENT_ID");
  if (!s.clientSecret) missing.push("BMO_CLIENT_SECRET");
  if (!s.creditorAccount) missing.push("BMO_CREDITOR_ACCOUNT");
  if (!bmoApiBaseUrl()) missing.push("BMO_API_BASE_URL");
  if (!bmoOAuthBaseUrl()) missing.push("BMO_OAUTH_BASE_URL");
  if (s.encrypt) {
    if (!s.bmoPublicKey) missing.push("BMO_ENCRYPTION_PUBLIC_KEY");
    if (!s.bmoKeyId) missing.push("BMO_ENCRYPTION_KEY_ID");
    if (!s.privateKey) missing.push("BMO_PRIVATE_KEY");
  }
  return missing;
}

export function bmoConfigured(): boolean {
  return bmoMissing().length === 0;
}
