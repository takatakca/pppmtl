/**
 * Courier dispatch end to end on the in-memory order store (no DATABASE_URL), with every provider call mocked.
 * The same flow on real PostgreSQL is in dispatch.pg.test.ts.
 */
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetOrderStoreForTests, saveOrder } from "@/lib/orders/order-store.server";
import { resetUberTokenForTests } from "../couriers/uber.server";
import {
  assignOwnDriver,
  bookCourier,
  cancelCourier,
  dispatchBoard,
  findDrivers,
  recordSkipBooking,
  refreshCourier,
} from "../dispatch-service.server";
import { handleDoorDashWebhook, handleUberWebhook } from "../webhooks.server";
import {
  clearCourierEnv,
  DD_ENV,
  DD_WEBHOOK_SECRET,
  doorDashQuoteResponder,
  json,
  mockFetch,
  paidDeliveryOrder,
  stubEnv,
  UBER_ENV,
  UBER_WEBHOOK_SECRET,
  uberQuoteResponder,
  uberTokenResponder,
  type FetchCall,
} from "./fixtures";

beforeEach(() => {
  clearCourierEnv();
  resetOrderStoreForTests();
  resetUberTokenForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function doorDashAccept(calls?: { accepted: number }) {
  return (call: FetchCall) => {
    const m = /\/drive\/v2\/quotes\/([^/]+)\/accept$/.exec(call.url);
    if (!m) return null;
    if (calls) calls.accepted += 1;
    return {
      status: 200,
      body: {
        external_delivery_id: decodeURIComponent(m[1]!),
        delivery_status: "created",
        fee: 975,
        currency: "CAD",
        tracking_url: "https://doordash.com/drive/portal/track/x",
        updated_at: new Date().toISOString(),
      },
    };
  };
}

async function doorDashWebhook(body: Record<string, unknown>, authorization = DD_WEBHOOK_SECRET) {
  return handleDoorDashWebhook(
    new Request("https://pppmtl.com/api/public/webhooks/doordash", {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("Find a driver", () => {
  it("lists all four options; providers without credentials are 'not connected' with no price", async () => {
    const order = saveOrder(paidDeliveryOrder());
    const calls = mockFetch();
    const result = await findDrivers(order.id, "Sam");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.options.map((o) => [o.provider, o.availability, o.feeCents])).toEqual([
      ["doordash", "not_connected", null],
      ["uber", "not_connected", null],
      ["skip", "manual", null],
      ["own_driver", "manual", 0],
    ]);
    expect(calls).toHaveLength(0);
  });

  it("quotes DoorDash and Uber side by side and badges the cheapest and fastest", async () => {
    stubEnv({ ...DD_ENV, ...UBER_ENV });
    const order = saveOrder(paidDeliveryOrder());
    mockFetch(doorDashQuoteResponder(975, 6), uberTokenResponder(), uberQuoteResponder(850, 12));
    const result = await findDrivers(order.id, "Sam");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [dd, uber] = result.data.options;
    expect(dd).toMatchObject({
      provider: "doordash",
      availability: "available",
      feeCents: 975,
      badges: ["fastest"],
    });
    expect(uber).toMatchObject({
      provider: "uber",
      availability: "available",
      feeCents: 850,
      badges: ["cheapest"],
    });
    expect(result.data.dispatch.quotesAt).not.toBeNull();
  });

  it("refuses an unpaid order or a pickup order", async () => {
    const unpaid = saveOrder(paidDeliveryOrder({ paymentStatus: "UNPAID" }));
    const pickup = saveOrder(paidDeliveryOrder({ orderType: "PICKUP", deliveryAddress: null }));
    expect(await findDrivers(unpaid.id, "Sam")).toMatchObject({
      ok: false,
      error: expect.stringContaining("payment"),
    });
    expect(await findDrivers(pickup.id, "Sam")).toMatchObject({
      ok: false,
      error: expect.stringContaining("not a delivery"),
    });
  });

  it("an unreadable address marks DoorDash and Uber unavailable without calling them", async () => {
    stubEnv({ ...DD_ENV, ...UBER_ENV });
    const order = saveOrder(paidDeliveryOrder({ deliveryAddress: "chez Marie" }));
    const calls = mockFetch();
    const result = await findDrivers(order.id, "Sam");
    expect(result.ok && result.data.options.slice(0, 2).map((o) => o.availability)).toEqual([
      "unavailable",
      "unavailable",
    ]);
    expect(calls).toHaveLength(0);
  });
});

describe("booking, webhooks and cancel", () => {
  it("books the stored DoorDash quote once; a second booking is refused", async () => {
    stubEnv(DD_ENV);
    const order = saveOrder(paidDeliveryOrder());
    const counter = { accepted: 0 };
    mockFetch(doorDashQuoteResponder(), doorDashAccept(counter));
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    const quoteId = found.data.options[0]!.quoteId!;

    const booked = await bookCourier({
      orderId: order.id,
      provider: "doordash",
      quoteId,
      tipCents: 200,
      by: "Sam",
    });
    expect(booked).toMatchObject({
      ok: true,
      data: {
        active: {
          provider: "doordash",
          status: "requested",
          externalId: quoteId,
          trackingUrl: "https://doordash.com/drive/portal/track/x",
          tipCents: 200,
          chosenBy: "Sam",
        },
      },
    });
    const again = await bookCourier({
      orderId: order.id,
      provider: "doordash",
      quoteId,
      tipCents: 0,
      by: "Lea",
    });
    expect(again).toMatchObject({ ok: false, error: expect.stringContaining("already") });
    expect(counter.accepted).toBe(1);
  });

  it("refuses a quote id the server did not store (no price from the browser)", async () => {
    stubEnv(DD_ENV);
    const order = saveOrder(paidDeliveryOrder());
    const calls = mockFetch();
    const result = await bookCourier({
      orderId: order.id,
      provider: "doordash",
      quoteId: "forged",
      tipCents: 0,
      by: "x",
    });
    expect(result).toMatchObject({ ok: false });
    expect(calls).toHaveLength(0);
  });

  it("applies signed DoorDash webhooks and rejects a wrong Authorization header", async () => {
    stubEnv({ ...DD_ENV, DOORDASH_WEBHOOK_SECRET: DD_WEBHOOK_SECRET });
    const order = saveOrder(paidDeliveryOrder());
    mockFetch(doorDashQuoteResponder(), doorDashAccept());
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    const externalId = found.data.options[0]!.quoteId!;
    await bookCourier({
      orderId: order.id,
      provider: "doordash",
      quoteId: externalId,
      tipCents: 0,
      by: "Sam",
    });

    const forged = await doorDashWebhook(
      { event_name: "DASHER_DROPPED_OFF", external_delivery_id: externalId },
      "wrong",
    );
    expect(forged.status).toBe(401);

    const res = await doorDashWebhook({
      event_name: "DASHER_CONFIRMED",
      external_delivery_id: externalId,
      created_at: new Date().toISOString(),
      dasher_name: "Ana",
      dasher_pickup_phone_number: "+15145550111",
      dasher_location: { lat: 45.471, lng: -73.634 },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ applied: true });
    const board = await dispatchBoard();
    const row = board.orders.find((o) => o.id === order.id)!;
    expect(row.dispatch.active).toMatchObject({
      status: "assigned",
      driver: { name: "Ana", phone: "+15145550111" },
    });
    expect(row.dispatch.active?.courierDistanceMeters).toBeLessThan(200);

    const unknown = await doorDashWebhook({
      event_name: "DASHER_CONFIRMED",
      external_delivery_id: "nope",
    });
    expect(await unknown.json()).toMatchObject({ applied: false });
  });

  it("answers 503 when the webhook secret is not configured", async () => {
    const res = await doorDashWebhook({
      event_name: "DASHER_CONFIRMED",
      external_delivery_id: "x",
    });
    expect(res.status).toBe(503);
    const uber = await handleUberWebhook(
      new Request("https://pppmtl.com/x", { method: "POST", body: "{}" }),
    );
    expect(uber.status).toBe(503);
  });

  it("books Uber, then applies its HMAC-signed webhooks (status and courier location)", async () => {
    stubEnv({ ...UBER_ENV, UBER_DIRECT_WEBHOOK_SECRET: UBER_WEBHOOK_SECRET });
    const order = saveOrder(paidDeliveryOrder());
    const calls = mockFetch(uberTokenResponder(), uberQuoteResponder(), (c) =>
      c.url.endsWith("/deliveries") && c.method === "POST"
        ? {
            status: 200,
            body: { id: "del_abc", status: "pending", fee: 850, currency: "cad", live_mode: true },
          }
        : null,
    );
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    const booked = await bookCourier({
      orderId: order.id,
      provider: "uber",
      quoteId: "dqt_test_quote",
      tipCents: 0,
      by: "Sam",
    });
    expect(booked).toMatchObject({
      ok: true,
      data: { active: { externalId: "del_abc", status: "requested" } },
    });
    expect(
      json<{ idempotency_key: string }>(calls.find((c) => c.url.endsWith("/deliveries")))
        .idempotency_key,
    ).toMatch(/^dsp_/);

    const send = (payload: Record<string, unknown>, key = UBER_WEBHOOK_SECRET) => {
      const raw = JSON.stringify(payload);
      return handleUberWebhook(
        new Request("https://pppmtl.com/api/public/webhooks/uber", {
          method: "POST",
          headers: { "x-uber-signature": createHmac("sha256", key).update(raw).digest("hex") },
          body: raw,
        }),
      );
    };
    expect(
      (
        await send(
          { kind: "event.delivery_status", delivery_id: "del_abc", status: "pickup" },
          "wrong-key-0123456789",
        )
      ).status,
    ).toBe(401);
    const status = await send({
      kind: "event.delivery_status",
      id: "evt_1",
      delivery_id: "del_abc",
      status: "pickup",
      created: new Date().toISOString(),
      data: { id: "del_abc", status: "pickup", courier: { name: "Alex I.", vehicle_type: "car" } },
    });
    expect(await status.json()).toMatchObject({ applied: true });
    await send({
      kind: "event.courier_update",
      delivery_id: "del_abc",
      location: { lat: 45.4706, lng: -73.6353 },
      data: { id: "del_abc" },
    });
    const row = (await dispatchBoard()).orders.find((o) => o.id === order.id)!;
    expect(row.dispatch.active).toMatchObject({
      status: "assigned",
      driver: { name: "Alex I.", vehicle: "car", location: { lat: 45.4706, lng: -73.6353 } },
    });
  });

  it("an Uber webhook adopts a booking whose answer was lost (by our order number)", async () => {
    stubEnv({ ...UBER_ENV, UBER_DIRECT_WEBHOOK_SECRET: UBER_WEBHOOK_SECRET });
    const order = saveOrder(paidDeliveryOrder());
    mockFetch(uberTokenResponder(), uberQuoteResponder(), (c) =>
      c.url.endsWith("/deliveries") ? { status: 504 } : null,
    );
    await findDrivers(order.id, "Sam");
    const booked = await bookCourier({
      orderId: order.id,
      provider: "uber",
      quoteId: "dqt_test_quote",
      tipCents: 0,
      by: "Sam",
    });
    expect(booked).toMatchObject({ ok: false });
    let row = (await dispatchBoard()).orders.find((o) => o.id === order.id)!;
    expect(row.dispatch.active).toMatchObject({ status: "booking", externalId: null });

    const raw = JSON.stringify({
      kind: "event.delivery_status",
      delivery_id: "del_lost",
      status: "pending",
      data: {
        id: "del_lost",
        status: "pending",
        external_id: "PPP-AB12C",
        tracking_url: "https://u/t",
      },
    });
    await handleUberWebhook(
      new Request("https://pppmtl.com/api/public/webhooks/uber", {
        method: "POST",
        headers: {
          "x-postmates-signature": createHmac("sha256", UBER_WEBHOOK_SECRET)
            .update(raw)
            .digest("hex"),
        },
        body: raw,
      }),
    );
    row = (await dispatchBoard()).orders.find((o) => o.id === order.id)!;
    expect(row.dispatch.active).toMatchObject({
      status: "requested",
      externalId: "del_lost",
      trackingUrl: "https://u/t",
    });
  });

  it("cancels through the provider; a 409 leaves the dispatch in place", async () => {
    stubEnv(DD_ENV);
    const order = saveOrder(paidDeliveryOrder());
    let cancelStatus = 409;
    mockFetch(doorDashQuoteResponder(), doorDashAccept(), (c) =>
      c.url.endsWith("/cancel") && c.method === "PUT"
        ? { status: cancelStatus, body: { code: "x", message: "cannot cancel" } }
        : null,
    );
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    await bookCourier({
      orderId: order.id,
      provider: "doordash",
      quoteId: found.data.options[0]!.quoteId!,
      tipCents: 0,
      by: "Sam",
    });

    expect(await cancelCourier({ orderId: order.id, reason: "", by: "Sam" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("can no longer be cancelled"),
    });
    cancelStatus = 200;
    expect(
      await cancelCourier({ orderId: order.id, reason: "customer cancelled", by: "Sam" }),
    ).toMatchObject({
      ok: true,
      data: { active: { status: "cancelled", note: "customer cancelled (Sam)" } },
    });
    // The order is free again: the own driver can take it.
    const own = await assignOwnDriver({
      orderId: order.id,
      name: "Ali",
      phone: "514 555 0100",
      sendText: false,
      by: "Sam",
    });
    expect(own).toMatchObject({
      ok: true,
      data: {
        active: { provider: "own_driver", feeCents: 0 },
        history: [{ provider: "doordash" }],
      },
    });
  });

  it("Refresh resolves an uncertain DoorDash booking: 404 means nothing was booked", async () => {
    stubEnv(DD_ENV);
    const order = saveOrder(paidDeliveryOrder());
    mockFetch(
      doorDashQuoteResponder(),
      (c) => (c.url.endsWith("/accept") ? { status: 500 } : null),
      (c) =>
        c.method === "GET" && c.url.includes("/drive/v2/deliveries/")
          ? { status: 404, body: { code: "not_found" } }
          : null,
    );
    const found = await findDrivers(order.id, "Sam");
    if (!found.ok) throw new Error(found.error);
    await bookCourier({
      orderId: order.id,
      provider: "doordash",
      quoteId: found.data.options[0]!.quoteId!,
      tipCents: 0,
      by: "Sam",
    });
    expect((await dispatchBoard()).orders[0]!.dispatch.active?.status).toBe("booking");
    expect(await refreshCourier(order.id)).toMatchObject({
      ok: true,
      data: { active: { status: "failed" } },
    });
  });
});

describe("own driver and Skip", () => {
  it("assigns the own driver and texts them through Twilio when configured", async () => {
    stubEnv({
      TWILIO_ACCOUNT_SID: "AC1",
      TWILIO_AUTH_TOKEN: "tok",
      TWILIO_FROM_NUMBER: "+15145550000",
    });
    const order = saveOrder(paidDeliveryOrder());
    const calls = mockFetch((c) =>
      c.url.includes("api.twilio.com") ? { status: 201, body: { sid: "SM1" } } : null,
    );
    const result = await assignOwnDriver({
      orderId: order.id,
      name: "Ali",
      phone: "514-555-0100",
      sendText: true,
      by: "Sam",
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        active: {
          provider: "own_driver",
          status: "assigned",
          driver: { name: "Ali", phone: "+15145550100" },
          note: expect.stringContaining("sent"),
        },
      },
    });
    const sms = new URLSearchParams(calls[0]!.body ?? "");
    expect(sms.get("To")).toBe("+15145550100");
    expect(sms.get("Body")).toContain("PPP-AB12C");
    expect(sms.get("Body")).toContain("5555 Av. de Monkland");
    // The driver is now offered on the next order.
    const board = await dispatchBoard();
    expect(board.savedDrivers).toContainEqual({
      name: "Ali",
      phone: "+15145550100",
    });
    // The checkout's delivery fee and tip are shown to staff.
    expect(board.orders[0]).toMatchObject({ deliveryFeeCents: 500, tipCents: 400 });
  });

  it("without Twilio, assigns the driver and says no text was sent", async () => {
    const order = saveOrder(paidDeliveryOrder());
    const calls = mockFetch();
    const result = await assignOwnDriver({
      orderId: order.id,
      name: "Ali",
      phone: null,
      sendText: true,
      by: "Sam",
    });
    expect(result).toMatchObject({
      ok: true,
      data: { active: { note: expect.stringContaining("not set up") } },
    });
    expect(calls).toHaveLength(0);
    expect(
      await assignOwnDriver({
        orderId: order.id,
        name: "",
        phone: null,
        sendText: false,
        by: "Sam",
      }),
    ).toMatchObject({ ok: false });
  });

  it("records a Skip booking made in Skip's portal", async () => {
    const order = saveOrder(paidDeliveryOrder());
    expect(
      await recordSkipBooking({ orderId: order.id, reference: "SK-991", by: "Sam" }),
    ).toMatchObject({
      ok: true,
      data: {
        active: {
          provider: "skip",
          status: "requested",
          feeCents: null,
          note: expect.stringContaining("SK-991"),
        },
      },
    });
  });
});
