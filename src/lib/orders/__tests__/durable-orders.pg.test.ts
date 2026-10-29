/**
 * Real PostgreSQL: the durable Clover order path, with Clover's network mocked.
 * Runs only when PPP_TEST_DATABASE_URL points at a database migrated with db/migrations 0001-0003, as the
 * limited application role (CI database job). Each test uses its own tenant, so rows never collide.
 */
import { createHmac, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { menuItems } from "@/data/menu";
import { resetWebhookReplayForTests } from "@/lib/integration/core/webhook-security";
import { resetCloverCachesForTests } from "@/lib/integration/providers/clover/api.server";
import { handleCloverHostedCheckoutWebhook } from "@/lib/integration/providers/clover/webhook";
import { defaultSelections, toggleChoice } from "@/lib/modifiers";
import { closePppDatabaseForTests, pppDatabasePool, pppTenantId } from "../database.server";
import { loadDurableOrder, runCloverFulfillment } from "../durable-orders.server";
import { resetIdempotencyForTests } from "../idempotency";
import { createOrder, getOrderById, submitOrder } from "../order-service";
import { resetOrderStoreForTests } from "../order-store.server";
import { withPppTenantTransaction } from "../postgres-transactions.server";

const databaseUrl = process.env["PPP_TEST_DATABASE_URL"];
const PITA = "pita-wrap-mixte-shish-taouk-shawarma";

function pitaCombo() {
  const groups = menuItems.find((i) => i.id === PITA)!.modifierGroups!;
  const group = (label: RegExp) => groups.find((g) => label.test(g.labelFr))!;
  const pick = (label: RegExp, choice: RegExp) =>
    group(label).choices.find((c) => choice.test(c.labelFr))!.id;
  let s = defaultSelections(groups);
  s = toggleChoice(s, group(/^Choix pita/), pick(/^Choix pita/, /^pita$/i));
  s = toggleChoice(s, group(/^Sauce incluse/), pick(/^Sauce incluse/, /ail/i));
  s = toggleChoice(s, group(/^Trio/), pick(/^Trio/, /^frites \+ pepsi$/i));
  return s;
}

/** A restart: this process forgets every order, idempotency claim and webhook delivery. */
function restart() {
  resetOrderStoreForTests();
  resetIdempotencyForTests();
  resetWebhookReplayForTests();
}

describe.skipIf(!databaseUrl)("durable Clover orders (real PostgreSQL)", () => {
  let session = "";
  let payment = "";
  let cloverOrder = "";
  let paymentHref = "";
  let title = "";
  let printed = 0;
  let titleFailures = 0;
  const calls: string[] = [];

  beforeEach(() => {
    restart();
    resetCloverCachesForTests();
    const id = randomUUID().replace(/-/g, "").slice(0, 12);
    session = `SESSION_${id}`;
    payment = `PAY_${id}`;
    cloverOrder = `ORDER_${id}`;
    paymentHref = `https://checkout.clover.com/pay/${session}`;
    title = "";
    printed = 0;
    titleFailures = 0;
    calls.length = 0;
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("PPP_TENANT_ID", `test_${id}`);
    vi.stubEnv("CLOVER_ENV", "sandbox");
    vi.stubEnv("CLOVER_MERCHANT_ID", "MTEST");
    vi.stubEnv("CLOVER_ECOMM_PRIVATE_KEY", "priv_test");
    vi.stubEnv("CLOVER_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("CLOVER_API_TOKEN", "rest_test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        calls.push(u);
        const json = (status: number, data: unknown) =>
          new Response(JSON.stringify(data), {
            status,
            headers: { "content-type": "application/json" },
          });
        if (u.includes("/invoicingcheckoutservice/v1/checkouts")) {
          return json(200, { href: paymentHref, checkoutSessionId: session, expirationTime: 1 });
        }
        if (u.includes(`/payments/${payment}`)) {
          return json(200, { id: payment, order: { id: cloverOrder } });
        }
        if (u.includes(`/orders/${cloverOrder}`) && init?.method === "POST") {
          if (titleFailures > 0) {
            titleFailures -= 1;
            return json(500, {});
          }
          title = JSON.parse(String(init.body)).title;
          return json(200, { id: cloverOrder });
        }
        if (u.includes(`/orders/${cloverOrder}`)) {
          return json(200, {
            id: cloverOrder,
            title,
            lineItems: { elements: [{ printed: printed > 0 }] },
          });
        }
        if (u.includes("/print_event")) {
          printed += 1;
          return json(200, { state: "DONE" });
        }
        // Inventory and tax reads: the sandbox falls back to the committed snapshot and Québec taxes.
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

  async function checkout() {
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
    if (!created.ok) throw new Error(`order not created: ${created.error.code}`);
    return { created: created.data, submitted: await submitOrder(created.data.id) };
  }

  function webhook(extra: Record<string, unknown> = {}, sessionId = session) {
    const raw = JSON.stringify({
      status: "APPROVED",
      type: "PAYMENT",
      id: payment,
      merchantId: "MTEST",
      data: sessionId,
      ...extra,
    });
    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex");
    return handleCloverHostedCheckoutWebhook(
      new Request("https://pppmtl.com/api/public/webhooks/clover", {
        method: "POST",
        body: raw,
        headers: { "clover-signature": `t=${t},v1=${v1}` },
      }),
    );
  }

  it("stores the order before the redirect and finds it again after a restart", async () => {
    const { created, submitted } = await checkout();
    expect(submitted).toMatchObject({ ok: true, data: { paymentUrl: paymentHref } });

    const stored = await loadDurableOrder(created.id);
    expect(stored).toMatchObject({
      id: created.id,
      status: "SUBMITTED",
      paymentStatus: "UNPAID",
      providerOrderId: session,
      paymentUrl: paymentHref,
    });
    expect(stored?.orderNumber).toMatch(/^PPP-[A-Z0-9]{5}$/);
    expect(stored?.total).toBeGreaterThan(stored?.subtotal ?? 0);

    restart();
    expect(await getOrderById(created.id)).toMatchObject({
      status: "SUBMITTED",
      total: stored?.total,
    });

    // The same cart from the same checkout scope after a restart continues the stored order.
    const again = await checkout();
    expect(again.submitted).toMatchObject({ ok: true, data: { id: created.id } });
    expect(calls.filter((u) => u.includes("/checkouts"))).toHaveLength(1);
  });

  it("records a payment once, titles then prints one ticket, even across restarts and redeliveries", async () => {
    const { created } = await checkout();
    restart();

    const first = await webhook();
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({
      applied: true,
      duplicate: false,
      kitchen: { done: 2, retry: 0, manualReview: 0 },
    });
    expect(title.startsWith("🌐 Site web · PPP-")).toBe(true);
    expect(printed).toBe(1);
    expect(await getOrderById(created.id)).toMatchObject({
      paymentStatus: "PAID",
      status: "ACCEPTED",
      providerPaymentId: payment,
      paymentUrl: null,
    });

    restart();
    expect(await (await webhook()).json()).toMatchObject({ applied: true, duplicate: true });
    // A different body for the same payment is a new delivery, but never a second ticket.
    expect(await (await webhook({ createdTime: 42 })).json()).toMatchObject({ applied: true });
    expect(printed).toBe(1);
  });

  it("acknowledges the payment when Clover is down, then titles and prints on the retry", async () => {
    await checkout();
    titleFailures = 1;
    const first = await webhook();
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ kitchen: { done: 0, retry: 1 } });
    expect(printed).toBe(0);

    restart();
    // Skip the backoff wait.
    await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (client) =>
      client.query(
        "UPDATE ppp.fulfillment_outbox SET next_attempt_at = now() WHERE tenant_id = current_setting('ppp.tenant_id', true)",
      ),
    );
    expect(await runCloverFulfillment()).toMatchObject({ done: 2, manualReview: 0 });
    expect(printed).toBe(1);
    expect(await runCloverFulfillment()).toMatchObject({ claimed: 0 });
  });

  it("ignores a signed payment for a checkout this site never opened", async () => {
    const response = await webhook({}, "SESSION_NOT_FROM_THIS_SITE");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ignored: true });
    expect(calls.filter((u) => u.includes("/payments/"))).toHaveLength(0);
  });

  it("never redirects to a payment page it could not link to the stored order", async () => {
    paymentHref = "https://checkout.clover.com.evil.example/pay";
    const { created, submitted } = await checkout();
    expect(submitted).toMatchObject({ ok: false, error: { code: "provider_unavailable" } });
    expect(await loadDurableOrder(created.id)).toMatchObject({
      status: "FAILED",
      paymentStatus: "UNPAID",
    });

    // "Pay" again with the same cart: a new order, not the failed attempt shown as placed.
    paymentHref = `https://checkout.clover.com/pay/${session}`;
    const retry = await checkout();
    expect(retry.created.id).not.toBe(created.id);
    expect(retry.submitted).toMatchObject({ ok: true, data: { paymentUrl: paymentHref } });
  });

  it("refuses before asking Clover when the database cannot be reached", async () => {
    await closePppDatabaseForTests();
    vi.stubEnv("DATABASE_URL", "postgres://ppp_app:wrong@127.0.0.1:1/pppmtl");
    try {
      const { submitted } = await checkout();
      expect(submitted).toMatchObject({ ok: false, error: { code: "provider_unavailable" } });
      expect(calls.filter((u) => u.includes("/checkouts"))).toHaveLength(0);
      expect((await webhook()).status).toBe(503);
    } finally {
      await closePppDatabaseForTests();
    }
  });
});
