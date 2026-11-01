/**
 * BMO OAuth 2.0 (authorization code, as BMO's spec defines it). SERVER ONLY.
 *
 *   1. An admin on the tablet taps "Connect BMO" → GET /admin/bmo/connect → BMO's login page, where the restaurant's
 *      BMO business user authorizes PPP once.
 *   2. BMO → GET /auth/bmo/callback?code&state → tokens stored sealed (AES-256-GCM) in ppp.integration_tokens
 *      (migration 0004), or in memory when that table is missing (then a restart asks to connect again).
 *   3. Access tokens last 15 min and are refreshed with the refresh token (1 month, renewed on every refresh).
 * Register this redirect URI with BMO:  <PUBLIC_SITE_URL>/auth/bmo/callback
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { adminRequestAuthorized } from "@/lib/security/admin.server";
import { cookieFrom, setCookieHeader, signValue, verifyValue } from "@/lib/security/signed-cookie";
import {
  durableOrderStoreConfigured,
  pppDatabasePool,
  pppTenantId,
} from "@/lib/orders/database.server";
import { withPppTenantTransaction } from "@/lib/orders/postgres-transactions.server";
import { bmoOAuthBaseUrl, bmoSettings } from "./config.server";

const SCOPES = [
  "bmo.tppinterac.payment-initiation.create",
  "bmo.tppinterac.payment-initiation.read",
];
const FLOW_COOKIE = "ppp_bmo_oauth";
const FLOW_SECONDS = 10 * 60;
const TIMEOUT_MS = 12_000;

export interface BmoTokens {
  accessToken: string;
  /** ms epoch */
  accessExpiresAt: number;
  refreshToken: string | null;
  refreshExpiresAt: number | null;
  connectedAt: string;
}

const env = (k: string) => process.env[k]?.trim() || "";
const siteUrl = () => (env("PUBLIC_SITE_URL") || "https://pppmtl.com").replace(/\/+$/, "");
export const bmoRedirectUri = () => `${siteUrl()}/auth/bmo/callback`;

function derivedKey(purpose: string): Buffer | null {
  const base = env("PPP_ORDER_ACCESS_SECRET");
  return base.length >= 32 ? createHmac("sha256", base).update(purpose).digest() : null;
}

/** Tokens at rest: base64url(iv ‖ ciphertext ‖ tag). */
export function sealTokens(tokens: BmoTokens, key = derivedKey("ppp-bmo-token-store-v1")): string {
  if (!key) throw new Error("PPP_ORDER_ACCESS_SECRET is required to store BMO tokens");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(JSON.stringify(tokens), "utf8"), c.final(), c.getAuthTag()]);
  return Buffer.concat([iv, body]).toString("base64url");
}

export function openTokens(
  sealed: string,
  key = derivedKey("ppp-bmo-token-store-v1"),
): BmoTokens | null {
  if (!key) return null;
  try {
    const raw = Buffer.from(sealed, "base64url");
    const d = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(raw.length - 16));
    const text = Buffer.concat([d.update(raw.subarray(12, raw.length - 16)), d.final()]).toString(
      "utf8",
    );
    const t = JSON.parse(text) as BmoTokens;
    return typeof t.accessToken === "string" ? t : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Token store

let memory: BmoTokens | null = null;
let tableMissingLogged = false;

async function loadTokens(): Promise<BmoTokens | null> {
  if (!durableOrderStoreConfigured()) return memory;
  try {
    const row = await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (client) =>
      client.query<{ sealed_document: string }>(
        `SELECT sealed_document FROM ppp.integration_tokens
          WHERE tenant_id = current_setting('ppp.tenant_id', true) AND provider = 'bmo'`,
      ),
    );
    const sealed = row.rows[0]?.sealed_document;
    return sealed ? openTokens(sealed) : memory;
  } catch (error) {
    if (!tableMissingLogged) {
      tableMissingLogged = true;
      console.error(
        "[bmo] token table unavailable (apply db/migrations/0004):",
        (error as Error).message,
      );
    }
    return memory;
  }
}

async function saveTokens(tokens: BmoTokens | null): Promise<void> {
  memory = tokens;
  if (!durableOrderStoreConfigured() || !tokens) return;
  try {
    await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (client) =>
      client.query(
        `INSERT INTO ppp.integration_tokens (tenant_id, provider, sealed_document)
         VALUES (current_setting('ppp.tenant_id', true), 'bmo', $1)
         ON CONFLICT (tenant_id, provider)
         DO UPDATE SET sealed_document = EXCLUDED.sealed_document, updated_at = now()`,
        [sealTokens(tokens)],
      ),
    );
  } catch (error) {
    console.error(
      "[bmo] token not stored durably (apply db/migrations/0004):",
      (error as Error).message,
    );
  }
}

