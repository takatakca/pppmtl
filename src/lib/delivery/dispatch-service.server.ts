/**
 * Courier dispatch for paid website DELIVERY orders. SERVER ONLY.
 *
 * Callers must have checked the administrator session first (dispatch-handlers.server.ts does). Nothing here
 * trusts a price from the browser: booking names a quote the server stored on the order a moment ago.
 */
import { randomBytes } from "node:crypto";
import { dispatchPickup } from "@/config/delivery-dispatch";
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import type { IntegrationProviderId } from "@/lib/integration/core/contracts";
import { getOrderById, listRecentOrders } from "@/lib/orders/order-service";
import type { InternalOrder } from "@/lib/orders/types";
import { distanceMeters, parseDeliveryAddress, toE164 } from "./couriers/address";
import { doorDashProvider } from "./couriers/doordash.server";
import {
  configuredDrivers,
  driverMessage,
  driverSmsConfigured,
  textDriver,
  type SavedDriver,
} from "./couriers/own-driver.server";
import { rankCourierOptions } from "./couriers/ranking";
import { skipOption } from "./couriers/skip";
import {
  COURIER_LABELS,
  type CourierDeliveryUpdate,
  type CourierOption,
  type CourierProvider,
  type CourierQuoteResult,
  type CourierRequest,
  type OnDemandProviderId,
  type StoredQuote,
} from "./couriers/types";
import { uberProvider } from "./couriers/uber.server";
import {
  applyProviderUpdate,
  cancelDispatch,
  failBooking,
  findQuote,
  isLive,
  setNote,
  staffProgress,
  startDispatch,
  withQuotes,
  type DispatchRecord,
  type DispatchState,
} from "./dispatch-state";
import {
  dispatchOf,
  findOrderForDelivery,
  mutateOrderDispatch,
  type DispatchOrder,
} from "./dispatch-store.server";

export const COURIER_PROVIDERS: Record<OnDemandProviderId, CourierProvider> = {
  doordash: doorDashProvider,
  uber: uberProvider,
};

const LOG_PROVIDER: Record<OnDemandProviderId, IntegrationProviderId> = {
  doordash: "doordash",
  uber: "uber_direct",
};

export type DispatchResult<T> = { ok: true; data: T } | { ok: false; error: string };

function newDispatchId(): string {
  return `dsp_${randomBytes(9).toString("hex")}`;
}

/* ---------------------------------------------------------------- order → request */

export function dispatchEligibility(
  order: InternalOrder,
): { ok: true } | { ok: false; reason: string } {
  if (order.orderType !== "DELIVERY") return { ok: false, reason: "This is not a delivery order." };
  if (order.status === "CANCELLED" || order.status === "FAILED") {
    return { ok: false, reason: "This order was cancelled or failed." };
  }
  if (order.paymentStatus !== "PAID") {
    return {
      ok: false,
      reason: "Waiting for payment: a courier can be booked once Clover confirms it.",
    };
  }
  return { ok: true };
}

export function courierRequestFor(
  order: InternalOrder,
): { ok: true; request: CourierRequest } | { ok: false; reason: string } {
  const address = parseDeliveryAddress(order.deliveryAddress);
  if (!address) {
    return {
      ok: false,
      reason: "The delivery address could not be read (street, city, postal code).",
    };
  }
  const phone = toE164(order.customer.phone);
  if (!phone)
    return { ok: false, reason: "The customer's phone number is not a valid Canadian number." };
  return {
    ok: true,
    request: {
      orderId: order.id,
      orderNumber: order.orderNumber ?? order.id,
      pickup: {
        businessName: dispatchPickup.businessName,
        address: {
          street: dispatchPickup.street,
          unit: null,
          city: dispatchPickup.city,
          province: dispatchPickup.province,
          postalCode: dispatchPickup.postalCode,
          country: "CA",
          instructions: null,
        },
        phoneE164: dispatchPickup.phoneE164,
        latitude: dispatchPickup.latitude,
        longitude: dispatchPickup.longitude,
        instructions: dispatchPickup.instructions,
      },
      dropoff: {
        address,
        contactName: order.customer.name?.trim().slice(0, 80) || "Client",
        phoneE164: phone,
        email: order.customer.email,
      },
      orderValueCents: Math.max(0, order.subtotal),
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPriceCents: i.unitPrice,
      })),
      currency: "CAD",
    },
  };
}

