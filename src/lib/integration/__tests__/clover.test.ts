import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cloverItemMap } from "@/config/clover-item-map";
import { generatedItems } from "@/data/catalog.generated";
import { menuItems } from "@/data/menu";
import { cloverSlotFor, cloverSnapshot } from "@/data/clover/overlay";
import { cloverPhotoIds } from "@/data/clover/photos.generated";
import {
  displayGroupName,
  INTERNAL_CATEGORY,
  normalizeCloverInventory,
  siteSlug,
} from "@/lib/integration/providers/clover/catalog";
import {
  buildHostedCheckoutRequest,
  isWebsiteTitled,
  parseHostedCheckoutEvent,
  priceCloverCart,
  QUEBEC_TAX_RATES,
  taxesFor,
  verifyCloverSignature,
  websiteOrderTitle,
} from "@/lib/integration/providers/clover/checkout";
import { cloverInventoryToUniversalMenu } from "@/lib/integration/providers/clover/menu";
import { siteGroupsFor } from "@/lib/integration/providers/clover/site-groups";
import {
  checkSelections,
  defaultSelections,
  keepKnownSelections,
  optionsTotal,
  toggleChoice,
  type LineSelections,
} from "@/lib/modifiers";
import { unitPriceFor } from "@/lib/cart";
import { resetWebhookReplayForTests } from "@/lib/integration/core/webhook-security";
import { resetOrderStoreForTests } from "@/lib/orders/order-store.server";
import { resetIdempotencyForTests } from "@/lib/orders/idempotency";
import type { ModifierGroup } from "@/data/catalog-types";

const PITA = "pita-wrap-mixte-shish-taouk-shawarma";
const pita = () => menuItems.find((i) => i.id === PITA)!;
const group = (label: RegExp) => pita().modifierGroups!.find((g) => label.test(g.labelFr))!;

const choice = (g: ModifierGroup, label: RegExp) =>
  g.choices.find((c) => label.test(c.labelFr))!.id;

/** The pita, as a customer orders it: pita, garlic sauce, in a combo with fries + Pepsi. */
function pitaCombo(): LineSelections {
  let s = defaultSelections(pita().modifierGroups!);
  s = toggleChoice(s, group(/^Choix pita/), choice(group(/^Choix pita/), /^pita$/i));
  s = toggleChoice(s, group(/^Sauce incluse/), choice(group(/^Sauce incluse/), /ail/i));
  s = toggleChoice(s, group(/^Trio/), choice(group(/^Trio/), /^frites \+ pepsi$/i));
  return s;
}

describe("site slot -> Clover item map", () => {
  it("maps every site item to exactly one existing Clover item (none flagged)", () => {
    const sites = cloverItemMap.map((s) => s.site);
    const clovers = cloverItemMap.map((s) => s.clover);
    expect(new Set(sites).size).toBe(sites.length);
    expect(new Set(clovers).size).toBe(clovers.length);
    const unmapped = generatedItems.filter((i) => !sites.includes(i.id)).map((i) => i.id);
    expect(unmapped).toEqual([]);
    const byId = new Map(cloverSnapshot.items.map((i) => [i.id, i]));
    for (const slot of cloverItemMap) {
      expect(byId.get(slot.clover)?.name, slot.site).toBe(slot.cloverName);
    }
    expect(cloverItemMap).toHaveLength(generatedItems.length);
  });

  it("gives every site item its real Clover price, options and (when there is one) photo", () => {
    for (const item of menuItems) {
      const clover = cloverSnapshot.items.find((c) => c.id === cloverSlotFor(item.id))!;
      expect(item.cloverItemId).toBe(clover.id);
      expect(item.price).toBe(clover.price / 100);
      expect(item.compareAtPrice).toBeNull();
      expect(item.modifierGroups?.length).toBe(siteGroupsFor(cloverSnapshot, clover.id).length);
      if (cloverPhotoIds.includes(clover.id)) {
        expect(item.image).toBe(`/menu/clover/${clover.id}-1200.webp`);
      }
    }
    expect(cloverPhotoIds.length).toBeGreaterThanOrEqual(160);
  });

  it("keeps the site's ids stable (the site's slug rule, 52 characters at most)", () => {
    expect(siteSlug("Sous-marin Steak")).toBe("sous-marin-steak");
    expect(siteSlug("Quesadillas Bœuf")).toBe("quesadillas-buf");
    expect(siteSlug("Trio #2 — Cheeseburger + 6 ailes de poulet + boisson gazeuse")).toBe(
      "trio-2-cheeseburger-6-ailes-de-poulet-boisson-gazeus",
    );
    // Four names were corrected to Clover's spelling; their ids (links) were kept on purpose.
    const corrected = [
      "tacos-boeuf-viande-hache",
      "tacos-haricots-noir",
      "1-ail-de-poulet",
      "salade-de-choux",
    ];
    const drift = generatedItems.filter(
      (i) => !corrected.includes(i.id) && siteSlug(i.nameFr) !== i.id,
    );
    expect(drift.map((i) => i.id)).toEqual([]);
  });
});

