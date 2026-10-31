/**
 * Real PostgreSQL: courier dispatch stored in ppp.orders.order_document.dispatch, with every courier API mocked.
 * Runs only when PPP_TEST_DATABASE_URL points at a database migrated with db/migrations 0001-0003, connected as
 * the limited application role (same grants as production ppp_app, see docs/DB_ROLLOUT.md) — the CI database job.
 * No new table, function or grant is used. Each test has its own tenant, so rows never collide.
 */
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  closePppDatabaseForTests,
  pppDatabasePool,
  pppTenantId,
} from "@/lib/orders/database.server";
import { resetOrderStoreForTests } from "@/lib/orders/order-store.server";
import {
  persistGuestOrderOnce,
  withPppTenantTransaction,
} from "@/lib/orders/postgres-transactions.server";
import type { InternalOrder } from "@/lib/orders/types";
import { bookCourier, dispatchBoard, findDrivers } from "../dispatch-service.server";
import { findOrderForDelivery } from "../dispatch-store.server";
import { handleDoorDashWebhook } from "../webhooks.server";
import {
  clearCourierEnv,
  DD_ENV,
  DD_WEBHOOK_SECRET,
  doorDashQuoteResponder,
  mockFetch,
  paidDeliveryOrder,
  stubEnv,
  type FetchCall,
} from "./fixtures";

const databaseUrl = process.env["PPP_TEST_DATABASE_URL"];

async function storePaidOrder(): Promise<InternalOrder> {
  const order = paidDeliveryOrder();
  const pool = await pppDatabasePool();
  await persistGuestOrderOnce(pool, pppTenantId(), order);
  // As Clover's verified webhook would: the row and the document say PAID.
  await withPppTenantTransaction(pool, pppTenantId(), (client) =>
    client.query(
      `UPDATE ppp.orders SET payment_status = 'PAID', order_status = 'SUBMITTED'
        WHERE id = $1 AND tenant_id = current_setting('ppp.tenant_id', true)`,
      [order.id],
    ),
  );
  return order;
}

async function storedDocument(orderId: string): Promise<Record<string, unknown>> {
  const result = await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (client) =>
    client.query<{ order_document: Record<string, unknown> }>(
      `SELECT order_document FROM ppp.orders
        WHERE id = $1 AND tenant_id = current_setting('ppp.tenant_id', true)`,
      [orderId],
    ),
  );
  return result.rows[0]?.order_document ?? {};
}

describe.skipIf(!databaseUrl)("courier dispatch (real PostgreSQL)", () => {
  let accepted = 0;

  beforeEach(() => {
    resetOrderStoreForTests();
    clearCourierEnv();
    accepted = 0;
    vi.stubEnv("DATABASE_URL", databaseUrl!);
    vi.stubEnv("PPP_TENANT_ID", `test_${randomUUID().replace(/-/g, "").slice(0, 12)}`);
    stubEnv({ ...DD_ENV, DOORDASH_WEBHOOK_SECRET: DD_WEBHOOK_SECRET });
    mockFetch(doorDashQuoteResponder(975, 10), (call: FetchCall) => {
      const m = /\/drive\/v2\/quotes\/([^/]+)\/accept$/.exec(call.url);
      if (!m) return null;
      accepted += 1;
      return {
        status: 200,
        body: {
          external_delivery_id: decodeURIComponent(m[1]!),
          delivery_status: "created",
          fee: 975,
          currency: "CAD",
          tracking_url: "https://doordash.com/drive/portal/track/pg",
        },
      };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await closePppDatabaseForTests();
  });

  it("keeps quotes and the booking in order_document.dispatch, across a restart, without touching other keys", async () => {
    const order = await storePaidOrder();
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    const quoteId = found.data.options[0]!.quoteId!;

    let doc = await storedDocument(order.id);
    expect(doc["dispatch"]).toMatchObject({
      quotes: { requestedBy: "Sam", quotes: [{ quoteId }] },
    });

    resetOrderStoreForTests(); // a restart: only PostgreSQL remembers
    const booked = await bookCourier({
      orderId: order.id,
      provider: "doordash",
      quoteId,
      tipCents: 0,
      by: "Sam",
    });
    expect(booked).toMatchObject({
      ok: true,
      data: { active: { status: "requested", externalId: quoteId } },
    });

    doc = await storedDocument(order.id);
    expect(doc).toMatchObject({
      id: order.id,
      paymentStatus: "PAID",
      orderNumber: "PPP-AB12C",
      items: [{ name: "Pizza pepperoni (large)" }, { name: "Pepsi" }],
      dispatch: { active: { provider: "doordash", status: "requested", chosenBy: "Sam" } },
    });

    resetOrderStoreForTests();
    const row = (await dispatchBoard()).orders.find((o) => o.id === order.id);
    expect(row?.dispatch.active?.trackingUrl).toBe("https://doordash.com/drive/portal/track/pg");
  });

  it("a DoorDash webhook finds the order by its delivery id and updates PostgreSQL", async () => {
    const order = await storePaidOrder();
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    const quoteId = found.data.options[0]!.quoteId!;
    await bookCourier({ orderId: order.id, provider: "doordash", quoteId, tipCents: 0, by: "Sam" });
    resetOrderStoreForTests();

    const res = await handleDoorDashWebhook(
      new Request("https://pppmtl.com/api/public/webhooks/doordash", {
        method: "POST",
        headers: { authorization: DD_WEBHOOK_SECRET },
        body: JSON.stringify({
          event_name: "DASHER_PICKED_UP",
          external_delivery_id: quoteId,
          created_at: new Date().toISOString(),
          dasher_name: "Ana",
        }),
      }),
    );
    expect(await res.json()).toMatchObject({ applied: true });
    expect(await storedDocument(order.id)).toMatchObject({
      dispatch: { active: { status: "picked_up", driver: { name: "Ana" } } },
    });
  });

  it("another tenant can neither find nor change this order's dispatch", async () => {
    const order = await storePaidOrder();
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    const quoteId = found.data.options[0]!.quoteId!;
    await bookCourier({ orderId: order.id, provider: "doordash", quoteId, tipCents: 0, by: "Sam" });

    vi.stubEnv("PPP_TENANT_ID", "test_other_tenant");
    resetOrderStoreForTests();
    expect(await findOrderForDelivery(quoteId)).toBeNull();
    expect(await findDrivers(order.id, "Mallory")).toMatchObject({
      ok: false,
      error: "Order not found.",
    });
  });

  it("two tablets booking at the same moment get exactly one courier", async () => {
    const order = await storePaidOrder();
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    const quoteId = found.data.options[0]!.quoteId!;
    const [a, b] = await Promise.all([
      bookCourier({
        orderId: order.id,
        provider: "doordash",
        quoteId,
        tipCents: 0,
        by: "Tablet A",
      }),
      bookCourier({
        orderId: order.id,
        provider: "doordash",
        quoteId,
        tipCents: 0,
        by: "Tablet B",
      }),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(accepted).toBe(1);
    expect(await storedDocument(order.id)).toMatchObject({
      dispatch: { active: { status: "requested" } },
    });
  });
});