/** Optional order fields the checkout may add (delivery fee, tip, cents). Never required here. */
function optionalCents(order: InternalOrder, key: "deliveryFee" | "tip"): number | null {
  const value = (order as unknown as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/* ---------------------------------------------------------------- views */

export interface DispatchView {
  active: (DispatchRecord & { courierDistanceMeters: number | null }) | null;
  history: DispatchRecord[];
  quotesAt: string | null;
}

export function dispatchView(state: DispatchState): DispatchView {
  const active = state.active;
  const location = active?.driver?.location ?? null;
  return {
    active: active
      ? {
          ...active,
          courierDistanceMeters: location
            ? distanceMeters(location, {
                lat: dispatchPickup.latitude,
                lng: dispatchPickup.longitude,
              })
            : null,
        }
      : null,
    history: state.history,
    quotesAt: state.quotes?.requestedAt ?? null,
  };
}

export interface DispatchBoardRow {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  status: InternalOrder["status"];
  paymentStatus: InternalOrder["paymentStatus"];
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  subtotal: number;
  total: number | null;
  deliveryFeeCents: number | null;
  tipCents: number | null;
  items: Array<{ name: string; quantity: number }>;
  eligible: boolean;
  eligibilityReason: string | null;
  addressReadable: boolean;
  dispatch: DispatchView;
}

export interface DispatchBoard {
  generatedAt: string;
  providers: Array<{
    id: OnDemandProviderId;
    label: string;
    configured: boolean;
    sandbox: boolean;
  }>;
  smsConfigured: boolean;
  savedDrivers: SavedDriver[];
  skipPortalUrl: string | null;
  orders: DispatchBoardRow[];
}

function boardRow(order: DispatchOrder): DispatchBoardRow {
  const eligibility = dispatchEligibility(order);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    deliveryAddress: order.deliveryAddress,
    subtotal: order.subtotal,
    total: order.total,
    deliveryFeeCents: optionalCents(order, "deliveryFee"),
    tipCents: optionalCents(order, "tip"),
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    eligible: eligibility.ok,
    eligibilityReason: eligibility.ok ? null : eligibility.reason,
    addressReadable: parseDeliveryAddress(order.deliveryAddress) !== null,
    dispatch: dispatchView(dispatchOf(order)),
  };
}

/** Saved drivers from PPP_OWN_DRIVERS first, then drivers used on recent orders. */
export function knownDrivers(orders: DispatchOrder[]): SavedDriver[] {
  const out = [...configuredDrivers()];
  for (const order of orders) {
    const state = dispatchOf(order);
    for (const record of [state.active, ...state.history]) {
      if (record?.provider !== "own_driver" || !record.driver?.name) continue;
      const phone = toE164(record.driver.phone);
      const name = record.driver.name;
      if (out.some((d) => (phone && d.phone === phone) || d.name === name)) continue;
      if (phone) out.push({ name, phone });
      if (out.length >= 20) return out;
    }
  }
  return out;
}

export async function dispatchBoard(): Promise<DispatchBoard> {
  const orders = (await listRecentOrders(60)).filter(
    (o) => o.orderType === "DELIVERY",
  ) as DispatchOrder[];
  const portal = process.env["SKIP_PORTAL_URL"];
  return {
    generatedAt: new Date().toISOString(),
    providers: (Object.keys(COURIER_PROVIDERS) as OnDemandProviderId[]).map((id) => ({
      id,
      label: COURIER_PROVIDERS[id].label,
      configured: COURIER_PROVIDERS[id].configured(),
      sandbox: COURIER_PROVIDERS[id].sandbox(),
    })),
    smsConfigured: driverSmsConfigured(),
    savedDrivers: knownDrivers(orders),
    skipPortalUrl: skipOption(portal).manualUrl,
    orders: orders.map(boardRow),
  };
}

/* ---------------------------------------------------------------- find a driver */

async function loadEligible(
  orderId: string,
): Promise<{ ok: true; order: DispatchOrder } | { ok: false; error: string }> {
  const order = (await getOrderById(orderId)) as DispatchOrder | null;
  if (!order) return { ok: false, error: "Order not found." };
  const eligibility = dispatchEligibility(order);
  if (!eligibility.ok) return { ok: false, error: eligibility.reason };
  return { ok: true, order };
}

function quoteOption(provider: CourierProvider, result: CourierQuoteResult): CourierOption {
  const base: CourierOption = {
    provider: provider.id,
    label: provider.label,
    availability: "available",
    reason: null,
    quoteId: null,
    feeCents: null,
    currency: null,
    pickupEta: null,
    dropoffEta: null,
    distanceMeters: null,
    expiresAt: null,
    sandbox: provider.sandbox(),
    manualUrl: null,
    badges: [],
  };
  if (!result.ok) return { ...base, availability: result.availability, reason: result.reason };
  const q = result.quote;
  return {
    ...base,
    quoteId: q.quoteId,
    feeCents: q.feeCents,
    currency: q.currency,
    pickupEta: q.pickupEta,
    dropoffEta: q.dropoffEta,
    distanceMeters: q.distanceMeters,
    expiresAt: q.expiresAt,
    sandbox: q.sandbox,
  };
}

function ownDriverOption(): CourierOption {
  return {
    provider: "own_driver",
    label: COURIER_LABELS.own_driver,
    availability: "manual",
    reason: null,
    quoteId: null,
    feeCents: 0,
    currency: "CAD",
    pickupEta: null,
    dropoffEta: null,
    distanceMeters: null,
    expiresAt: null,
    sandbox: false,
    manualUrl: null,
    badges: [],
  };
}

export interface FindDriversResult {
  options: CourierOption[];
  dispatch: DispatchView;
}

/** Ask DoorDash and Uber at the same time; Skip and the own driver are always listed. */
export async function findDrivers(
  orderId: string,
  by: string,
  now = new Date(),
): Promise<DispatchResult<FindDriversResult>> {
  const loaded = await loadEligible(orderId);
  if (!loaded.ok) return loaded;
  const request = courierRequestFor(loaded.order);

  const providers = Object.values(COURIER_PROVIDERS);
  const results = await Promise.all(
    providers.map(async (provider): Promise<CourierQuoteResult> => {
      if (!provider.configured()) {
        return {
          ok: false,
          availability: "not_connected",
          reason: `No live price: add the ${provider.label} keys on the server (docs/integrations/couriers.md).`,
        };
      }
      if (!request.ok) return { ok: false, availability: "unavailable", reason: request.reason };
      return provider.quote(request.request, now);
    }),
  );
  results.forEach((result, i) => {
    const provider = providers[i]!;
    if (!provider.configured()) return;
    logIntegrationEvent({
      provider: LOG_PROVIDER[provider.id],
      eventType: "courier.quote",
      status: result.ok ? "processed" : "rejected",
      payloadReference: orderId,
      detail: result.ok
        ? `fee ${result.quote.feeCents} ${result.quote.currency}`
        : result.availability,
    });
  });

  const quotes: StoredQuote[] = results.flatMap((r) => (r.ok ? [r.quote] : []));
  // Always replace the round: an older quote can no longer be booked once staff asked again.
  const saved = await mutateOrderDispatch(orderId, (_o, s) => ({
    ok: true,
    state: withQuotes(s, quotes, by, now),
  }));
  if (!saved.ok) return { ok: false, error: saved.error };

  const options = rankCourierOptions(
    [
      ...providers.map((p, i) => quoteOption(p, results[i]!)),
      skipOption(process.env["SKIP_PORTAL_URL"]),
      ownDriverOption(),
    ],
    now.getTime(),
  );
  return { ok: true, data: { options, dispatch: dispatchView(saved.state) } };
}

/* ---------------------------------------------------------------- book */

function logDispatch(
  provider: OnDemandProviderId | "local",
  orderId: string,
  event: string,
  ok: boolean,
  detail: string,
) {
  logIntegrationEvent({
    provider: provider === "local" ? "local" : LOG_PROVIDER[provider],
    eventType: `courier.${event}`,
    status: ok ? "processed" : "rejected",
    payloadReference: orderId,
    detail,
  });
}

export async function bookCourier(input: {
  orderId: string;
  provider: OnDemandProviderId;
  quoteId: string;
  tipCents: number;
  by: string;
  now?: Date;
}): Promise<DispatchResult<DispatchView>> {
  const now = input.now ?? new Date();
  const loaded = await loadEligible(input.orderId);
  if (!loaded.ok) return loaded;
  const request = courierRequestFor(loaded.order);
  if (!request.ok) return { ok: false, error: request.reason };
  const provider = COURIER_PROVIDERS[input.provider];
  if (!provider.configured()) return { ok: false, error: `${provider.label} is not connected.` };

  // Claim under the order's row lock: a second tablet gets "already being booked".
  const id = newDispatchId();
  const picked: { quote: StoredQuote | null } = { quote: null };
  const claim = await mutateOrderDispatch(input.orderId, (order, state) => {
    const eligibility = dispatchEligibility(order);
    if (!eligibility.ok) return { ok: false, error: eligibility.reason };
    const found = findQuote(state, input.provider, input.quoteId, now);
    if (!found.ok) return { ok: false, error: found.error };
    picked.quote = found.quote;
    return startDispatch(state, {
      id,
      provider: input.provider,
      status: "booking",
      by: input.by,
      now,
      quote: found.quote,
      // DoorDash: the quote's external_delivery_id IS the delivery id, known before the answer.
      externalId: input.provider === "doordash" ? found.quote.quoteId : null,
      tipCents: input.tipCents,
    });
  });
  const quote = picked.quote;
  if (!claim.ok || !quote) return { ok: false, error: claim.ok ? "Quote not found." : claim.error };

  const result = await provider.book({
    request: request.request,
    quote,
    tipCents: input.tipCents,
    attemptKey: id,
  });
  const finished = await mutateOrderDispatch(input.orderId, (_o, state) => {
    if (result.ok) {
      const update: CourierDeliveryUpdate = {
        ...result.update,
        status: result.update.status ?? "requested",
      };
      return {
        ok: true,
        state: applyProviderUpdate(state, update, "api", new Date(), { dispatchId: id }).state,
      };
    }
    if (result.uncertain) return { ok: true, state: setNote(state, id, result.reason) };
    return { ok: true, state: failBooking(state, id, result.reason, new Date()) };
  });
  logDispatch(
    input.provider,
    input.orderId,
    "book",
    result.ok,
    result.ok ? (result.update.providerStatus ?? "") : result.reason,
  );
  if (!finished.ok) return { ok: false, error: finished.error };
  if (!result.ok) return { ok: false, error: result.reason };
  return { ok: true, data: dispatchView(finished.state) };
}

/* ---------------------------------------------------------------- manual: own driver, Skip */

export async function assignOwnDriver(input: {
  orderId: string;
  name: string;
  phone: string | null;
  sendText: boolean;
  by: string;
  now?: Date;
}): Promise<DispatchResult<DispatchView>> {
  const now = input.now ?? new Date();
  const loaded = await loadEligible(input.orderId);
  if (!loaded.ok) return loaded;
  const name = input.name.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, error: "Enter the driver's name." };
  const phone = input.phone?.trim() ? toE164(input.phone) : null;
  if (input.phone?.trim() && !phone)
    return { ok: false, error: "The driver's phone number is not valid." };

  const id = newDispatchId();
  const started = await mutateOrderDispatch(input.orderId, (order, state) => {
    const eligibility = dispatchEligibility(order);
    if (!eligibility.ok) return { ok: false, error: eligibility.reason };
    return startDispatch(state, {
      id,
      provider: "own_driver",
      status: "assigned",
      by: input.by,
      now,
      feeCents: 0,
      driver: { name, phone, vehicle: null, location: null },
    });
  });
  if (!started.ok) return { ok: false, error: started.error };
  logDispatch("local", input.orderId, "own_driver", true, "assigned");

  if (!input.sendText) return { ok: true, data: dispatchView(started.state) };
  let note: string;
  const request = courierRequestFor(loaded.order);
  if (!driverSmsConfigured()) note = "No text sent: texting (Twilio) is not set up.";
  else if (!phone) note = "No text sent: no driver phone number.";
  else if (!request.ok) note = `No text sent: ${request.reason}`;
  else {
    const sms = await textDriver(phone, driverMessage(request.request));
    note = sms.sent ? "Text with pickup and drop-off sent to the driver." : sms.reason;
  }
  const noted = await mutateOrderDispatch(input.orderId, (_o, state) => ({
    ok: true,
    state: setNote(state, id, note),
  }));
  return { ok: true, data: dispatchView(noted.ok ? noted.state : started.state) };
}

