/**
 * "Sign in with TAKATAK" for pppmtl.com customers (Google, e-mail or phone on takatak.ca). SERVER ONLY.
 *
 * Owner decision 2026-10-31: the customer goes to takatak.ca first (TAKATAK auth), then the account exists on
 * pppmtl.com, then payment on Clover. TAKATAK's Supabase Auth is an OAuth 2.1 / OpenID Connect provider with its
 * consent screen at takatak.ca/oauth/consent (takatakca/takatak-v1, src/lib/auth/oauth-consent.ts). pppmtl.com is
 * a confidential client: authorization code + PKCE (S256) + nonce, client_secret_basic at the token endpoint, and
 * the ID token is verified against TAKATAK's published keys (issuer, audience, expiry, nonce).
 *   Endpoints: https://pcjfahhlozsseqqevimi.supabase.co/auth/v1/.well-known/openid-configuration
 *   Guide:     https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
 *
 * TAKATAK stays the identity authority: pppmtl.com keeps only the TAKATAK user id (`sub`) and the contact details
 * in a signed HttpOnly cookie, never a password and never a second master customer record.
 *
 *   TAKATAK_OAUTH_CLIENT_ID, TAKATAK_OAUTH_CLIENT_SECRET   TAKATAK Supabase → Authentication → OAuth Server
 *   TAKATAK_AUTH_ISSUER    optional; default the TAKATAK production project below
 *   Redirect URI to register:  <PUBLIC_SITE_URL>/auth/takatak/callback
 * The cookies are signed with a key derived from PPP_ORDER_ACCESS_SECRET (no new secret to manage).
 */
import { createHash, createHmac, randomBytes } from "node:crypto";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet, type JWTPayload } from "jose";
import { getCookie } from "@tanstack/react-start/server";
import { SITE_URL } from "@/config/site";
import { cookieFrom, setCookieHeader, signValue, verifyValue } from "./signed-cookie";

export const DEFAULT_TAKATAK_ISSUER = "https://pcjfahhlozsseqqevimi.supabase.co/auth/v1";
const FLOW_COOKIE = "ppp_takatak_flow";
export const SESSION_COOKIE = "ppp_customer";
const FLOW_SECONDS = 10 * 60;
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const TIMEOUT_MS = 10_000;

export interface TakatakCustomer {
  /** TAKATAK user id (the ID token's `sub`). */
  sub: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface FlowState {
  state: string;
  verifier: string;
  nonce: string;
  next: string;
  exp: number;
}

type SessionState = TakatakCustomer & { exp: number };

const env = (k: string) => process.env[k]?.trim() || undefined;

export function takatakIssuer(): string {
  return (env("TAKATAK_AUTH_ISSUER") ?? DEFAULT_TAKATAK_ISSUER).replace(/\/+$/, "");
}

function siteUrl(): string {
  return (env("PUBLIC_SITE_URL") ?? SITE_URL).replace(/\/+$/, "");
}

export function takatakRedirectUri(): string {
  return `${siteUrl()}/auth/takatak/callback`;
}

/** Cookie signing key, derived so it never equals the order-access key itself. */
function cookieKey(): string | null {
  const base = env("PPP_ORDER_ACCESS_SECRET");
  return base && base.length >= 32
    ? createHmac("sha256", base).update("ppp-takatak-customer-session-v1").digest("hex")
    : null;
}

export function takatakAuthConfigured(): boolean {
  return Boolean(
    env("TAKATAK_OAUTH_CLIENT_ID") && env("TAKATAK_OAUTH_CLIENT_SECRET") && cookieKey(),
  );
}

/** Only a same-site path ("/checkout"), never "//host" or a full URL. */
export function safeNextPath(next: string | null | undefined): string {
  const value = (next ?? "").trim();
  return /^\/(?!\/)[A-Za-z0-9/_\-.?=&%]{0,200}$/.test(value) && !value.includes("\\")
    ? value
    : "/checkout";
}

const b64url = (bytes: Buffer) => bytes.toString("base64url");
export const pkceChallenge = (verifier: string) =>
  b64url(createHash("sha256").update(verifier).digest());

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}

/** GET /auth/takatak/start?next=/checkout → takatak.ca. */
export function startTakatakSignIn(request: Request): Response {
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const key = cookieKey();
  const clientId = env("TAKATAK_OAUTH_CLIENT_ID");
  if (!takatakAuthConfigured() || !key || !clientId) {
    return redirect(`${next}${next.includes("?") ? "&" : "?"}signin=unavailable`);
  }
  const flow: FlowState = {
    state: b64url(randomBytes(24)),
    verifier: b64url(randomBytes(48)),
    nonce: b64url(randomBytes(24)),
    next,
    exp: Math.floor(Date.now() / 1000) + FLOW_SECONDS,
  };
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: takatakRedirectUri(),
    scope: "openid email profile phone",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: pkceChallenge(flow.verifier),
    code_challenge_method: "S256",
  });
  return redirect(`${takatakIssuer()}/oauth/authorize?${params}`, [
    setCookieHeader(FLOW_COOKIE, signValue(flow, key), FLOW_SECONDS),
  ]);
}

