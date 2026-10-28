/** PPP privileged session boundary. Server-only bootstrap until TAKATAK Auth is integrated.
 * Never use a public VITE_* variable for either credential.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE = "ppp_admin_session";
const LIFETIME_SECONDS = 8 * 60 * 60;

function secrets(): { access: string; signing: string } | null {
  const access = process.env["PPP_ADMIN_ACCESS_TOKEN"]?.trim() ?? "";
  const signing = process.env["PPP_ADMIN_SESSION_SECRET"]?.trim() ?? "";
  if (access.length < 32 || signing.length < 32 || access === signing) return null;
  return { access, signing };
}

function equals(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  return aBytes.length === bBytes.length && timingSafeEqual(aBytes, bBytes);
}

/** Refuse malformed/oversized login bodies before comparing secrets or allocating large buffers. */
export function isReasonableAdminCredential(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 1024;
}

export function adminConfigured(): boolean {
  return Boolean(secrets());
}

export function validateAdminCredential(candidate: string): boolean {
  const config = secrets();
  return Boolean(
    config && isReasonableAdminCredential(candidate) && equals(candidate, config.access),
  );
}

function signature(payload: string, signing: string): string {
  return createHmac("sha256", signing).update(payload).digest("hex");
}

/** Pure verifier for regression tests; no request-scoped globals required. */
export function verifyAdminSession(
  cookie: string | undefined,
  signing: string,
  now = Date.now(),
): boolean {
  // A legitimate session contains only an expiry, 16-byte nonce and SHA-256.
  // Reject oversized user-supplied cookies before splitting/verifying them.
  if (!cookie || cookie.length > 256 || !signing) return false;
  const parts = cookie.split(".");
  if (parts.length !== 3) return false;
  const [until, nonce, mac] = parts;
  if (
    !/^\d{10}$/.test(until ?? "") ||
    !/^[a-f0-9]{32}$/.test(nonce ?? "") ||
    !/^[a-f0-9]{64}$/.test(mac ?? "")
  )
    return false;
  const expiry = Number(until);
  const nowSeconds = Math.floor(now / 1000);
  if (expiry <= nowSeconds || expiry > nowSeconds + LIFETIME_SECONDS) return false;
  return equals(mac!, signature(`${until}.${nonce}`, signing));
}

export function adminSessionActive(): boolean {
  const config = secrets();
  return Boolean(config && verifyAdminSession(getCookie(COOKIE), config.signing));
}

export function openAdminSession(credential: string): boolean {
  const config = secrets();
  if (!config || !isReasonableAdminCredential(credential) || !equals(credential, config.access)) {
    return false;
  }
  const until = Math.floor(Date.now() / 1000) + LIFETIME_SECONDS;
  const payload = `${until}.${randomBytes(16).toString("hex")}`;
  setCookie(COOKIE, `${payload}.${signature(payload, config.signing)}`, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    path: "/",
    maxAge: LIFETIME_SECONDS,
  });
  return true;
}

export function closeAdminSession(): void {
  deleteCookie(COOKIE, { path: "/" });
}

/** Never rely on a route's visibility, robots meta tag or frontend flags for authorization. */
export function requireAdmin(): void {
  if (adminSessionActive()) return;
  throw Object.assign(new Error("Administrator authentication required"), { statusCode: 401 });
}