export async function recordSkipBooking(input: {
  orderId: string;
  reference: string;
  by: string;
  now?: Date;
}): Promise<DispatchResult<DispatchView>> {
  const now = input.now ?? new Date();
  const loaded = await loadEligible(input.orderId);
  if (!loaded.ok) return loaded;
  const reference = input.reference.trim();
  const id = newDispatchId();
  const started = await mutateOrderDispatch(input.orderId, (order, state) => {
    const eligibility = dispatchEligibility(order);
    if (!eligibility.ok) return { ok: false, error: eligibility.reason };
    return startDispatch(state, {
      id,
      provider: "skip",
      status: "requested",
      by: input.by,
      now,
      feeCents: null,
      externalId: reference || null,
      note: reference
        ? `Booked in the Skip portal — reference ${reference}`
        : "Booked in the Skip portal",
    });
  });
  if (!started.ok) return { ok: false, error: started.error };
  return { ok: true, data: dispatchView(started.state) };
}

export async function markDispatchProgress(input: {
  orderId: string;
  status: "picked_up" | "delivered";
  by: string;
}): Promise<DispatchResult<DispatchView>> {
  const changed = await mutateOrderDispatch(input.orderId, (_o, state) =>
    staffProgress(state, input.status, input.by, new Date()),
  );
  return changed.ok
    ? { ok: true, data: dispatchView(changed.state) }
    : { ok: false, error: changed.error };
}

