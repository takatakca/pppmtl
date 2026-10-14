/** Server-issued same-browser guest receipt grants.
 * This is NOT TAKATAK identity; anonymous cross-device history requires verified TAKATAK Auth.
 * Signed HttpOnly cookies contain only random internal order IDs, never names/phones/card data.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE = "ppp_order_access";
const CHECKOUT_COOKIE = "ppp_checkout_nonce";
const LIFETIME_SECONDS = 14 * 24 * 60 * 60;
const MAX_ORDER_IDS = 10;

interface Grant { ids: string[]; exp: number }

function secret(): string | null {
  const key = process.env.PPP_ORDER_ACCESS_SECRET ?? "";
  return key.length >= 32 ? key : null;
}

export function orderAccessConfigured(): boolean {
  return Boolean(secret());
}

function mac(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

function equalHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(a)) return false;
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Pure, deterministic verifier for cross-user and tampering tests. */
export function verifyOrderGrant(cookie: string | undefined, key: string, now = Date.now()): string[] {
  if (!cookie || key.length < 32) return [];
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) return [];
  const payload = cookie.slice(0, dot);
  const signature = cookie.slice(dot + 1);
  if (!equalHex(signature, mac(payload, key))) return [];
  try {
    const grant = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Grant;
    const seconds = Math.floor(now / 1000);
    if (!grant || !Number.isSafeInteger(grant.exp) || grant.exp <= seconds || grant.exp > seconds + LIFETIME_SECONDS ||
        !Array.isArray(grant.ids) || grant.ids.length > MAX_ORDER_IDS ||
        grant.ids.some((id) => typeof id !== "string" || !/^ord_[a-z0-9_-]{5,80}$/i.test(id))) return [];
    return grant.ids;
  } catch {
    return [];
  }
}

export function readableOrderIds(): string[] {
  const key = secret();
  return key ? verifyOrderGrant(getCookie(COOKIE), key) : [];
}

export function canReadOrder(orderId: string): boolean {
  return readableOrderIds().includes(orderId);
}

/** Adds a newly created order to this browser's signed receipt list. */
export function grantOrderAccess(orderId: string): void {
  const key = secret();
  if (!key) throw new Error("PPP_ORDER_ACCESS_SECRET not configured");
  const existing = readableOrderIds().filter((id) => id !== orderId);
  const grant: Grant = {
    ids: [...existing, orderId].slice(-MAX_ORDER_IDS),
    exp: Math.floor(Date.now() / 1000) + LIFETIME_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
  setCookie(COOKIE, `${payload}.${mac(payload, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LIFETIME_SECONDS,
  });
}

/**
 * Bind in-memory cart deduplication to this browser. Two different guests can
 * place the same items using the same contact number without sharing an order.
 * Cookie value is random, HttpOnly, and never accepted from the checkout payload.
 */
export function checkoutBrowserNonce(): string {
  const existing = getCookie(CHECKOUT_COOKIE);
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
  const nonce = randomBytes(32).toString("hex");
  setCookie(CHECKOUT_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LIFETIME_SECONDS,
  });
  return nonce;
}
