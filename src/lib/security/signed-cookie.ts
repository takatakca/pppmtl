/**
 * Small signed cookie values: base64url(JSON) + "." + HMAC-SHA256 hex. SERVER ONLY (node:crypto).
 * Pure and deterministic, so tampering and expiry are unit-tested. Never put a secret or card data inside:
 * the payload is signed, not encrypted.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Values above this are refused before any HMAC or JSON work. */
const MAX_COOKIE_LENGTH = 4096;

export function signValue(payload: object, key: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", key).update(body).digest("hex")}`;
}

/** The payload when the signature is right and `exp` (seconds) is in the future; otherwise null. */
export function verifyValue<T extends { exp: number }>(
  value: string | undefined | null,
  key: string,
  now = Date.now(),
): T | null {
  if (!value || value.length > MAX_COOKIE_LENGTH || key.length < 32) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = Buffer.from(createHmac("sha256", key).update(body).digest("hex"), "hex");
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    return payload && Number.isSafeInteger(payload.exp) && payload.exp > Math.floor(now / 1000)
      ? payload
      : null;
  } catch {
    return null;
  }
}

/** One cookie from a raw Cookie header (route handlers have the Request, not the h3 helpers). */
export function cookieFrom(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

export function setCookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env["NODE_ENV"] === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}