/* ---------------------------------------------------------------- cancel, refresh */

export async function cancelCourier(input: {
  orderId: string;
  reason: string;
  by: string;
}): Promise<DispatchResult<DispatchView>> {
  const order = (await getOrderById(input.orderId)) as DispatchOrder | null;
  if (!order) return { ok: false, error: "Order not found." };
  const active = dispatchOf(order).active;
  if (!isLive(active)) return { ok: false, error: "There is no courier to cancel on this order." };

  let reason = input.reason.trim();
  let endStatus: "cancelled" | "failed" = "cancelled";
  if (active.provider === "doordash" || active.provider === "uber") {
    const provider = COURIER_PROVIDERS[active.provider];
    if (active.externalId) {
      const result = await provider.cancel(active.externalId);
      logDispatch(
        active.provider,
        input.orderId,
        "cancel",
        result.ok,
        result.ok ? "cancelled" : result.reason,
      );
      if (!result.ok) {
        // Never created on the provider's side (a booking that did not go through): nothing to cancel there.
        if (!result.notFound || (active.status !== "booking" && active.status !== "requested")) {
          return { ok: false, error: result.reason };
        }
        endStatus = "failed";
        reason = `${provider.label} has no such delivery — nothing was booked`;
      }
    } else {
      // An Uber booking whose answer never came: staff checked Uber's dashboard and release it.
      endStatus = "failed";
      reason = `Released by staff — confirm in ${provider.label}'s dashboard that no courier is coming`;
    }
  }
  const changed = await mutateOrderDispatch(input.orderId, (_o, state) => {
    if (state.active?.id !== active.id)
      return { ok: false, error: "The dispatch changed meanwhile. Refresh." };
    return cancelDispatch(state, input.by, reason, new Date(), endStatus);
  });
  return changed.ok
    ? { ok: true, data: dispatchView(changed.state) }
    : { ok: false, error: changed.error };
}

