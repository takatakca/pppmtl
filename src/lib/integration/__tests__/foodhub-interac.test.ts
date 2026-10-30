import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { restaurantLocations } from "@/config/locations";
import type { UniversalOrderDraft } from "../core/contracts";
import { resetIntegrationLogForTests, recentIntegrationEvents } from "../core/logging";
import { classifyStatus, foodhubRequest } from "../providers/foodhub/client.server";
import { foodhubLocationCode, interacAvailability } from "../providers/foodhub/config.server";
import {
  buildInteracWebsiteOrder,
  interacInstructionRows,
  interacQuote,
  parseInteracResponse,
  totalsAgree,
} from "../providers/foodhub/interac";
import {
  FOODHUB_WEBSITE_ORDER_PATH,
  foodhubInteracSubmitAdapter,
} from "../providers/foodhub/interac-orders.server";
import type { OrderItem } from "@/lib/orders/types";

const SECRET = "test-secret-0123456789abcdef";
const TOKEN = `cust.c1.pppmtl.1900000000.1.${"a".repeat(43)}`;
const ndg = restaurantLocations.find((l) => l.slug === "ndg")!;

const items: OrderItem[] = [
  {
    lineId: "l1",
    productId: "pizza-pepperoni",
    providerProductId: "CLV-PEP",
    name: "Pepperoni",
    quantity: 2,
    unitPrice: 1299,
    modifiers: [
      {
        groupId: "size",
        choiceId: "large",
        providerModifierId: null,
        label: "Size: Large",
        priceDelta: 300,
      },
    ],
    notes: "no onion",
  },
];

const draft = (over: Partial<UniversalOrderDraft> = {}): UniversalOrderDraft => ({
  locationId: ndg.id,
  orderType: "PICKUP",
  lines: items.map((i) => ({
    productId: i.productId,
    externalProductId: i.providerProductId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    modifiers: i.modifiers.map((m) => ({
      groupId: m.groupId,
      choiceId: m.choiceId,
      externalChoiceId: null,
      priceDelta: m.priceDelta,
    })),
    notes: i.notes,
  })),
  customer: {
    takatakCustomerId: null,
    externalCustomerId: null,
    preferredName: "Mathieu",
    email: null,
    phone: "5145550000",
    phoneVerified: false,
  },
  deliveryAddress: null,
  notes: "",
  ...over,
});

const heldResponse = {
  ok: true,
  number: "PPP-1A2B3",
  id: "dir_abc",
  total: 42.52,
  interac: {
    recipient: "paiements@example-ppp.test",
    amount: 42.52,
    reference: "PPP-1A2B3",
    question: null,
    autoDeposit: true,
    expiresAt: "2026-10-30T20:00:00.000Z",
    instructionsFr: "Envoyez le virement avec le message PPP-1A2B3.",
    instructionsEn: "Send the transfer with the message PPP-1A2B3.",
  },
};

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(body === null ? "" : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", ...headers },
      });
    }),
  );
  return calls;
}

function configure(enabled = true) {
  vi.stubEnv("FOODHUB_URL", "https://foodhub.test/");
  vi.stubEnv("FOODHUB_WEBSITE_ORDER_SECRET", SECRET);
  vi.stubEnv("FOODHUB_INTERAC_ENABLED", enabled ? "true" : "");
  vi.stubEnv("FOODHUB_INTERAC_FEE", "");
  vi.stubEnv("FOODHUB_INTERAC_FEE_TAXABLE", "");
  vi.stubEnv("FOODHUB_DELIVERY_FEE", "");
}

