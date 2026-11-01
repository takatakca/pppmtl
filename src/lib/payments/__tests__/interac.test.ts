import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { menuItems } from "@/data/menu";
import { resetCloverCachesForTests } from "@/lib/integration/providers/clover/api.server";
import { defaultSelections, toggleChoice } from "@/lib/modifiers";
import { resetIdempotencyForTests } from "@/lib/orders/idempotency";
import { createOrder, submitOrder, validateOrder } from "@/lib/orders/order-service";
import { getOrder, resetOrderStoreForTests } from "@/lib/orders/order-store.server";
import {
  cancelInterac,
  interacBoard,
  markInteracPaid,
  markInteracRequested,
  retryInteracKitchen,
} from "../interac.server";

const PITA = "pita-wrap-mixte-shish-taouk-shawarma";

function pitaCombo() {
  const groups = menuItems.find((i) => i.id === PITA)!.modifierGroups!;
  const group = (label: RegExp) => groups.find((g) => label.test(g.labelFr))!;
  const pick = (label: RegExp, choice: RegExp) =>
    group(label).choices.find((c) => choice.test(c.labelFr))!.id;
  let s = defaultSelections(groups);
  s = toggleChoice(s, group(/^Choix pita/), pick(/^Choix pita/, /^pita$/i));
  s = toggleChoice(s, group(/^Sauce incluse/), pick(/^Sauce incluse/, /ail/i));
  s = toggleChoice(s, group(/^Trio/), pick(/^Trio/, /^petite frite \+ pepsi$/i));
  return s;
}

const request = (over: Record<string, unknown> = {}) => ({
  locationId: "loc-ndg-somerled",
  orderType: "PICKUP" as const,
  lines: [{ itemId: PITA, quantity: 2, notes: "", selections: pitaCombo() }],
  customer: {
    customerId: null,
    takatakCustomerId: null,
    name: "Marie Tremblay",
    phone: "(514) 555-0100",
    email: "marie@example.com",
    isGuest: true,
  },
  deliveryAddress: null,
  notes: "",
  tip: 300,
  paymentMethod: "interac" as const,
  ...over,
});