export async function refreshCourier(orderId: string): Promise<DispatchResult<DispatchView>> {
  const order = (await getOrderById(orderId)) as DispatchOrder | null;
  if (!order) return { ok: false, error: "Order not found." };
  const state = dispatchOf(order);
  const active = state.active;
  if (
    !active ||
    (active.provider !== "doordash" && active.provider !== "uber") ||
    !active.externalId
  ) {
    return { ok: true, data: dispatchView(state) };
  }
  const result = await COURIER_PROVIDERS[active.provider].status(active.externalId);
  const changed = await mutateOrderDispatch(orderId, (_o, current) => {
    if (result.ok) {
      return {
        ok: true,
        state: applyProviderUpdate(current, result.update, "api", new Date(), {
          dispatchId: active.id,
        }).state,
      };
    }
    if (
      result.notFound &&
      current.active?.id === active.id &&
      current.active.status === "booking"
    ) {
      return {
        ok: true,
        state: failBooking(
          current,
          active.id,
          `${COURIER_LABELS[active.provider]} has no such delivery — nothing was booked`,
          new Date(),
        ),
      };
    }
    return { ok: false, error: result.reason };
  });
  return changed.ok
    ? { ok: true, data: dispatchView(changed.state) }
    : { ok: false, error: changed.error };
}