describe("Clover inventory rules", () => {
  it("never lets a staff-only, in-store or archived category into the snapshot", () => {
    expect(cloverSnapshot.categories.some((c) => INTERNAL_CATEGORY.test(c.name))).toBe(false);
    expect(cloverSnapshot.items).toHaveLength(175);
    expect(cloverSnapshot.categories).toHaveLength(17);
  });

  it("leaves out hidden, staff, promo-only, archived and variable-price items; keeps 86'd ones flagged", () => {
    const cat = (id: string, name: string) => ({ id, name, sortOrder: 1 });
    const item = (id: string, cats: Array<{ id: string; name: string }>, extra = {}) => ({
      id,
      name: id,
      price: 1000,
      categories: { elements: cats },
      modifierGroups: { elements: [{ id: "G1" }] },
      ...extra,
    });
    const inv = normalizeCloverInventory(
      {
        categories: [
          cat("C1", "Pizza"),
          cat("C2", "Menu Employés"),
          cat("C3", "INSTORE PROMOTIONS"),
          cat("C4", "ARCHIVE · Pizza"),
        ],
        items: [
          item("OK", [cat("C1", "Pizza")]),
          item("EIGHTY_SIXED", [cat("C1", "Pizza")], { available: false }),
          item("HIDDEN", [cat("C1", "Pizza")], { hidden: true }),
          item("STAFF", [cat("C1", "Pizza"), cat("C2", "Menu Employés")]),
          item("INSTORE", [cat("C3", "INSTORE PROMOTIONS")]),
          item("ARCHIVED", [cat("C4", "ARCHIVE · Pizza")]),
          item("BY_WEIGHT", [cat("C1", "Pizza")], { priceType: "PER_UNIT" }),
        ],
        modifierGroups: [
          {
            id: "G1",
            name: "Sauce",
            minRequired: 1,
            maxAllowed: 0,
            modifiers: {
              elements: [
                { id: "M1", name: "Ail", price: 0 },
                { id: "M2", name: "BBQ", price: 50 },
              ],
            },
          },
        ],
      },
      { source: "test", now: "2026-10-08T00:00:00.000Z" },
    );
    expect(inv.items.map((i) => i.id)).toEqual(["OK", "EIGHTY_SIXED"]);
    expect(inv.items[1]!.available).toBe(false);
    expect(inv.categories.map((c) => c.name)).toEqual(["Pizza"]);
    // No maximum in Clover = every option may be chosen.
    expect(inv.modifierGroups[0]).toMatchObject({ min: 1, max: 2 });
    expect(inv.modifierGroups[0]!.modifiers.map((m) => m.slug)).toEqual(["ail", "bbq"]);
  });

  it("shows customers plain group names, not Clover's staff hints", () => {
    expect(displayGroupName("SAUCE INCLUS (ASSIETTE+PITA)")).toBe("Sauce incluse");
    expect(displayGroupName("Extra Fromage Pizza #1 (+4.16 $)")).toBe("Extra Fromage Pizza");
    expect(displayGroupName("(Mex) Extra Sauces")).toBe("Extra Sauces");
    expect(displayGroupName("Choix (PITA/WRAP)")).toBe("Choix pita / wrap");
  });
});

