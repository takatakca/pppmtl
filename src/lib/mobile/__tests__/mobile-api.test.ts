import { describe, expect, it } from "vitest";
import {
  deviceScope,
  mobileCatalog,
  parseReceipts,
  receiptAllows,
} from "@/lib/mobile/mobile-api.server";
import { signOrderGrant, verifyOrderGrant } from "@/lib/security/order-access.server";
import { appReturnUrls } from "@/lib/integration/providers/clover/orders";

const KEY = "k".repeat(40);
const OTHER = "o".repeat(40);

describe("MontrealHub app catalog", () => {
  const catalog = mobileCatalog("https://pppmtl.com", { onlineOrdering: true, interac: false });

  it("lists the real menu with absolute photo links", () => {
    expect(catalog.items.length).toBeGreaterThan(100);
    for (const item of catalog.items) {
      expect(item.image.startsWith("https://pppmtl.com/")).toBe(true);
      expect(item.name.fr.length).toBeGreaterThan(0);
    }
    expect(catalog.categories.every((c) => c.count > 0)).toBe(true);
  });

  it("shows every brand, PPP first, with rails pointing to menu items", () => {
    expect(catalog.brands[0]?.id).toBe("ppp");
    expect(catalog.brands.length).toBe(17);
    const ids = new Set(catalog.items.map((i) => i.id));
    for (const brand of catalog.brands) {
      for (const rail of brand.rails) for (const id of rail.itemIds) expect(ids.has(id)).toBe(true);
      if (brand.id !== "ppp") expect(brand.markSvg).toContain("<svg");
    }
  });

  it("never exposes a credential or a Clover merchant id", () => {
    const text = JSON.stringify(catalog);
    expect(text).not.toMatch(/token|secret|merchant/i);
  });

  it("turns Interac off when online ordering is off", () => {
    const off = mobileCatalog("https://pppmtl.com", { onlineOrdering: false, interac: true });
    expect(off.checkout.interac).toBe(false);
    expect(off.checkout.card).toBe(false);
  });
});

describe("MontrealHub app receipts", () => {
  it("accepts only a random 64-hex device id", () => {
    expect(deviceScope("a".repeat(64))).toBe(`app:${"a".repeat(64)}`);
    expect(deviceScope("short")).toBeNull();
    expect(deviceScope(null)).toBeNull();
  });

  it("reads an order only with a token signed for that order", () => {
    const token = signOrderGrant(["ord_abc12345"], KEY);
    expect(receiptAllows({ id: "ord_abc12345", token }, KEY, verifyOrderGrant)).toBe(true);
    expect(receiptAllows({ id: "ord_other9999", token }, KEY, verifyOrderGrant)).toBe(false);
    expect(receiptAllows({ id: "ord_abc12345", token }, OTHER, verifyOrderGrant)).toBe(false);
    expect(receiptAllows({ id: "ord_abc12345", token }, null, verifyOrderGrant)).toBe(false);
    const tampered = token.replace(/.$/, (c) => (c === "a" ? "b" : "a"));
    expect(receiptAllows({ id: "ord_abc12345", token: tampered }, KEY, verifyOrderGrant)).toBe(
      false,
    );
  });

  it("drops malformed receipt lists", () => {
    expect(parseReceipts(null)).toEqual([]);
    expect(parseReceipts({ orders: "x" })).toEqual([]);
    expect(
      parseReceipts({
        orders: [
          { id: "bad", token: "t" },
          { id: "ord_abc12345", token: "t" },
        ],
      }),
    ).toEqual([{ id: "ord_abc12345", token: "t" }]);
    expect(
      parseReceipts({ orders: Array(100).fill({ id: "ord_abc12345", token: "t" }) }),
    ).toHaveLength(30);
  });

  it("sends app payments back to the app page, never to the web receipt", () => {
    const urls = appReturnUrls("https://pppmtl.com", "ord_abc12345");
    expect(urls.success).toBe("https://pppmtl.com/app-return.html?order=ord_abc12345&paid=1");
    expect(urls.cancel).toContain("payment=cancelled");
  });
});