beforeEach(() => {
  resetIntegrationLogForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Interac quote (all-inclusive, before commitment)", () => {
  it("adds the fee, then GST + QST on subtotal + fee, like Food Hub's totalsFor", () => {
    // 20.00 + 5.00 taxable = 25.00 × 14.975 % = 3.74375 -> 3.74; total 28.74
    const quote = interacQuote({
      subtotalCents: 2000,
      interacFeeCents: 500,
      feeTaxable: true,
      deliveryFeeCents: 0,
    });
    expect(quote).toEqual({
      subtotalCents: 2000,
      interacFeeCents: 500,
      deliveryFeeCents: 0,
      taxCents: 374,
      totalCents: 2874,
    });
  });

  it("leaves the fee untaxed when Food Hub does not tax it", () => {
    // 19.99 × 14.975 % = 2.9935 -> 2.99; total 19.99 + 5.00 + 2.99 = 27.98
    const quote = interacQuote({
      subtotalCents: 1999,
      interacFeeCents: 500,
      feeTaxable: false,
      deliveryFeeCents: 0,
    });
    expect(quote.taxCents).toBe(299);
    expect(quote.totalCents).toBe(2798);
  });

  it("taxes the delivery fee too, as Food Hub does", () => {
    // 20 + 3 + 5 = 28 × 14.975 % = 4.193 -> 4.19; total 32.19
    const quote = interacQuote({
      subtotalCents: 2000,
      interacFeeCents: 500,
      feeTaxable: true,
      deliveryFeeCents: 300,
    });
    expect(quote.taxCents).toBe(419);
    expect(quote.totalCents).toBe(3219);
  });

  it("agrees within Food Hub's two-cent tolerance only", () => {
    expect(totalsAgree(2874, 2876)).toBe(true);
    expect(totalsAgree(2874, 2877)).toBe(false);
  });
});

describe("website-order payload (contract section B)", () => {
  it("carries payment interac, the fee line, the displayed total, refs and the customer token", () => {
    const quote = interacQuote({
      subtotalCents: 3198,
      interacFeeCents: 500,
      feeTaxable: true,
      deliveryFeeCents: 0,
    });
    const payload = buildInteracWebsiteOrder({
      orderId: "ord_1",
      brand: "PPP Pizzeria",
      locationCode: "NDG_MAIN",
      customer: { name: "Mathieu", phone: "+15145550000", email: null, lang: "fr" },
      fulfillment: "pickup",
      deliveryAddress: null,
      lines: items.map((i) => ({
        productId: i.productId,
        providerProductId: i.providerProductId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        modifiers: i.modifiers.map((m) => ({ label: m.label, priceDelta: m.priceDelta })),
        notes: i.notes,
      })),
      quote,
      customerToken: TOKEN,
    });
    expect(payload).toMatchObject({
      id: "ord_1",
      brand: "PPP Pizzeria",
      location: "NDG_MAIN",
      customer: { name: "Mathieu", phone: "+15145550000", lang: "fr" },
      fulfillment: "pickup",
      payment: "interac",
      paid: false,
      fees: [{ code: "interac", name: "Frais Interac e-Transfer", amount: 5 }],
      total: quote.totalCents / 100,
      customerToken: TOKEN,
    });
    expect(payload.items).toEqual([
      {
        ref: "CLV-PEP",
        name: "Pepperoni",
        quantity: 2,
        price: 12.99,
        notes: "no onion",
        options: [{ name: "Size: Large", price: 3 }],
      },
    ]);
    expect(payload).not.toHaveProperty("address");
    expect(payload).not.toHaveProperty("deliveryFee");
  });

  it("sends the address and the delivery fee for a delivery, and no token for a guest", () => {
    const quote = interacQuote({
      subtotalCents: 3198,
      interacFeeCents: 500,
      feeTaxable: true,
      deliveryFeeCents: 400,
    });
    const payload = buildInteracWebsiteOrder({
      orderId: "ord_2",
      brand: "PPP Pizzeria",
      locationCode: "NDG_MAIN",
      customer: { name: null, phone: "5145550000", email: "x@example.com", lang: "en" },
      fulfillment: "delivery",
      deliveryAddress: "1 Rue Test, Montréal, QC, H1H1H1",
      lines: [],
      quote,
      customerToken: null,
    });
    expect(payload.address).toBe("1 Rue Test, Montréal, QC, H1H1H1");
    expect(payload.deliveryFee).toBe(4);
    expect(payload.customer).toEqual({ phone: "5145550000", email: "x@example.com", lang: "en" });
    expect(payload).not.toHaveProperty("customerToken");
  });
});