describe("options (modifiers) nested in each item", () => {
  it("puts the pita's real Clover groups in the item, required first, suggestions last", () => {
    const groups = pita().modifierGroups!;
    expect(groups.slice(0, 3).every((g) => g.required)).toBe(true);
    expect(groups.at(-1)!.labelFr).toMatch(/sugg/i);
    const trio = group(/^Trio/);
    expect(trio).toMatchObject({ required: false, min: 0, max: 1 });
    expect(trio.choices.find((c) => c.id === "frites-pepsi")?.priceDelta).toBe(5.42);
    expect(group(/^Choix pita/)).toMatchObject({ required: true, min: 1, max: 1 });
  });

  it("enforces minimum, maximum and known options, and prices them", () => {
    const groups = pita().modifierGroups!;
    // The pita's only-one-choice group is chosen for the customer.
    const start = defaultSelections(groups);
    expect(Object.keys(start)).toHaveLength(1);
    expect(checkSelections(groups, start).missing.map((g) => g.labelFr)).toEqual([
      "Choix pita / wrap",
      "Sauce incluse",
    ]);
    const full = pitaCombo();
    expect(checkSelections(groups, full).ok).toBe(true);
    expect(optionsTotal(groups, full)).toBe(5.42);
    expect(unitPriceFor(pita(), full)).toBe(13.91);
    expect(checkSelections(groups, { ...full, nope: "x" }).unknown).toEqual(["nope"]);
  });

  it("swaps one-choice groups, toggles several-choice groups up to their maximum", () => {
    const single: ModifierGroup = {
      id: "S",
      labelEn: "S",
      labelFr: "S",
      required: true,
      min: 1,
      max: 1,
      choices: ["a", "b"].map((id) => ({ id, labelEn: id, labelFr: id, priceDelta: 0 })),
    };
    const multi: ModifierGroup = {
      ...single,
      id: "M",
      required: false,
      min: 0,
      max: 2,
      choices: [...single.choices, { id: "c", labelEn: "c", labelFr: "c", priceDelta: 1 }],
    };
    let s = toggleChoice({}, single, "a");
    s = toggleChoice(s, single, "b");
    expect(s["S"]).toBe("b");
    expect(toggleChoice(s, single, "b")["S"]).toBe("b"); // a required single choice cannot be emptied
    s = toggleChoice(s, multi, "a");
    s = toggleChoice(s, multi, "c");
    expect(toggleChoice(s, multi, "b")["M"]).toBe("a,c"); // a third one is refused
    expect(toggleChoice(s, multi, "a")["M"]).toBe("c");
    expect(keepKnownSelections([single, multi], { S: "zzz", M: "a,c,b" })).toEqual({ M: "a,c" });
  });
});

