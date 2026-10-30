import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { menuItems } from "@/data/menu";
import { restaurantLocations } from "@/config/locations";
import { checkSelections, groupMin } from "@/lib/modifiers";
import { mappingForLocation } from "@/config/integration-locations";
import { cloverModifierFor } from "@/data/clover/overlay";
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

const quoteFor = (price: number, quantity: number) =>
  interacQuote({
    subtotalCents: Math.round(price * 100) * quantity,
    interacFeeCents: 500,
    deliveryFeeCents: 0,
  });

const cloverServes = (locationId: string) =>
  mappingForLocation(locationId)?.orderingProvider === "clover";

/** A real menu line with one PAID option and every required group filled, plus the Clover modifier behind it. */
function paidOptionLine() {
  for (const item of menuItems) {
    if (!item.isAvailable || item.price === null || !item.locationIds.length) continue;
    const groups = item.modifierGroups ?? [];
    const paidGroup = groups.find((g) => g.choices.some((c) => (c.priceDelta ?? 0) > 0));
    const paid = paidGroup?.choices.find((c) => (c.priceDelta ?? 0) > 0);
    if (!paidGroup || !paid) continue;
    const cloverModifier = cloverModifierFor(paidGroup.id, paid.id);
    if (!cloverModifier?.id) continue;
    const selections: Record<string, string> = {};
    for (const group of groups) {
      if (group.id === paidGroup.id) continue;
      const need = groupMin(group);
      if (need > 0)
        selections[group.id] = group.choices
          .slice(0, need)
          .map((c) => c.id)
          .join(",");
    }
    const needPaid = groupMin(paidGroup);
    const others = paidGroup.choices
      .filter((c) => c.id !== paid.id)
      .slice(0, Math.max(0, needPaid - 1));
    selections[paidGroup.id] = [paid.id, ...others.map((c) => c.id)].join(",");
    if (!checkSelections(groups, selections).ok) continue;
    return { itemId: item.id, locationId: item.locationIds[0]!, selections, cloverModifier };
  }
  throw new Error("no menu item with a paid option");
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

  it("after a timeout the retry resends the SAME order id, so Food Hub answers duplicate instead of a second order", async () => {
    configure();
    const total = quoteFor(product.price!, 2).totalCents;
    const posted: string[] = [];
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL, init: RequestInit = {}) => {
        posted.push(String((JSON.parse(String(init.body)) as { id: string }).id));
        call += 1;
        // Food Hub created and texted order #1 but the answer never came back.
        if (call === 1) throw new DOMException("The operation was aborted.", "AbortError");
        return new Response(JSON.stringify({ ...heldResponse(total / 100), duplicate: true }), {
          status: 200,
        });
      }),
    );

    const first = createOrder(request(), "browser-nonce");
    if (!first.ok) throw new Error("create failed");
    const firstSubmit = await submitOrder(first.data.id, { displayedTotalCents: total });
    expect(firstSubmit).toMatchObject({ ok: false, error: { code: "submit_unconfirmed" } });

    const retry = createOrder(request(), "browser-nonce");
    if (!retry.ok) throw new Error("create failed");
    expect(retry.data.id).toBe(first.data.id);
    expect(retry.data.status).toBe("CREATED");
    const secondSubmit = await submitOrder(retry.data.id, { displayedTotalCents: total });
    expect(secondSubmit.ok).toBe(true);
    if (!secondSubmit.ok) return;
    expect(secondSubmit.data).toMatchObject({ status: "SUBMITTED", failureCode: null });
    expect(posted).toHaveLength(2);
    expect(posted[1]).toBe(posted[0]);
  });

  it("keeps the same order id when the retry crosses the 5-minute idempotency bucket", async () => {
    configure();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-30T16:04:59.000Z"));
      const total = quoteFor(product.price!, 2).totalCents;
      mockFetch(502, { ok: false, error: "Bad gateway" });
      const first = createOrder(request(), "browser-nonce");
      if (!first.ok) throw new Error("create failed");
      const failed = await submitOrder(first.data.id, { displayedTotalCents: total });
      expect(failed).toMatchObject({ ok: false, error: { code: "submit_unconfirmed" } });

      vi.setSystemTime(new Date("2026-10-30T16:05:20.000Z"));
      const retry = createOrder(request(), "browser-nonce");
      expect(retry.ok && retry.data.id).toBe(first.data.id);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a 200 without Interac instructions keeps the order id: the retry cannot create a second order", async () => {
    configure();
    const total = quoteFor(product.price!, 2).totalCents;
    mockFetch(200, { ok: true, number: "W-1", id: "dir_old", total: total / 100 });
    const first = createOrder(request(), "browser-nonce");
    if (!first.ok) throw new Error("create failed");
    const submitted = await submitOrder(first.data.id, { displayedTotalCents: total });
    expect(submitted).toMatchObject({ ok: false, error: { code: "interac_unavailable" } });
    const retry = createOrder(request(), "browser-nonce");
    expect(retry.ok && retry.data.id).toBe(first.data.id);
  });

  it("two concurrent submits of the same order make ONE Food Hub call", async () => {
    configure();
    const total = quoteFor(product.price!, 2).totalCents;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn(async () => {
      await gate;
      return new Response(JSON.stringify(heldResponse(total / 100)), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const created = createOrder(request(), "browser-nonce");
    if (!created.ok) throw new Error("create failed");
    const tabA = submitOrder(created.data.id, { displayedTotalCents: total });
    const second = createOrder(request(), "browser-nonce");
    if (!second.ok) throw new Error("create failed");
    const tabB = submitOrder(second.data.id, { displayedTotalCents: total });
    release();
    const [a, b] = await Promise.all([tabA, tabB]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.ok && b.ok).toBe(true);
    expect(a.ok && b.ok && a.data.id === b.data.id).toBe(true);
  });

  it("a definite Food Hub refusal frees the cart, and 'Interac is off' is worded as unavailable", async () => {
    configure();
    const total = quoteFor(product.price!, 2).totalCents;
    mockFetch(422, {
      ok: false,
      error:
        "Interac e-Transfer is turned off in Food Hub (Settings → Expansion → Delivery → Paiements).",
    });
    const first = createOrder(request(), "browser-nonce");
    if (!first.ok) throw new Error("create failed");
    const submitted = await submitOrder(first.data.id, { displayedTotalCents: total });
    expect(submitted).toMatchObject({ ok: false, error: { code: "interac_unavailable" } });
    const retry = createOrder(request(), "browser-nonce");
    expect(retry.ok && retry.data.id).not.toBe(first.data.id);
  });

  it("sends each paid option with its Clover modifier id and Clover name, as Food Hub re-prices it", async () => {
    configure();
    const picked = paidOptionLine();
    vi.stubEnv(
      "FOODHUB_LOCATION_CODES",
      JSON.stringify({ [slugOf(picked.locationId)]: "TEST_STORE" }),
    );
    const order = createOrder(
      request({
        locationId: picked.locationId,
        lines: [{ itemId: picked.itemId, quantity: 1, notes: "", selections: picked.selections }],
      }),
      "browser-nonce",
    );
    if (!order.ok) throw new Error(`create failed: ${order.error.code}`);
    const paid = order.data.items[0]!.modifiers.find((m) => (m.priceDelta ?? 0) > 0)!;
    expect(paid.providerModifierId).toBe(picked.cloverModifier.id);
    expect(paid.providerName).toBe(picked.cloverModifier.name);

    const total = interacQuote({
      subtotalCents: order.data.subtotal,
      interacFeeCents: 500,
      deliveryFeeCents: 0,
    }).totalCents;
    const calls = mockFetch(200, heldResponse(total / 100));
    const submitted = await submitOrder(order.data.id, { displayedTotalCents: total });
    expect(submitted.ok).toBe(true);
    const body = JSON.parse(String(calls[0]!.init.body)) as {
      items: Array<{ ref: string; options?: Array<{ ref?: string; name: string; price: number }> }>;
    };
    expect(body.items[0]!.options).toContainEqual({
      ref: picked.cloverModifier.id,
      name: picked.cloverModifier.name,
      price: picked.cloverModifier.price / 100,
    });
  });

  it("a cancelled card checkout never answers an Interac request for the same cart", () => {
    const cloverLocation = restaurantLocations.find(
      (l) =>
        menuItems.some(
          (i) =>
            i.isAvailable &&
            i.price !== null &&
            i.locationIds.includes(l.id) &&
            !i.modifierGroups?.some((g) => groupMin(g) > 0),
        ) &&
        l.slug &&
        cloverServes(l.id),
    )!;
    const item = menuItems.find(
      (i) =>
        i.isAvailable &&
        i.price !== null &&
        i.locationIds.includes(cloverLocation.id) &&
        !i.modifierGroups?.some((g) => groupMin(g) > 0),
    )!;
    configure();
    vi.stubEnv("FOODHUB_LOCATION_CODES", JSON.stringify({ [cloverLocation.slug]: "TEST_STORE" }));
    vi.stubEnv("CLOVER_ENV", "sandbox");
    vi.stubEnv("CLOVER_MERCHANT_ID", "merchant-for-test");
    vi.stubEnv("CLOVER_ECOMM_PRIVATE_KEY", "checkout-for-test");
    vi.stubEnv("CLOVER_WEBHOOK_SECRET", "webhook-for-test");
    const lines = [{ itemId: item.id, quantity: 1, notes: "", selections: {} }];
    const card = createOrder(
      request({ locationId: cloverLocation.id, lines, payment: "card" }),
      "nonce",
    );
    const interac = createOrder(request({ locationId: cloverLocation.id, lines }), "nonce");
    const cardAgain = createOrder(
      request({ locationId: cloverLocation.id, lines, payment: "card" }),
      "nonce",
    );
    if (!card.ok || !interac.ok || !cardAgain.ok) throw new Error("create failed");
    expect(card.data.provider).toBe("clover");
    expect(interac.data).toMatchObject({ provider: "foodhub", paymentMethod: "interac" });
    expect(interac.data.id).not.toBe(card.data.id);
    // The card double-submit protection still holds.
    expect(cardAgain.data.id).toBe(card.data.id);
  });

  it("card orders carry no Interac fee and ignore Food Hub entirely", () => {
    const report = validateOrder(request({ payment: "card" }));
    // Clover is not configured in tests: the card path answers with its own reason, never an Interac one.
    expect(report.errors.map((e) => e.code)).not.toContain("interac_unavailable");
  });
});
