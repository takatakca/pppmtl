/**
 * Interac on real PostgreSQL as the limited role: two tablets tapping "Paid" at once send ONE Clover order, and a
 * restart loses nothing. Runs only with PPP_TEST_DATABASE_URL (CI database job).
 */
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { menuItems } from "@/data/menu";
import { resetCloverCachesForTests } from "@/lib/integration/providers/clover/api.server";
import { defaultSelections, toggleChoice } from "@/lib/modifiers";
import { resetIdempotencyForTests } from "@/lib/orders/idempotency";
import { createOrder, submitOrder, validateOrder } from "@/lib/orders/order-service";
import { resetOrderStoreForTests } from "@/lib/orders/order-store.server";
import { closePppDatabaseForTests } from "@/lib/orders/database.server";
import { loadDurableOrder } from "@/lib/orders/durable-orders.server";
import { markInteracPaid, markInteracRequested } from "../interac.server";

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

const databaseUrl = process.env["PPP_TEST_DATABASE_URL"];

describe.skipIf(!databaseUrl)("Interac e-Transfer on PostgreSQL", () => {
  let calls: string[];

  beforeEach(() => {
    resetOrderStoreForTests();
    resetIdempotencyForTests();
    resetCloverCachesForTests();
    calls = [];
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("PPP_TENANT_ID", `test_${randomUUID().slice(0, 12)}`);
    vi.stubEnv("CLOVER_ENV", "sandbox");
    vi.stubEnv("CLOVER_MERCHANT_ID", "MTEST");
    vi.stubEnv("CLOVER_ECOMM_PRIVATE_KEY", "priv_test");
    vi.stubEnv("CLOVER_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("CLOVER_API_TOKEN", "rest_test");
    vi.stubEnv("INTERAC_REQUESTS_ENABLED", "true");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        calls.push(`${init?.method ?? "GET"} ${u}`);
        const json = (status: number, data: unknown) =>
          new Response(JSON.stringify(data), {
            status,
            headers: { "content-type": "application/json" },
          });
        if (u.endsWith("/v3/merchants/MTEST/orders") && init?.method === "POST") {
          // Slow enough that both taps are in flight together.
          await new Promise((r) => setTimeout(r, 50));
          return json(200, { id: "CLOVERORDER1" });
        }
        if (u.includes("bulk_line_items")) return json(200, { elements: [] });
        if (u.includes("/print_event")) return json(200, { state: "DONE" });
        return json(401, {});
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await closePppDatabaseForTests();
  });

  it("stores the unpaid order, survives a restart, and sends one ticket for two simultaneous Paid taps", async () => {
    const made = createOrder(request());
    if (!made.ok) throw new Error(made.error.code);
    const submitted = await submitOrder(made.data.id);
    expect(submitted).toMatchObject({ ok: true });
    resetOrderStoreForTests();

    expect(await loadDurableOrder(made.data.id)).toMatchObject({
      paymentMethod: "INTERAC",
      paymentStatus: "UNPAID",
      interac: { status: "awaiting_request" },
    });
    expect(await markInteracRequested(made.data.id, "Ali")).toMatchObject({ ok: true });

    const results = await Promise.all([
      markInteracPaid(made.data.id, "Ali"),
      markInteracPaid(made.data.id, "Sam"),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(
      calls.filter((c) => c.startsWith("POST") && c.endsWith("/v3/merchants/MTEST/orders")),
    ).toHaveLength(1);
    expect(calls.filter((c) => c.includes("/print_event"))).toHaveLength(1);

    resetOrderStoreForTests();
    expect(await loadDurableOrder(made.data.id)).toMatchObject({
      paymentStatus: "PAID",
      status: "ACCEPTED",
      interac: { status: "sent_to_kitchen", cloverOrderId: "CLOVERORDER1", printed: true },
    });
  });
});
