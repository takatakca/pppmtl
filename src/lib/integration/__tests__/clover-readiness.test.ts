import { afterEach, describe, expect, it, vi } from "vitest";
import { cloverCheckoutConfigured, cloverReadiness } from "../providers/clover/config.server";
import { priceCloverCart } from "../providers/clover/checkout";
import { cloverSlotFor, cloverSnapshot } from "@/data/clover/overlay";

afterEach(() => vi.unstubAllEnvs());

describe("Clover payment safety gate", () => {
  const locationId = "loc-ndg-somerled";

  function credentials() {
    vi.stubEnv("CLOVER_MERCHANT_ID", "merchant-for-test");
    vi.stubEnv("CLOVER_ECOMM_PRIVATE_KEY", "checkout-for-test");
    vi.stubEnv("CLOVER_WEBHOOK_SECRET", "webhook-for-test");
  }

  it("never starts real production charges with an in-memory order store", () => {
    credentials();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLOVER_ENV", "production");
    expect(cloverCheckoutConfigured(locationId)).toBe(false);
    expect(cloverReadiness(locationId)).toMatchObject({
      durableOrderStore: false,
      checkoutReady: false,
    });
  });

  it("allows only configured test/sandbox checkout and requires webhook verification", () => {
    credentials();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CLOVER_ENV", "sandbox");
    expect(cloverCheckoutConfigured(locationId)).toBe(true);
    vi.stubEnv("CLOVER_WEBHOOK_SECRET", "");
    expect(cloverCheckoutConfigured(locationId)).toBe(false);
  });

  it("rejects fractional, non-finite and oversized quantities at the Clover price boundary", () => {
    for (const quantity of [0, -1, 1.5, NaN, Infinity, 51]) {
      const result = priceCloverCart(
        [
          {
            siteItemId: "pita-wrap-mixte-shish-taouk-shawarma",
            quantity,
            notes: "",
            selections: {},
          },
        ],
        cloverSnapshot,
        cloverSlotFor,
      );
      expect(result).toMatchObject({ ok: false, code: "menu_changed" });
    }
  });
});