describe("Food Hub's Interac answer", () => {
  it("reads the held order and its instructions", () => {
    const parsed = parseInteracResponse(heldResponse);
    expect(parsed?.number).toBe("PPP-1A2B3");
    expect(parsed?.interac.recipient).toBe("paiements@example-ppp.test");
    expect(parsed?.interac.autoDeposit).toBe(true);
    expect(parsed?.total).toBe(42.52);
  });

  it("never treats a 200 without instructions as a held order", () => {
    expect(parseInteracResponse({ ok: true, number: "PPP-1", id: "dir_1", total: 10 })).toBeNull();
    expect(parseInteracResponse({ ok: false, error: "nope" })).toBeNull();
    expect(parseInteracResponse(null)).toBeNull();
  });

  it("words the instructions for the customer in both languages", () => {
    const rowsFr = interacInstructionRows(parseInteracResponse(heldResponse)!.interac, "fr");
    expect(rowsFr.map((r) => r.key)).toEqual([
      "recipient",
      "amount",
      "reference",
      "autoDeposit",
      "deadline",
    ]);
    expect(rowsFr.find((r) => r.key === "amount")?.value).toBe("36,78 $");
    const rowsEn = interacInstructionRows(parseInteracResponse(heldResponse)!.interac, "en");
    expect(rowsEn.find((r) => r.key === "amount")?.value).toBe("$42.52");
    expect(rowsEn.find((r) => r.key === "reference")?.value).toBe("PPP-1A2B3");
  });
});

describe("Interac availability (owner switches)", () => {
  it("is closed without FOODHUB_URL + secret, then without FOODHUB_INTERAC_ENABLED", () => {
    expect(interacAvailability(ndg.id, "PICKUP")).toMatchObject({
      available: false,
      reason: "not_configured",
    });
    configure(false);
    expect(interacAvailability(ndg.id, "PICKUP")).toMatchObject({
      available: false,
      reason: "not_enabled",
    });
  });

  it("maps verified stores only, and keeps delivery closed until a delivery fee exists", () => {
    configure();
    expect(foodhubLocationCode(ndg.id)).toBe("NDG_MAIN");
    expect(foodhubLocationCode("loc-chambly")).toBeNull();
    expect(interacAvailability(ndg.id, "PICKUP")).toMatchObject({ available: true, feeCents: 500 });
    expect(interacAvailability(ndg.id, "DELIVERY")).toMatchObject({
      available: false,
      reason: "delivery_fee_unknown",
    });
    expect(interacAvailability("loc-chambly", "PICKUP")).toMatchObject({
      available: false,
      reason: "location_not_mapped",
    });
    vi.stubEnv("FOODHUB_DELIVERY_FEE", "3.50");
    expect(interacAvailability(ndg.id, "DELIVERY")).toMatchObject({
      available: true,
      deliveryFeeCents: 350,
    });
  });
});

describe("Food Hub HTTP client", () => {
  it("classifies statuses the way the customer flow reads them", () => {
    expect(classifyStatus(404)).toBe("not_available");
    expect(classifyStatus(503)).toBe("unavailable");
    expect(classifyStatus(429)).toBe("rate_limited");
    expect(classifyStatus(401)).toBe("unauthorized");
    expect(classifyStatus(410)).toBe("gone");
    expect(classifyStatus(422)).toBe("invalid");
  });

  it("refuses to call anything while not configured", async () => {
    const calls = mockFetch(200, { ok: true });
    const result = await foodhubRequest("/api/foodhub/customers/me", { method: "GET" });
    expect(result).toMatchObject({ ok: false, kind: "not_configured" });
    expect(calls).toHaveLength(0);
  });

  it("sends the bearer secret and the customer token headers, and reports a network failure as unreachable", async () => {
    configure();
    const calls = mockFetch(200, { ok: true });
    await foodhubRequest("/api/foodhub/customers/me", { method: "GET", customerToken: TOKEN });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(calls[0]!.url).toBe("https://foodhub.test/api/foodhub/customers/me");
    expect(headers["authorization"]).toBe(`Bearer ${SECRET}`);
    expect(headers["x-customer-token"]).toBe(TOKEN);
    expect(headers["x-customer-tenant"]).toBe("pppmtl");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("fetch failed"))),
    );
    const down = await foodhubRequest("/api/foodhub/customers/me", { method: "GET" });
    expect(down).toMatchObject({ ok: false, kind: "unreachable" });
  });
});