export function resetBmoTokensForTests(): void {
  memory = null;
  refreshing = null;
}

// ---------------------------------------------------------------------------------------------------------------
// Token endpoint

async function tokenRequest(form: Record<string, string>): Promise<BmoTokens | null> {
  const s = bmoSettings();
  const res = await fetch(`${bmoOAuthBaseUrl()}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${s.clientId}:${s.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ ...form, client_id: s.clientId }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => null);
  if (!res) return null;
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const access = typeof json?.["access_token"] === "string" ? json["access_token"] : null;
  if (!res.ok || !access) {
    console.error("[bmo] token endpoint refused:", res.status, String(json?.["error"] ?? ""));
    return null;
  }
  const now = Date.now();
  const expiresIn = Number(json?.["expires_in"]);
  const refreshIn = Number(json?.["refresh_token_expires_in"]);
  const refresh = typeof json?.["refresh_token"] === "string" ? json["refresh_token"] : null;
  return {
    accessToken: access,
    accessExpiresAt: now + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 900) * 1000,
    refreshToken: refresh ?? form["refresh_token"] ?? null,
    refreshExpiresAt:
      now + (Number.isFinite(refreshIn) && refreshIn > 0 ? refreshIn : 30 * 86_400) * 1000,
    connectedAt: new Date(now).toISOString(),
  };
}

let refreshing: Promise<BmoTokens | null> | null = null;

/** A valid access token, refreshed when it expires within a minute; null = "Connect BMO" is needed. */
export async function bmoAccessToken(now = Date.now()): Promise<string | null> {
  const current = await loadTokens();
  if (current && current.accessExpiresAt - 60_000 > now) return current.accessToken;
  if (!current?.refreshToken || (current.refreshExpiresAt && current.refreshExpiresAt <= now))
    return null;
  refreshing ??= tokenRequest({ grant_type: "refresh_token", refresh_token: current.refreshToken })
    .then(async (next) => {
      if (next) await saveTokens({ ...next, connectedAt: current.connectedAt });
      return next;
    })
    .finally(() => {
      refreshing = null;
    });
  return (await refreshing)?.accessToken ?? null;
}

export async function bmoConnection(): Promise<{
  connected: boolean;
  refreshExpiresAt: string | null;
}> {
  const t = await loadTokens();
  const live = Boolean(
    t &&
    (t.accessExpiresAt > Date.now() ||
      (t.refreshToken && (!t.refreshExpiresAt || t.refreshExpiresAt > Date.now()))),
  );
  return {
    connected: live,
    refreshExpiresAt: t?.refreshExpiresAt ? new Date(t.refreshExpiresAt).toISOString() : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Routes

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}

const flowKey = () => derivedKey("ppp-bmo-oauth-flow-v1")?.toString("hex") ?? null;

/** GET /admin/bmo/connect (admin session required) → BMO's authorization page. */
export function startBmoConnect(request: Request): Response {
  if (!adminRequestAuthorized(request)) return redirect("/admin/sign-in?next=/admin/interac");
  const s = bmoSettings();
  const key = flowKey();
  if (!s.clientId || !s.clientSecret || !key || !bmoOAuthBaseUrl())
    return redirect("/admin/interac?bmo=not_configured");
  const state = randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: s.clientId,
    redirect_uri: bmoRedirectUri(),
    scope: SCOPES.join(" "),
    state,
  });
  return redirect(`${bmoOAuthBaseUrl()}/authorize?${params}`, [
    setCookieHeader(
      FLOW_COOKIE,
      signValue({ state, exp: Math.floor(Date.now() / 1000) + FLOW_SECONDS }, key),
      FLOW_SECONDS,
    ),
  ]);
}

/** GET /auth/bmo/callback?code&state → tokens stored → back to the tablet. */
export async function finishBmoConnect(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = flowKey();
  const flow = key
    ? verifyValue<{ state: string; exp: number }>(
        cookieFrom(request.headers.get("cookie"), FLOW_COOKIE),
        key,
      )
    : null;
  const back = (outcome: string) =>
    redirect(`/admin/interac?bmo=${outcome}`, [setCookieHeader(FLOW_COOKIE, "", 0)]);
  if (!flow) return back("failed");
  if (url.searchParams.get("error")) return back("cancelled");
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== flow.state) return back("failed");
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: bmoRedirectUri(),
  });
  if (!tokens) return back("failed");
  await saveTokens(tokens);
  return back("connected");
}