let jwksCache: { at: number; keys: JSONWebKeySet } | null = null;

async function takatakKeys(): Promise<JSONWebKeySet> {
  if (jwksCache && Date.now() - jwksCache.at < 10 * 60_000) return jwksCache.keys;
  const res = await fetch(`${takatakIssuer()}/.well-known/jwks.json`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`TAKATAK keys HTTP ${res.status}`);
  const keys = (await res.json()) as JSONWebKeySet;
  jwksCache = { at: Date.now(), keys };
  return keys;
}

const claim = (p: JWTPayload | Record<string, unknown>, k: string) => {
  const v = (p as Record<string, unknown>)[k];
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

function customerFrom(p: Record<string, unknown>, sub: string): TakatakCustomer {
  const meta = (p["user_metadata"] ?? {}) as Record<string, unknown>;
  const name =
    claim(p, "name") ??
    ([claim(p, "given_name"), claim(p, "family_name")].filter(Boolean).join(" ") || null) ??
    claim(meta, "full_name") ??
    claim(meta, "name");
  return {
    sub,
    name: name ? name.slice(0, 120) : null,
    email: claim(p, "email")?.slice(0, 254) ?? null,
    phone: (claim(p, "phone_number") ?? claim(p, "phone"))?.slice(0, 40) ?? null,
  };
}

export type CallbackOutcome = "signed_in" | "cancelled" | "failed";

/** GET /auth/takatak/callback?code&state → back to the page the customer came from, signed in. */
export async function finishTakatakSignIn(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = cookieKey();
  const clientId = env("TAKATAK_OAUTH_CLIENT_ID");
  const clientSecret = env("TAKATAK_OAUTH_CLIENT_SECRET");
  const flow = key
    ? verifyValue<FlowState>(cookieFrom(request.headers.get("cookie"), FLOW_COOKIE), key)
    : null;
  const next = safeNextPath(flow?.next);
  const back = (outcome: CallbackOutcome, cookies: string[] = []) =>
    redirect(`${next}${next.includes("?") ? "&" : "?"}signin=${outcome}`, [
      setCookieHeader(FLOW_COOKIE, "", 0),
      ...cookies,
    ]);

  if (!key || !clientId || !clientSecret || !flow) return back("failed");
  if (url.searchParams.get("error")) return back("cancelled");
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== flow.state) return back("failed");

  try {
    const res = await fetch(`${takatakIssuer()}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: takatakRedirectUri(),
        code_verifier: flow.verifier,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const tokens = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const idToken = typeof tokens?.["id_token"] === "string" ? tokens["id_token"] : null;
    if (!res.ok || !idToken) return back("failed");

    const { payload } = await jwtVerify(idToken, createLocalJWKSet(await takatakKeys()), {
      issuer: takatakIssuer(),
      audience: clientId,
    });
    if (payload["nonce"] !== flow.nonce || typeof payload.sub !== "string" || !payload.sub) {
      return back("failed");
    }
    let profile: Record<string, unknown> = payload as Record<string, unknown>;
    const accessToken =
      typeof tokens?.["access_token"] === "string" ? tokens["access_token"] : null;
    if (accessToken && !(claim(profile, "email") && claim(profile, "name"))) {
      // Contact details may live only at the userinfo endpoint; same subject required.
      const info = await fetch(`${takatakIssuer()}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
        .then((r) => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : null))
        .catch(() => null);
      if (info && info["sub"] === payload.sub) profile = { ...info, ...profile };
    }
    const session: SessionState = {
      ...customerFrom(profile, payload.sub),
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    };
    return back("signed_in", [
      setCookieHeader(SESSION_COOKIE, signValue(session, key), SESSION_SECONDS),
    ]);
  } catch {
    return back("failed");
  }
}

/** GET /auth/signout */
export function signOutTakatak(request: Request): Response {
  const next = safeNextPath(new URL(request.url).searchParams.get("next") ?? "/");
  return redirect(next, [setCookieHeader(SESSION_COOKIE, "", 0)]);
}

/** The signed-in TAKATAK customer of this request (server functions), or null. */
export function currentTakatakCustomer(): TakatakCustomer | null {
  const key = cookieKey();
  if (!key) return null;
  const session = verifyValue<SessionState>(getCookie(SESSION_COOKIE), key);
  if (!session || typeof session.sub !== "string" || !session.sub) return null;
  return { sub: session.sub, name: session.name, email: session.email, phone: session.phone };
}

export function resetTakatakKeysForTests(): void {
  jwksCache = null;
}