describe("Interac order adapter -> Food Hub website-order", () => {
  const context = (over: Record<string, unknown> = {}) => ({
    orderId: "ord_test1",
    items,
    customerToken: TOKEN,
    lang: "fr" as const,
    displayedTotalCents: 4252,
    ...over,
  });

  it("is configured only with URL + secret + switch + verified store code", () => {
    expect(foodhubInteracSubmitAdapter.isConfigured(ndg.id)).toBe(false);
    configure();
    expect(foodhubInteracSubmitAdapter.isConfigured(ndg.id)).toBe(true);
    expect(foodhubInteracSubmitAdapter.isConfigured("loc-chambly")).toBe(false);
  });

  it("POSTs the contract payload and returns a held order with instructions", async () => {
    configure();
    const calls = mockFetch(200, heldResponse);
    const result = await foodhubInteracSubmitAdapter.createOrder(
      draft(),
      "NDG_MAIN",
      "key",
      context(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      providerOrderId: "dir_abc",
      orderNumber: "PPP-1A2B3",
      providerStatus: "awaiting_payment",
      status: "SUBMITTED",
      subtotal: 3198,
      tax: 554,
      total: 4252,
      fees: [{ code: "interac", amount: 500 }],
    });
    expect(result.data.interac?.recipient).toBe("paiements@example-ppp.test");
    expect(result.data).not.toHaveProperty("paymentUrl");

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`https://foodhub.test${FOODHUB_WEBSITE_ORDER_PATH}`);
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["authorization"]).toBe(`Bearer ${SECRET}`);
    expect(headers["x-customer-token"]).toBeUndefined();
    const body = JSON.parse(String(calls[0]!.init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      id: "ord_test1",
      brand: "PPP Pizzeria",
      location: "NDG_MAIN",
      fulfillment: "pickup",
      payment: "interac",
      paid: false,
      fees: [{ code: "interac", name: "Frais Interac e-Transfer", amount: 5 }],
      total: 42.52,
      customerToken: TOKEN,
      customer: { name: "Mathieu", phone: "5145550000", lang: "fr" },
    });
    expect((body["items"] as Array<Record<string, unknown>>)[0]).toMatchObject({
      ref: "CLV-PEP",
      quantity: 2,
      price: 12.99,
    });
  });

  it("refuses to send a total other than the one displayed, without calling Food Hub", async () => {
    configure();
    const calls = mockFetch(200, heldResponse);
    const result = await foodhubInteracSubmitAdapter.createOrder(
      draft(),
      "NDG_MAIN",
      "key",
      context({ displayedTotalCents: 3000 }),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "price_changed" } });
    expect(calls).toHaveLength(0);
    expect(recentIntegrationEvents().map((e) => e.eventType)).toContain("interac.total_mismatch");
  });

  it("tells the truth when Food Hub refuses, is not deployed, or is down", async () => {
    configure();
    mockFetch(422, { ok: false, error: "Interac fee mismatch (expected 5.00)." });
    expect(
      await foodhubInteracSubmitAdapter.createOrder(draft(), "NDG_MAIN", "key", context()),
    ).toMatchObject({ ok: false, error: { code: "price_changed" } });

    mockFetch(422, { ok: false, error: 'Unknown location "NDG_MAIN".' });
    expect(
      await foodhubInteracSubmitAdapter.createOrder(draft(), "NDG_MAIN", "key", context()),
    ).toMatchObject({ ok: false, error: { code: "menu_changed" } });

    mockFetch(404, null);
    expect(
      await foodhubInteracSubmitAdapter.createOrder(draft(), "NDG_MAIN", "key", context()),
    ).toMatchObject({ ok: false, error: { code: "interac_unavailable" } });

    mockFetch(503, { ok: false, error: "Own orders are turned off." });
    expect(
      await foodhubInteracSubmitAdapter.createOrder(draft(), "NDG_MAIN", "key", context()),
    ).toMatchObject({ ok: false, error: { code: "interac_unavailable" } });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("fetch failed"))),
    );
    expect(
      await foodhubInteracSubmitAdapter.createOrder(draft(), "NDG_MAIN", "key", context()),
    ).toMatchObject({ ok: false, error: { code: "timeout" } });
  });

  it("never reports success on a 200 without Interac instructions (old Food Hub), and logs it loudly", async () => {
    configure();
    mockFetch(200, { ok: true, number: "PPP-1", id: "dir_1", total: 42.52 });
    const result = await foodhubInteracSubmitAdapter.createOrder(
      draft(),
      "NDG_MAIN",
      "key",
      context(),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "interac_unavailable" } });
    expect(recentIntegrationEvents().map((e) => e.eventType)).toContain(
      "interac.instructions_missing",
    );
  });

  it("does not POST while the owner switch is off", async () => {
    configure(false);
    const calls = mockFetch(200, heldResponse);
    const result = await foodhubInteracSubmitAdapter.createOrder(
      draft(),
      "NDG_MAIN",
      "key",
      context(),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "interac_unavailable" } });
    expect(calls).toHaveLength(0);
  });
});