describe("cart -> Clover Hosted Checkout", () => {
  it("prices every line from Clover, never from the browser", () => {
    const priced = priceCloverCart(
      [{ siteItemId: PITA, quantity: 2, notes: "sans oignon", selections: pitaCombo() }],
      cloverSnapshot,
      cloverSlotFor,
    );
    expect(priced.ok).toBe(true);
    if (!priced.ok) return;
    expect(priced.lines[0]).toMatchObject({
      cloverItemId: "MKHYNCFYDQXQY",
      basePrice: 849,
      unitPrice: 1391,
      quantity: 2,
    });
    expect(priced.subtotal).toBe(2782);
  });

  it("refuses a missing required option, an unknown item and an 86'd item", () => {
    const missing = priceCloverCart(
      [{ siteItemId: PITA, quantity: 1, notes: "", selections: {} }],
      cloverSnapshot,
      cloverSlotFor,
    );
    expect(missing).toMatchObject({ ok: false, code: "menu_changed" });
    const unknown = priceCloverCart(
      [{ siteItemId: "not-on-the-menu", quantity: 1, notes: "", selections: {} }],
      cloverSnapshot,
      cloverSlotFor,
    );
    expect(unknown).toMatchObject({ ok: false, code: "menu_changed" });
    const soldOut = {
      ...cloverSnapshot,
      items: cloverSnapshot.items.map((i) =>
        i.id === "MKHYNCFYDQXQY" ? { ...i, available: false } : i,
      ),
    };
    const out = priceCloverCart(
      [{ siteItemId: PITA, quantity: 1, notes: "", selections: pitaCombo() }],
      soldOut,
      cloverSlotFor,
    );
    expect(out).toMatchObject({ ok: false, code: "item_unavailable" });
  });

  it("builds Clover's checkout body: one line per cart line, options in the note, taxes, return links", () => {
    const priced = priceCloverCart(
      [{ siteItemId: PITA, quantity: 1, notes: "sans oignon", selections: pitaCombo() }],
      cloverSnapshot,
      cloverSlotFor,
    );
    if (!priced.ok) throw new Error("not priced");
    const body = buildHostedCheckoutRequest({
      lines: priced.lines,
      customer: { name: "Marie Tremblay", phone: "+1 (514) 555-0100", email: null },
      taxRates: QUEBEC_TAX_RATES,
      urls: {
        success: "https://pppmtl.com/orders/ord_1?paid=1",
        failure: "https://pppmtl.com/checkout?payment=failed",
        cancel: "https://pppmtl.com/checkout?payment=cancelled",
      },
    });
    expect(body.customer).toEqual({
      firstName: "Marie",
      lastName: "Tremblay",
      phoneNumber: "5145550100",
    });
    expect(body.redirectUrls.success).toBe("https://pppmtl.com/orders/ord_1?paid=1");
    const line = body.shoppingCart.lineItems[0]!;
    expect(line).toMatchObject({
      name: "Pita / Wrap Mixte — Shish Taouk & Shawarma",
      price: 1391,
      unitQty: 1,
      itemRefUuid: "MKHYNCFYDQXQY",
      taxRates: [
        { name: "TPS", rate: 500000 },
        { name: "TVQ", rate: 997500 },
      ],
    });
    expect(line.note).toContain("Frites + Pepsi");
    expect(line.note).toContain("Note: sans oignon");
    expect(taxesFor(1000, QUEBEC_TAX_RATES)).toBe(150);
  });
});

