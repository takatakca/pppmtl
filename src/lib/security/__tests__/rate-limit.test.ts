import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  allowVerifyStart,
  createRateLimiter,
  VERIFY_START_WINDOWS,
  verifyStartLimiter,
} from "../rate-limit";

const T0 = Date.parse("2026-10-30T16:00:00.000Z");

beforeEach(() => verifyStartLimiter.reset());

describe("sliding-window rate limiter", () => {
  it("allows the limit, refuses the next with the wait, and frees the slot as the window slides", () => {
    const limiter = createRateLimiter();
    const window = { limit: 2, windowMs: 60_000 };
    expect(limiter.hit([{ key: "a", window }], T0)).toEqual({ ok: true });
    expect(limiter.hit([{ key: "a", window }], T0 + 10_000)).toEqual({ ok: true });
    expect(limiter.hit([{ key: "a", window }], T0 + 20_000)).toEqual({
      ok: false,
      retryAfterS: 40,
    });
    expect(limiter.hit([{ key: "a", window }], T0 + 60_001)).toEqual({ ok: true });
  });

  it("a refused attempt costs nothing on the other keys", () => {
    const limiter = createRateLimiter();
    const tight = { limit: 1, windowMs: 60_000 };
    const loose = { limit: 2, windowMs: 60_000 };
    expect(limiter.hit([{ key: "x", window: tight }], T0).ok).toBe(true);
    expect(
      limiter.hit(
        [
          { key: "x", window: tight },
          { key: "y", window: loose },
        ],
        T0,
      ).ok,
    ).toBe(false);
    // "y" was not charged by the refused attempt: two hits still fit.
    expect(limiter.hit([{ key: "y", window: loose }], T0).ok).toBe(true);
    expect(limiter.hit([{ key: "y", window: loose }], T0).ok).toBe(true);
  });
});

describe("phone verification starts", () => {
  it("one client gets at most its per-IP window, another client is not affected", () => {
    const limit = VERIFY_START_WINDOWS.perClient.limit;
    for (let i = 0; i < limit; i += 1) {
      expect(allowVerifyStart({ ip: "203.0.113.7", session: null }, T0 + i * 1000).ok).toBe(true);
    }
    const refused = allowVerifyStart({ ip: "203.0.113.7", session: null }, T0 + limit * 1000);
    expect(refused.ok).toBe(false);
    expect(!refused.ok && refused.retryAfterS).toBeGreaterThan(0);
    expect(allowVerifyStart({ ip: "198.51.100.9", session: null }, T0 + limit * 1000).ok).toBe(
      true,
    );
  });

  it("one browser session is limited even when its IP changes", () => {
    const limit = VERIFY_START_WINDOWS.perSession.limit;
    for (let i = 0; i < limit; i += 1) {
      expect(allowVerifyStart({ ip: `192.0.2.${i}`, session: "nonce-1" }, T0).ok).toBe(true);
    }
    expect(allowVerifyStart({ ip: "192.0.2.200", session: "nonce-1" }, T0).ok).toBe(false);
  });

  it("the whole site stays under Food Hub's 60 per minute, whatever the clients", () => {
    const site = VERIFY_START_WINDOWS.site.limit;
    expect(site).toBeLessThan(60);
    for (let i = 0; i < site; i += 1) {
      expect(allowVerifyStart({ ip: `10.0.${i}.1`, session: `s${i}` }, T0).ok).toBe(true);
    }
    expect(allowVerifyStart({ ip: "10.9.9.9", session: "fresh" }, T0).ok).toBe(false);
    expect(allowVerifyStart({ ip: "10.9.9.9", session: "fresh" }, T0 + 61_000).ok).toBe(true);
  });

  it("the server function checks the window before Food Hub is asked to text anyone", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/customer/customer.functions.ts"),
      "utf8",
    );
    const handler = source.slice(source.indexOf("export const startPhoneVerification"));
    const gate = handler.indexOf("allowVerifyStart(");
    const call = handler.indexOf("startVerification({");
    expect(gate).toBeGreaterThan(0);
    expect(call).toBeGreaterThan(gate);
  });
});