/* ---------------------------------------------------------------- webhooks */

/**
 * Apply a verified provider webhook. Returns whether an order was updated. A database error propagates so the
 * webhook answers 503 and the provider retries.
 */
export async function applyCourierWebhook(
  provider: OnDemandProviderId,
  update: CourierDeliveryUpdate,
  orderNumberHint: string | null = null,
): Promise<{ applied: boolean; orderId: string | null }> {
  const order = await findOrderForDelivery(
    update.externalId,
    provider === "uber" ? orderNumberHint : null,
  );
  if (!order) return { applied: false, orderId: null };
  let applied = false;
  await mutateOrderDispatch(order.id, (_o, state) => {
    const active = state.active;
    // Uber booking whose answer was lost: its webhook (carrying our order number) adopts the delivery id.
    const adopt =
      provider === "uber" &&
      active?.provider === "uber" &&
      active.externalId === null &&
      (active.status === "booking" || active.status === "failed");
    if (active?.provider !== provider) return { ok: false, error: "unchanged" };
    const result = applyProviderUpdate(
      state,
      update,
      "webhook",
      new Date(),
      adopt ? { dispatchId: active.id } : {},
    );
    applied = result.changed;
    // Nothing to write (another delivery, or a late event): no UPDATE at all.
    return result.changed ? { ok: true, state: result.state } : { ok: false, error: "unchanged" };
  });
  return { applied, orderId: order.id };
}
