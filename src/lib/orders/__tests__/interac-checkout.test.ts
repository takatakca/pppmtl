import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { menuItems } from "@/data/menu";
import { restaurantLocations } from "@/config/locations";
import { groupMin } from "@/lib/modifiers";
import { resetIntegrationLogForTests } from "@/lib/integration/core/logging";
import { createOrder, submitOrder, validateOrder, type CheckoutRequest } from "../order-service";
import { resetIdempotencyForTests } from "../idempotency";
import { resetOrderStoreForTests } from "../order-store.server";
import { interacQuote } from "@/lib/integration/providers/foodhub/interac";

const SECRET = "test-secret-0123456789abcdef";
const TOKEN = `cust.c1.pppmtl.1900000000.1.${"a".repeat(43)}`;

/** A real catalog item: available, priced, no required option — so the server can price it. */
const product = menuItems.find(
  (candidate) =>
    candidate.isAvailable &&
    candidate.price !== null &&
    candidate.locationIds.length > 0 &&
    !candidate.modifierGroups?.some((group) => groupMin(group) > 0),
)!;

const request = (over: Partial<CheckoutRequest> = {}): CheckoutRequest => ({
  locationId: product.locationIds[0]!,
  orderType: "PICKUP",
  lines: [{ itemId: product.id, quantity: 2, notes: "", selections: {} }],
  customer: {
    customerId: null,
    takatakCustomerId: null,
    name: "Mathieu",
    phone: "5145550000",
    email: null,
    isGuest: true,
  },
  deliveryAddress: null,
  notes: "",
  payment: "interac",
  ...over,
});

const heldResponse = (total: number) => ({
  ok: true,
  number: "PPP-HELD1",
  id: "dir_held1",
  total,
  interac: {
    recipient: "paiements@example-ppp.test",
    amount: total,
    reference: "PPP-HELD1",
    autoDeposit: true,
    expiresAt: "2026-10-30T20:00:00.000Z",
    instructionsFr: "Envoyez le virement.",
    instructionsEn: "Send the transfer.",
  },
});

function mockFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return calls;
}

function configure() {
  vi.stubEnv("FOODHUB_URL", "https://foodhub.test");
  vi.stubEnv("FOODHUB_WEBSITE_ORDER_SECRET", SECRET);
  vi.stubEnv("FOODHUB_INTERAC_ENABLED", "true");
  vi.stubEnv(
    "FOODHUB_LOCATION_CODES",
    JSON.stringify({ [slugOf(product.locationIds[0]!)]: "TEST_STORE" }),
  );
  vi.stubEnv("DATABASE_URL", "");
}

/** The catalog's first location for this product; its slug is what FOODHUB_LOCATION_CODES keys on. */
function slugOf(locationId: string): string {
  return restaurantLocations.find((l) => l.id === locationId)?.slug ?? "";
}

beforeEach(() => {
  resetOrderStoreForTests();
  resetIdempotencyForTests();
  resetIntegrationLogForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Interac e-Transfer at checkout", () => {
  it("is refused truthfully while Food Hub is not configured, without touching the card path", () => {
    const report = validateOrder(request());
    expect(report.valid).toBe(false);
    expect(report.errors.map((e) => e.code)).toContain("interac_unavailable");
    expect(report.errors.map((e) => e.code)).not.toContain("location_not_mapped");
  });

  it("keeps delivery closed until the owner sets a delivery fee", () => {
    configure();
    const report = validateOrder(
      request({ orderType: "DELIVERY", deliveryAddress: "1 Rue Test, Montréal, QC, H1H 1H1" }),
    );
    expect(report.errors.map((e) => e.code)).toContain("interac_delivery_unavailable");
  });

  it("rejects a payment choice that is not a choice", () => {
    configure();
    const report = validateOrder({ ...request(), payment: "cash" as unknown as "card" });
    expect(report.valid).toBe(false);
    expect(report.errors[0]?.code).toBe("menu_changed");
  });

  it("creates an unpaid Food Hub order, POSTs the displayed total and holds the instructions", async () => {
    configure();
    const subtotalCents = Math.round(product.price! * 100) * 2;
    const quote = interacQuote({
      subtotalCents,
      interacFeeCents: 500,
      feeTaxable: true,
      deliveryFeeCents: 0,
    });
    const created = createOrder(request(), "browser-nonce");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data).toMatchObject({
      provider: "foodhub",
      providerLocationId: "TEST_STORE",
      paymentStatus: "UNPAID",
      paymentMethod: "interac",
      status: "CREATED",
      subtotal: subtotalCents,
    });

    const calls = mockFetch(200, heldResponse(quote.totalCents / 100));
    const submitted = await submitOrder(created.data.id, {
      customerToken: TOKEN,
      lang: "fr",
      displayedTotalCents: quote.totalCents,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.data).toMatchObject({
      status: "SUBMITTED",
      providerStatus: "awaiting_payment",
      providerOrderId: "dir_held1",
      orderNumber: "PPP-HELD1",
      paymentStatus: "UNPAID",
      tax: quote.taxCents,
      total: quote.totalCents,
      fees: [{ code: "interac", name: "Frais Interac e-Transfer", amount: 500 }],
    });
    expect(submitted.data.interac?.reference).toBe("PPP-HELD1");
    expect(submitted.data.paymentUrl).toBeUndefined();

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://foodhub.test/api/foodhub/webhooks/website-order");
    const body = JSON.parse(String(calls[0]!.init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      id: created.data.id,
      location: "TEST_STORE",
      payment: "interac",
      paid: false,
      total: quote.totalCents / 100,
      customerToken: TOKEN,
      fees: [{ code: "interac", amount: 5 }],
    });
    // The token travels in the body for the order link only, never on the stored order.
    expect(JSON.stringify(submitted.data)).not.toContain(TOKEN);
  });

  it("fails the order and frees the cart when the displayed total no longer matches, without calling Food Hub", async () => {
    configure();
    const created = createOrder(request(), "browser-nonce");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const calls = mockFetch(200, heldResponse(10));
    const submitted = await submitOrder(created.data.id, { displayedTotalCents: 100 });
    expect(submitted).toMatchObject({ ok: false, error: { code: "price_changed" } });
    expect(calls).toHaveLength(0);
  });

  it("card orders carry no Interac fee and ignore Food Hub entirely", () => {
    const report = validateOrder(request({ payment: "card" }));
    // Clover is not configured in tests: the card path answers with its own reason, never an Interac one.
    expect(report.errors.map((e) => e.code)).not.toContain("interac_unavailable");
  });
});