describe("Interac e-Transfer (manual)", () => {
  let calls: Array<{ url: string; body: string | null }>;
  let printFails: number;

  beforeEach(() => {
    resetOrderStoreForTests();
    resetIdempotencyForTests();
    resetCloverCachesForTests();
    calls = [];
    printFails = 0;
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("CLOVER_ENV", "sandbox");
    vi.stubEnv("CLOVER_MERCHANT_ID", "MTEST");
    vi.stubEnv("CLOVER_ECOMM_PRIVATE_KEY", "priv_test");
    vi.stubEnv("CLOVER_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("CLOVER_API_TOKEN", "rest_test");
    vi.stubEnv("INTERAC_REQUESTS_ENABLED", "true");
    vi.stubEnv("INTERAC_ALERT_PHONE", "514 555 0199");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tw-token");
    vi.stubEnv("TWILIO_FROM_NUMBER", "+15145550000");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        calls.push({ url: u, body: init?.body ? String(init.body) : null });
        const json = (status: number, data: unknown) =>
          new Response(JSON.stringify(data), {
            status,
            headers: { "content-type": "application/json" },
          });
        if (u.includes("api.twilio.com")) return json(201, { sid: "SM1" });
        if (u.endsWith("/v3/merchants/MTEST/orders") && init?.method === "POST") {
          return json(200, { id: "CLOVERORDER1" });
        }
        if (u.includes("/orders/CLOVERORDER1/bulk_line_items")) return json(200, { elements: [] });
        if (u.includes("/print_event")) {
          if (printFails > 0) {
            printFails -= 1;
            return json(500, {});
          }
          return json(200, { state: "DONE" });
        }
        // Inventory and taxes: the sandbox uses the committed snapshot and Québec's rates.
        return json(401, {});
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const cloverCalls = () => calls.filter((c) => c.url.includes("/v3/merchants/"));
  const created = () =>
    cloverCalls().filter((c) => c.url.endsWith("/orders") && c.body?.includes('"state"'));
  const prints = () => calls.filter((c) => c.url.includes("/print_event"));

  async function place() {
    const made = createOrder(request());
    if (!made.ok) throw new Error(made.error.code);
    const submitted = await submitOrder(made.data.id);
    if (!submitted.ok) throw new Error(submitted.error.code);
    return submitted.data;
  }

  it("is offered only when switched on, and needs an e-mail for the request", () => {
    expect(validateOrder(request()).valid).toBe(true);
    const noEmail = request({ customer: { ...request().customer, email: null } });
    expect(validateOrder(noEmail).errors.map((e) => e.code)).toContain("missing_email");
    vi.stubEnv("INTERAC_REQUESTS_ENABLED", "");
    expect(validateOrder(request()).errors.map((e) => e.code)).toContain("interac_unavailable");
    expect(validateOrder(request({ paymentMethod: "bitcoin" })).valid).toBe(false);
  });

  it("prices the order from Clover, never opens a payment page, and texts the restaurant and the customer", async () => {
    const order = await place();
    expect(order).toMatchObject({
      status: "SUBMITTED",
      paymentStatus: "UNPAID",
      paymentMethod: "INTERAC",
      providerStatus: "awaiting_interac",
      interac: { status: "awaiting_request" },
    });
    expect(order.paymentUrl ?? null).toBeNull();
    expect(calls.some((c) => c.url.includes("/checkouts"))).toBe(false);
    // 2 × pita combo ($13.49) + taxes on $26.98 + $3.00 tip.
    expect(order.subtotal).toBe(2698);
    expect(order.interac!.amount).toBe(order.total);
    expect(order.total).toBe(2698 + (order.tax ?? 0) + 300);
    expect(order.interac!.lines).toEqual([
      expect.objectContaining({
        name: "2 × Pita / Wrap Mixte — Shish Taouk & Shawarma",
        price: 2698,
      }),
      { name: "Pourboire / Tip", price: 300 },
    ]);
    const texts = calls.filter((c) => c.url.includes("api.twilio.com"));
    expect(texts).toHaveLength(2);
    const owner = new URLSearchParams(texts.find((t) => t.body!.includes("%2B15145550199"))!.body!);
    expect(owner.get("Body")).toContain(order.orderNumber!);
    expect(owner.get("Body")).toContain("marie@example.com");
    const customer = new URLSearchParams(
      texts.find((t) => t.body!.includes("%2B15145550100"))!.body!,
    );
    expect(customer.get("Body")).toContain("Interac");
  });

  it("sends a paid order to Clover once, with its ticket lines and one print, even if Paid is tapped twice", async () => {
    const order = await place();
    expect(await markInteracRequested(order.id, "Ali")).toMatchObject({ ok: true });
    expect(getOrder(order.id)?.interac?.status).toBe("requested");

    const [first, second] = await Promise.all([
      markInteracPaid(order.id, "Ali"),
      markInteracPaid(order.id, "Sam"),
    ]);
    expect([first.ok, second.ok].sort()).toEqual([false, true]);
    expect(created()).toHaveLength(1);
    const createBody = JSON.parse(created()[0]!.body!);
    expect(createBody.title).toMatch(/^🌐 Site web · PPP-[A-Z0-9]{5} · Marie · INTERAC$/);
    expect(createBody.note).toContain("PAYÉ EN LIGNE / PAID ONLINE (Interac");
    const lines = JSON.parse(calls.find((c) => c.url.includes("bulk_line_items"))!.body!);
    expect(lines.items.map((l: { price: number }) => l.price)).toEqual([2698, 300]);
    expect(prints()).toHaveLength(1);
    expect(getOrder(order.id)).toMatchObject({
      paymentStatus: "PAID",
      status: "ACCEPTED",
      interac: { status: "sent_to_kitchen", cloverOrderId: "CLOVERORDER1", printed: true },
    });
    // Nothing is open any more: no second request, no cancel.
    expect(await markInteracRequested(order.id, "Ali")).toMatchObject({ ok: false });
    expect(await cancelInterac(order.id, "Ali")).toMatchObject({ ok: false });
  });

  it("keeps a paid order whose ticket did not print, and resends only the print", async () => {
    const order = await place();
    printFails = 1;
    expect(await markInteracPaid(order.id, "Ali")).toMatchObject({ ok: false });
    expect(getOrder(order.id)).toMatchObject({
      paymentStatus: "PAID",
      interac: { status: "kitchen_failed", cloverOrderId: "CLOVERORDER1", linesAdded: true },
    });
    const board = await interacBoard();
    expect(board[0]).toMatchObject({ id: order.id, canRetry: true });

    expect(await retryInteracKitchen(order.id, "Ali")).toMatchObject({ ok: true });
    expect(created()).toHaveLength(1);
    expect(calls.filter((c) => c.url.includes("bulk_line_items"))).toHaveLength(1);
    expect(prints()).toHaveLength(2);
    expect(getOrder(order.id)?.interac?.status).toBe("sent_to_kitchen");
    expect(await retryInteracKitchen(order.id, "Ali")).toMatchObject({ ok: false });
  });

  it("cancels an unpaid Interac order without touching Clover", async () => {
    const order = await place();
    expect(await cancelInterac(order.id, "Ali")).toMatchObject({ ok: true });
    expect(getOrder(order.id)).toMatchObject({ status: "CANCELLED", paymentStatus: "UNPAID" });
    expect(await markInteracPaid(order.id, "Ali")).toMatchObject({ ok: false });
    expect(created()).toHaveLength(0);
  });
});
