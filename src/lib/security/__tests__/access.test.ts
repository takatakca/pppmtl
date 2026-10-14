import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateAdminCredential, verifyAdminSession } from "../admin.server";
import { verifyOrderGrant } from "../order-access.server";

const signing = "signing-secret-at-least-32-characters-for-tests";
const customerSecret = "order-secret-at-least-32-characters-for-tests";
const now = 1_791_980_000_000;

function signedAdmin(until: number, nonce = "a".repeat(32)) {
  const payload = `${until}.${nonce}`;
  const mac = createHmac("sha256", signing).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

function signedOrders(ids: string[], exp: number) {
  const payload = Buffer.from(JSON.stringify({ ids, exp })).toString("base64url");
  const mac = createHmac("sha256", customerSecret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

afterEach(() => vi.unstubAllEnvs());

describe("temporary administrator authorization", () => {
  it("refuses credentials until two distinct strong server secrets are configured", () => {
    vi.stubEnv("PPP_ADMIN_ACCESS_TOKEN", "");
    vi.stubEnv("PPP_ADMIN_SESSION_SECRET", "");
    expect(validateAdminCredential("anything")).toBe(false);
    vi.stubEnv("PPP_ADMIN_ACCESS_TOKEN", "access-token-is-long-enough-for-local-tests");
    vi.stubEnv("PPP_ADMIN_SESSION_SECRET", "session-token-is-long-enough-for-local-tests");
    expect(validateAdminCredential("access-token-is-long-enough-for-local-tests")).toBe(true);
    expect(validateAdminCredential("access-token-is-long-enough-for-local-testx")).toBe(false);
    vi.stubEnv("PPP_ADMIN_SESSION_SECRET", "access-token-is-long-enough-for-local-tests");
    expect(validateAdminCredential("access-token-is-long-enough-for-local-tests")).toBe(false);
  });

  it("accepts valid session and rejects expired, future-dated, tampered or foreign cookies", () => {
    const t = Math.floor(now / 1000);
    const valid = signedAdmin(t + 60);
    expect(verifyAdminSession(valid, signing, now)).toBe(true);
    expect(verifyAdminSession(signedAdmin(t - 1), signing, now)).toBe(false);
    expect(verifyAdminSession(signedAdmin(t + 9 * 3600), signing, now)).toBe(false);
    expect(verifyAdminSession(valid.slice(0, -1) + "f", signing, now)).toBe(false);
    expect(verifyAdminSession(valid, "different-strong-key", now)).toBe(false);
    expect(verifyAdminSession(undefined, signing, now)).toBe(false);
  });
});

describe("signed browser-scoped order receipts", () => {
  it("returns only authorized order ids, not names or phone-based matches", () => {
    const t = Math.floor(now / 1000);
    const ids = ["ord_checkout123", "ord_checkout456"];
    expect(verifyOrderGrant(signedOrders(ids, t + 3600), customerSecret, now)).toEqual(ids);
    expect(verifyOrderGrant(signedOrders(ids, t - 1), customerSecret, now)).toEqual([]);
    expect(verifyOrderGrant(signedOrders(ids, t + 15 * 24 * 3600), customerSecret, now)).toEqual([]);
  });

  it("rejects tampering, other signing keys and forged order ids", () => {
    const t = Math.floor(now / 1000);
    const cookie = signedOrders(["ord_checkout123"], t + 3600);
    expect(verifyOrderGrant(cookie.replace("checkout123", "attacker"), customerSecret, now)).toEqual([]);
    expect(verifyOrderGrant(cookie, "some-other-secret-which-is-long-enough", now)).toEqual([]);
    expect(verifyOrderGrant(signedOrders(["ord_checkout123", "bad-value"], t + 3600), customerSecret, now)).toEqual([]);
    expect(verifyOrderGrant(undefined, customerSecret, now)).toEqual([]);
  });
});
