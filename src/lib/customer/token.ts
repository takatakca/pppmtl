/**
 * Pure helpers around the Food Hub customer token and Canadian phone numbers. No I/O, safe anywhere.
 *
 * Token (signed by Food Hub, 30 days): `cust.<customerId>.<tenant>.<expUnix>.<tokenVersion>.<hmac base64url>`.
 * The site never verifies the signature (it has no key for it and must not): it only checks the shape before
 * storing or forwarding a token, and reads the expiry to avoid sending one it knows is dead.
 */

const TOKEN_SHAPE =
  /^cust\.[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]{1,32}\.\d{1,12}\.\d{1,9}\.[A-Za-z0-9_-]{16,128}$/;

export const CUSTOMER_TOKEN_MAX_LENGTH = 512;

export function isCustomerToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= CUSTOMER_TOKEN_MAX_LENGTH &&
    TOKEN_SHAPE.test(value)
  );
}

/** Expiry in unix seconds, or null for a malformed token. */
export function customerTokenExpiry(token: string): number | null {
  if (!isCustomerToken(token)) return null;
  const exp = Number(token.split(".")[3]);
  return Number.isSafeInteger(exp) ? exp : null;
}

export function customerTokenExpired(token: string, now = Date.now()): boolean {
  const exp = customerTokenExpiry(token);
  return exp === null || exp * 1000 <= now;
}

/** Digits only; a leading country "1" on an 11-digit number is dropped. */
export function normalizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** `+1XXXXXXXXXX` for a 10-digit Canadian/US number, else null. */
export function toE164Canada(raw: string): string | null {
  const digits = normalizePhoneDigits(raw);
  return /^[2-9]\d{9}$/.test(digits) ? `+1${digits}` : null;
}

/** "(514) 555-0123" for display; the input is echoed when it is not a 10-digit number. */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = normalizePhoneDigits(raw);
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** A 6-digit code (Food Hub sends six digits); anything else is refused before any network call. */
export function isVerificationCode(value: unknown): value is string {
  return typeof value === "string" && /^\d{4,8}$/.test(value);
}