describe("Clover webhook", () => {
  const secret = "whsec_test";
  const sign = (body: string, t: number) =>
    `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
  const body = JSON.stringify({
    createdTime: 1,
    message: "Approved for 1391",
    status: "APPROVED",
    type: "PAYMENT",
    id: "PAY1",
    merchantId: "M",
    data: "SESSION1",
  });

  it("checks Clover-Signature (t + v1) and its time window", () => {
    const now = 1_760_000_000_000;
    const t = Math.floor(now / 1000);
    expect(verifyCloverSignature(body, sign(body, t), secret, now)).toBe("ok");
    expect(verifyCloverSignature(`${body} `, sign(body, t), secret, now)).toBe("invalid_signature");
    expect(verifyCloverSignature(body, sign(body, t - 3600), secret, now)).toBe("stale_timestamp");
    expect(verifyCloverSignature(body, null, secret, now)).toBe("missing_signature");
    expect(verifyCloverSignature(body, sign(body, t), undefined, now)).toBe("missing_secret");
  });

  it("reads the payment id and the checkout session", () => {
    expect(parseHostedCheckoutEvent(body)).toMatchObject({
      status: "APPROVED",
      paymentId: "PAY1",
      checkoutSessionId: "SESSION1",
    });
    expect(parseHostedCheckoutEvent("not json")).toBeNull();
  });

  it("titles the order so the Food Hub kitchen tablet knows it is a website order", () => {
    const title = websiteOrderTitle("PPP-ABC12", "Marie");
    expect(title).toBe("🌐 Site web · PPP-ABC12 · Marie");
    expect(isWebsiteTitled(title)).toBe(true);
  });
});

describe("universal menu from Clover", () => {
  it("lists categories in Clover's order with the options nested in each product", () => {
    const menu = cloverInventoryToUniversalMenu(
      cloverSnapshot,
      "loc-ndg-somerled",
      (id) => cloverItemMap.find((s) => s.clover === id)?.site,
    );
    const orders = menu.categories.map((c) => c.sortOrder);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    const p = menu.products.find((x) => x.id === PITA)!;
    expect(p.externalId).toBe("MKHYNCFYDQXQY");
    expect(p.price).toBe(849);
    expect(p.modifierGroups.find((g) => g.nameFr.startsWith("Trio"))?.choices[0]?.priceDelta).toBe(
      542,
    );
  });
});

describe("order -> Clover Hosted Checkout -> webhook (fetch mocked)", () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  let printed = 0;
  let title = "";

  beforeEach(() => {
    resetOrderStoreForTests();
    resetIdempotencyForTests();
    resetWebhookReplayForTests();
    calls.length = 0;
    printed = 0;
    title = "";
    // Live checkout must never be enabled with the non-durable in-memory store.
    // These mocked Clover network tests exercise only the sandbox contract.
    vi.stubEnv("CLOVER_ENV", "sandbox");
    vi.stubEnv("CLOVER_MERCHANT_ID", "MTEST");
    vi.stubEnv("CLOVER_ECOMM_PRIVATE_KEY", "priv_test");
    vi.stubEnv("CLOVER_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("CLOVER_API_TOKEN", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        const u = String(url);
        const json = (status: number, data: unknown) =>
          new Response(JSON.stringify(data), {
            status,
            headers: { "content-type": "application/json" },
          });
        if (u.includes("/invoicingcheckoutservice/v1/checkouts")) {
          return json(200, {
            href: "https://checkout.clover.com/pay/SESSION1",
            checkoutSessionId: "SESSION1",
            expirationTime: 1,
          });
        }
        if (u.includes("/payments/PAY1")) return json(200, { id: "PAY1", order: { id: "ORDER1" } });
        if (u.includes("/orders/ORDER1") && init?.method === "POST") {
          title = JSON.parse(String(init.body)).title;
          return json(200, { id: "ORDER1" });
        }
        if (u.includes("/orders/ORDER1"))
          return json(200, { id: "ORDER1", title, lineItems: { elements: [{ printed: false }] } });
        if (u.includes("/print_event")) {
          printed += 1;
          return json(200, { state: "DONE" });
        }
        if (
          u.includes("/items") ||
          u.includes("/modifier_groups") ||
          u.includes("/categories") ||
          u.includes("/tax_rates")
        ) {
          return json(401, {});
        }
        return json(404, {});
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("creates a Clover checkout for a pickup order and confirms it once on Clover's webhook", async () => {
    const { createOrder, submitOrder, getOrderById } = await import("@/lib/orders/order-service");
    const created = createOrder({
      locationId: "loc-ndg-somerled",
      orderType: "PICKUP",
      lines: [{ itemId: PITA, quantity: 1, notes: "", selections: pitaCombo() }],
      customer: {
        customerId: null,
        takatakCustomerId: null,
        name: "Marie Tremblay",
        phone: "5145550100",
        email: null,
        isGuest: true,
      },
      deliveryAddress: null,
      notes: "",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.provider).toBe("clover");
    expect(created.data.paymentStatus).toBe("UNPAID");

    const submitted = await submitOrder(created.data.id);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.data.paymentUrl).toBe("https://checkout.clover.com/pay/SESSION1");
    expect(submitted.data.providerOrderId).toBe("SESSION1");
    const checkoutCall = calls.find((c) => c.url.includes("/checkouts"))!;
    const headers = checkoutCall.init!.headers as Record<string, string>;
    expect(headers["X-Clover-Merchant-Id"]).toBe("MTEST");
    expect(headers["Authorization"]).toBe("Bearer priv_test");
    const sent = JSON.parse(String(checkoutCall.init!.body));
    expect(sent.shoppingCart.lineItems[0].price).toBe(1391);
    expect(sent.redirectUrls.success).toContain(`/orders/${created.data.id}?paid=1`);

    // Clover calls back: the order is paid; with a REST token the Clover order is titled and printed once.
    vi.stubEnv("CLOVER_API_TOKEN", "rest_test");
    const { handleCloverHostedCheckoutWebhook } =
      await import("@/lib/integration/providers/clover/webhook");
    const raw = JSON.stringify({
      status: "APPROVED",
      type: "PAYMENT",
      id: "PAY1",
      merchantId: "MTEST",
      data: "SESSION1",
    });
    const t = Math.floor(Date.now() / 1000);
    const sig = `t=${t},v1=${createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex")}`;
    const send = () =>
      handleCloverHostedCheckoutWebhook(
        new Request("https://pppmtl.com/api/public/webhooks/provider?provider=clover", {
          method: "POST",
          body: raw,
          headers: { "clover-signature": sig },
        }),
      );
    const first = await (await send()).json();
    expect(first).toMatchObject({ received: true, applied: true, titled: true, printed: true });
    expect(title.startsWith("🌐 Site web · PPP-")).toBe(true);
    expect(getOrderById(created.data.id)).toMatchObject({
      paymentStatus: "PAID",
      status: "ACCEPTED",
    });

    // The same delivery again: ignored. A new delivery for an order already titled: never a second ticket.
    expect(await (await send()).json()).toMatchObject({ duplicate: true });
    resetWebhookReplayForTests();
    expect(await (await send()).json()).toMatchObject({ printed: false });
    expect(printed).toBe(1);
  });

  it("refuses delivery through Clover (pickup only) and a forged webhook", async () => {
    const { createOrder, submitOrder } = await import("@/lib/orders/order-service");
    const created = createOrder({
      locationId: "loc-ndg-somerled",
      orderType: "DELIVERY",
      lines: [{ itemId: PITA, quantity: 1, notes: "", selections: pitaCombo() }],
      customer: {
        customerId: null,
        takatakCustomerId: null,
        name: "Marie",
        phone: "5145550100",
        email: null,
        isGuest: true,
      },
      deliveryAddress: "1 rue Test",
      notes: "",
    });
    if (!created.ok) throw new Error("not created");
    const submitted = await submitOrder(created.data.id);
    expect(submitted).toMatchObject({ ok: false, error: { code: "unsupported_order_type" } });

    const { handleCloverHostedCheckoutWebhook } =
      await import("@/lib/integration/providers/clover/webhook");
    const forged = await handleCloverHostedCheckoutWebhook(
      new Request("https://pppmtl.com/api/public/webhooks/provider?provider=clover", {
        method: "POST",
        body: "{}",
        headers: { "clover-signature": "t=1,v1=00" },
      }),
    );
    expect(forged.status).toBeGreaterThanOrEqual(400);
    expect(printed).toBe(0);
  });

  it("does not reconcile or print real Clover payments without a durable store", async () => {
    vi.stubEnv("CLOVER_ENV", "production");
    vi.stubEnv("CLOVER_API_TOKEN", "rest_test");
    const { handleCloverHostedCheckoutWebhook } =
      await import("@/lib/integration/providers/clover/webhook");
    const raw = JSON.stringify({
      status: "APPROVED",
      type: "PAYMENT",
      id: "LIVE_UNTRACKED_PAYMENT",
      merchantId: "MTEST",
      data: "LIVE_UNTRACKED_SESSION",
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = createHmac("sha256", "whsec_test")
      .update(`${timestamp}.${raw}`)
      .digest("hex");
    const send = () =>
      handleCloverHostedCheckoutWebhook(
        new Request("https://pppmtl.com/api/public/webhooks/clover", {
          method: "POST",
          body: raw,
          headers: { "clover-signature": `t=${timestamp},v1=${digest}` },
        }),
      );
    const first = await send();
    expect(first.status).toBe(503);
    expect(first.headers.get("retry-after")).toBe("60");
    expect((await send()).status).toBe(503);
    expect(calls.filter((call) => call.url.includes("/payments/"))).toHaveLength(0);
    expect(printed).toBe(0);
  });

  it("rejects signed payments for another merchant and non-payment events", async () => {
    vi.stubEnv("CLOVER_API_TOKEN", "rest_test");
    const { handleCloverHostedCheckoutWebhook } =
      await import("@/lib/integration/providers/clover/webhook");
    const send = async (merchantId: string, type: string) => {
      const raw = JSON.stringify({
        status: "APPROVED",
        type,
        id: "PAY_FOREIGN",
        merchantId,
        data: "SESSION_FOREIGN",
      });
      const t = Math.floor(Date.now() / 1000);
      const digest = createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex");
      const signature = `t=${t},v1=${digest}`;
      return handleCloverHostedCheckoutWebhook(
        new Request("https://pppmtl.com/api/public/webhooks/clover", {
          method: "POST",
          body: raw,
          headers: { "clover-signature": signature },
        }),
      );
    };

    expect((await send("FOREIGN_MERCHANT", "PAYMENT")).status).toBe(401);
    expect((await send("MTEST", "REFUND")).status).toBe(400);
    expect(calls.filter((call) => call.url.includes("/payments/"))).toHaveLength(0);
    expect(printed).toBe(0);
  });

  it("returns retryable 503 and releases claims on temporary Clover REST failures", async () => {
    vi.stubEnv("CLOVER_API_TOKEN", "rest_test");
    const { handleCloverHostedCheckoutWebhook } =
      await import("@/lib/integration/providers/clover/webhook");
    const raw = JSON.stringify({
      status: "APPROVED",
      type: "PAYMENT",
      id: "MISSING_PAYMENT",
      merchantId: "MTEST",
      data: "MISSING_SESSION",
    });
    const t = Math.floor(Date.now() / 1000);
    const digest = createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex");
    const signature = `t=${t},v1=${digest}`;
    const send = () =>
      handleCloverHostedCheckoutWebhook(
        new Request("https://pppmtl.com/api/public/webhooks/clover", {
          method: "POST",
          body: raw,
          headers: { "clover-signature": signature },
        }),
      );

    const first = await send();
    expect(first.status).toBe(503);
    expect(first.headers.get("retry-after")).toBe("30");
    const second = await send();
    expect(second.status).toBe(503);
    expect(printed).toBe(0);
  });

  it("releases the delivery after unexpected reconciliation exceptions", async () => {
    vi.stubEnv("CLOVER_API_TOKEN", "rest_test");
    vi.stubEnv("PUBLIC_SITE_URL", "not a valid URL");
    const { handleCloverHostedCheckoutWebhook } =
      await import("@/lib/integration/providers/clover/webhook");
    const raw = JSON.stringify({
      status: "APPROVED",
      type: "PAYMENT",
      id: "PAY1",
      merchantId: "MTEST",
      data: "SESSION_RETRY",
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = createHmac("sha256", "whsec_test").update(`${timestamp}.${raw}`).digest("hex");
    const send = () =>
      handleCloverHostedCheckoutWebhook(
        new Request("https://pppmtl.com/api/public/webhooks/clover", {
          method: "POST",
          body: raw,
          headers: { "clover-signature": `t=${timestamp},v1=${digest}` },
        }),
      );

    expect((await send()).status).toBe(503);
    expect((await send()).status).toBe(503);
    expect(printed).toBe(0);
  });
});
