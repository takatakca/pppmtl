import { describe, expect, it } from "vitest";
import type { CourierDeliveryUpdate, StoredQuote } from "../couriers/types";
import {
  applyProviderUpdate,
  cancelDispatch,
  emptyDispatch,
  failBooking,
  findQuote,
  readDispatch,
  staffProgress,
  startDispatch,
  withQuotes,
  type DispatchState,
} from "../dispatch-state";

const t0 = new Date("2026-10-31T22:00:00Z");
const quote: StoredQuote = {
  provider: "doordash",
  quoteId: "PPP-AB12C-abc",
  feeCents: 975,
  currency: "CAD",
  pickupEta: "2026-10-31T22:12:00Z",
  dropoffEta: "2026-10-31T22:32:00Z",
  distanceMeters: null,
  expiresAt: "2026-10-31T22:05:00Z",
  sandbox: false,
};

function update(partial: Partial<CourierDeliveryUpdate>): CourierDeliveryUpdate {
  return {
    externalId: "PPP-AB12C-abc",
    status: "requested",
    providerStatus: "created",
    trackingUrl: null,
    feeCents: null,
    currency: null,
    pickupEta: null,
    dropoffEta: null,
    driver: null,
    providerUpdatedAt: null,
    sandbox: null,
    cancelReason: null,
    ...partial,
  };
}

function booked(): DispatchState {
  const quoted = withQuotes(emptyDispatch(), [quote], "Sam", t0);
  const started = startDispatch(quoted, {
    id: "dsp_1",
    provider: "doordash",
    status: "booking",
    by: "Sam",
    now: t0,
    quote,
    externalId: quote.quoteId,
    tipCents: 300,
  });
  if (!started.ok) throw new Error(started.error);
  return applyProviderUpdate(started.state, update({ trackingUrl: "https://t" }), "api", t0, {
    dispatchId: "dsp_1",
  }).state;
}

describe("dispatch record on the order", () => {
  it("reads a missing or malformed stored value as no dispatch", () => {
    expect(readDispatch(undefined)).toEqual(emptyDispatch());
    expect(readDispatch("x")).toEqual(emptyDispatch());
    expect(readDispatch({ active: { nope: true }, history: "bad" })).toEqual(emptyDispatch());
  });

  it("finds a stored quote and refuses an expired or unknown one", () => {
    const state = withQuotes(emptyDispatch(), [quote], "Sam", t0);
    expect(findQuote(state, "doordash", quote.quoteId, t0)).toMatchObject({ ok: true });
    expect(findQuote(state, "uber", quote.quoteId, t0)).toMatchObject({ ok: false });
    expect(findQuote(state, "doordash", "other", t0)).toMatchObject({ ok: false });
    expect(
      findQuote(state, "doordash", quote.quoteId, new Date("2026-10-31T22:05:00Z")),
    ).toMatchObject({ ok: false, expired: true });
  });

  it("records who chose which courier, and allows only one live dispatch", () => {
    const state = booked();
    expect(state.active).toMatchObject({
      provider: "doordash",
      status: "requested",
      chosenBy: "Sam",
      chosenAt: t0.toISOString(),
      feeCents: 975,
      tipCents: 300,
      trackingUrl: "https://t",
      externalId: "PPP-AB12C-abc",
    });
    const second = startDispatch(state, {
      id: "dsp_2",
      provider: "own_driver",
      status: "assigned",
      by: "Lea",
      now: t0,
    });
    expect(second).toMatchObject({ ok: false });
  });

  it("moves forward on provider updates and ignores a late, older webhook", () => {
    let state = booked();
    state = applyProviderUpdate(
      state,
      update({
        status: "picked_up",
        providerStatus: "DASHER_PICKED_UP",
        providerUpdatedAt: "2026-10-31T22:15:00Z",
        driver: {
          name: "Ana",
          phone: "+15145550000",
          vehicle: null,
          location: { lat: 45.47, lng: -73.63 },
        },
      }),
      "webhook",
      t0,
    ).state;
    const late = applyProviderUpdate(
      state,
      update({ status: "assigned", providerUpdatedAt: "2026-10-31T22:10:00Z" }),
      "webhook",
      t0,
    );
    expect(late.changed).toBe(false);
    expect(late.state.active).toMatchObject({ status: "picked_up", driver: { name: "Ana" } });
    // An update about another delivery is never applied.
    expect(applyProviderUpdate(state, update({ externalId: "other" }), "webhook", t0).changed).toBe(
      false,
    );
  });

  it("keeps a delivered dispatch delivered, but lets cancelled become returned", () => {
    let state = applyProviderUpdate(booked(), update({ status: "delivered" }), "webhook", t0).state;
    state = applyProviderUpdate(state, update({ status: "picked_up" }), "webhook", t0).state;
    expect(state.active?.status).toBe("delivered");
    let cancelled = applyProviderUpdate(
      booked(),
      update({ status: "cancelled" }),
      "webhook",
      t0,
    ).state;
    cancelled = applyProviderUpdate(cancelled, update({ status: "returned" }), "webhook", t0).state;
    expect(cancelled.active?.status).toBe("returned");
  });

  it("a location ping (no status) changes nothing but the courier", () => {
    const state = applyProviderUpdate(
      booked(),
      update({
        status: null,
        driver: { name: null, phone: null, vehicle: null, location: { lat: 1, lng: 2 } },
      }),
      "webhook",
      t0,
    ).state;
    expect(state.active).toMatchObject({
      status: "requested",
      driver: { location: { lat: 1, lng: 2 } },
    });
    expect(state.active?.events.map((e) => e.status)).toEqual(["booking", "requested"]);
  });

  it("a failed booking frees the order, and a later provider update for it revives it", () => {
    const quoted = withQuotes(emptyDispatch(), [quote], "Sam", t0);
    const started = startDispatch(quoted, {
      id: "dsp_1",
      provider: "doordash",
      status: "booking",
      by: "Sam",
      now: t0,
      quote,
      externalId: quote.quoteId,
    });
    if (!started.ok) throw new Error(started.error);
    const failed = failBooking(started.state, "dsp_1", "refused", t0);
    expect(failed.active).toMatchObject({ status: "failed", note: "refused" });
    expect(
      applyProviderUpdate(failed, update({ status: "assigned" }), "webhook", t0).state.active
        ?.status,
    ).toBe("assigned");
    const again = startDispatch(failed, {
      id: "dsp_2",
      provider: "skip",
      status: "requested",
      by: "Lea",
      now: t0,
    });
    expect(again.ok && again.state.history.map((h) => h.id)).toEqual(["dsp_1"]);
  });

  it("cancels a live dispatch once and lets staff progress only manual ones", () => {
    const state = booked();
    expect(staffProgress(state, "delivered", "Sam", t0)).toMatchObject({ ok: false });
    const cancelled = cancelDispatch(state, "Sam", "customer called", t0);
    expect(cancelled.ok && cancelled.state.active).toMatchObject({
      status: "cancelled",
      note: "customer called (Sam)",
    });
    if (cancelled.ok)
      expect(cancelDispatch(cancelled.state, "Sam", "", t0)).toMatchObject({ ok: false });

    const own = startDispatch(emptyDispatch(), {
      id: "dsp_3",
      provider: "own_driver",
      status: "assigned",
      by: "Sam",
      now: t0,
      feeCents: 0,
      driver: { name: "Ali", phone: null, vehicle: null, location: null },
    });
    if (!own.ok) throw new Error(own.error);
    const delivered = staffProgress(own.state, "delivered", "Sam", t0);
    expect(delivered.ok && delivered.state.active?.status).toBe("delivered");
  });
});
