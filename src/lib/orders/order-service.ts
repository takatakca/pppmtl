/**
 * PPP ORDER SERVICE — SERVER ONLY.
 *
 * The single place an order is validated, created, submitted, cancelled and
 * read. The browser never talks to a provider; it talks to server functions,
 * which talk to this service, which talks to an adapter.
 *
 * Trust boundary: the client sends product ids and quantities, never prices.
 * Every price, subtotal and tax figure is rebuilt here from the verified menu.
 *
 * Nothing here fakes success. With no provider connected, submitOrder marks the
 * order FAILED with a human reason instead of inventing an order number.
 */

import { randomUUID } from "node:crypto";
import { restaurantLocations } from "@/config/locations";
import { mappingForLocation } from "@/config/integration-locations";
import { menuRepository } from "@/lib/menu-repository";
import { checkSelections, chosenOptions } from "@/lib/modifiers";
import type { IntegrationProviderId } from "@/lib/integration/core/contracts";
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import { cloverCheckoutConfigured } from "@/lib/integration/providers/clover/config.server";
import { interacAvailability } from "@/lib/integration/providers/foodhub/config.server";
import { durableOrderStoreConfigured } from "./database.server";
import type { ProviderOrderAdapter } from "./provider-order-adapter";
import { orderError, orderFailure, type OrderErrorCode, type OrderResult } from "./errors";
import { claimOrderKey, deriveIdempotencyKey, releaseOrderKey } from "./idempotency";
import { orderToUniversalDraft } from "./order-mapping";
import { validateOrderDraft, type ValidationReport } from "./validation";
import {
  applyStatus,
  findOrderByProviderId,
  getOrder as readOrder,
  listAllOrders,
  listOrdersForCustomer,
  saveOrder,
  updateOrder,
} from "./order-store.server";
import {
  computeSubtotal,
  type InternalOrder,
  type OrderCustomer,
  type OrderDraft,
  type OrderItem,
  type OrderPaymentMethod,
  type OrderStatus,
  type OrderType,
} from "./types";

/** What checkout submits — ids and quantities only, never money (the Interac displayed total is checked, not trusted). */
export interface CheckoutRequest {
  locationId: string;
  orderType: OrderType;
  lines: Array<{
    itemId: string;
    quantity: number;
    notes: string;
    /** `{ [modifierGroupId]: choiceId }` */
    selections: Record<string, string>;
  }>;
  customer: OrderCustomer;
  deliveryAddress: string | null;
  notes: string;
  /** "card" (Clover Hosted Checkout, default) or "interac" (e-Transfer held at Food Hub). */
  payment?: OrderPaymentMethod;
  /** Interac: the all-inclusive total the customer saw (cents); the server refuses to send another. */
  displayedTotalCents?: number | null;
  lang?: "fr" | "en" | "es";
}

const toCents = (dollars: number | null): number | null =>
  dollars === null ? null : Math.round(dollars * 100);

/**
 * TanStack's generic inputValidator type does not validate runtime JSON.
 * Fail closed before touching fields that are otherwise assumed to be arrays,
 * strings or nested customer objects. Monetary authority stays on the server.
 */
function hasCheckoutPayloadShape(value: unknown): value is CheckoutRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Partial<CheckoutRequest>;
  const limitedText = (field: unknown, max: number) =>
    field == null || (typeof field === "string" && field.length <= max);
  if (
    typeof input.locationId !== "string" ||
    input.locationId.length > 128 ||
    !Array.isArray(input.lines) ||
    input.lines.length > 100 ||
    !input.customer ||
    typeof input.customer !== "object" ||
    Array.isArray(input.customer) ||
    !limitedText(input.customer.name, 120) ||
    !limitedText(input.customer.phone, 40) ||
    !limitedText(input.customer.email, 254) ||
    !limitedText(input.deliveryAddress, 500) ||
    !limitedText(input.notes, 480)
  ) {
    return false;
  }
  if (
    (input.payment !== undefined && input.payment !== "card" && input.payment !== "interac") ||
    (input.lang !== undefined && input.lang !== "fr" && input.lang !== "en" && input.lang !== "es") ||
    (input.displayedTotalCents != null &&
      (typeof input.displayedTotalCents !== "number" ||
        !Number.isSafeInteger(input.displayedTotalCents) ||
        input.displayedTotalCents < 0))
  ) {
    return false;
  }
  return input.lines.every(
    (line) =>
      !!line &&
      typeof line === "object" &&
      typeof line.itemId === "string" &&
      line.itemId.length <= 128 &&
      typeof line.quantity === "number" &&
      limitedText(line.notes, 240) &&
      (line.selections == null ||
        (typeof line.selections === "object" &&
          !Array.isArray(line.selections) &&
          Object.keys(line.selections).length <= 100)),
  );
}

/**
 * Rebuild priced items from the verified catalog. Unknown ids are dropped; a line whose options break the
 * item's rules (a required choice missing, too many, an option it does not offer) counts as dropped too.
 */
function buildItems(request: CheckoutRequest): {
  items: OrderItem[];
  dropped: number;
  unavailable: number;
} {
  const items: OrderItem[] = [];
  let dropped = 0;
  let unavailable = 0;

  request.lines.forEach((line, index) => {
    const item = menuRepository.getItem(line.itemId);
    if (!item) {
      dropped += 1;
      return;
    }
    // getItems(locationId) returns ONLY currently available products. Building
    // an availability map from that filtered list cannot detect sold-out items.
    // Enforce BOTH inventory availability and per-store catalog membership here.
    if (!item.isAvailable || !item.locationIds.includes(request.locationId)) {
      unavailable += 1;
      return;
    }
    // Never round a malformed quantity up into a paid order or exceed Clover's 50-unit limit.
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 50) {
      dropped += 1;
      return;
    }
    const groups = item.modifierGroups ?? [];
    const selections = line.selections ?? {};
    if (!checkSelections(groups, selections).ok) {
      dropped += 1;
      return;
    }
    const modifiers = chosenOptions(groups, selections).flatMap(({ group, choices }) =>
      choices.map((choice) => ({
        groupId: group.id,
        choiceId: choice.id,
        providerModifierId: null,
        label: `${group.labelEn}: ${choice.labelEn}`,
        priceDelta: toCents(choice.priceDelta),
      })),
    );

    items.push({
      lineId: `${line.itemId}:${index}`,
      productId: item.id,
      providerProductId: item.cloverItemId ?? null,
      name: item.nameEn,
      quantity: line.quantity,
      unitPrice: toCents(item.price),
      modifiers,
      notes: (line.notes ?? "").slice(0, 240),
    });
  });

  return { items, dropped, unavailable };
}

/**
 * Which engine takes this store's orders, and its store reference. Clover needs no store id in the code: the
 * merchant comes from the server environment, so the store counts as connected once the Clover keys are set.
 */
function routeFor(
  locationId: string,
  payment: OrderPaymentMethod = "card",
): {
  provider: IntegrationProviderId;
  providerLocationId: string | null;
} {
  const mapping = mappingForLocation(locationId);
  if (!mapping) return { provider: "local", providerLocationId: null };
  // Interac e-Transfer orders go to Food Hub whatever the store's card engine: Food Hub holds them until the
  // transfer is confirmed, then makes the Clover ticket itself. The store reference is its verified Food Hub code.
  if (payment === "interac") {
    const availability = interacAvailability(locationId, "PICKUP");
    return {
      provider: "foodhub",
      providerLocationId: availability.available ? availability.locationCode : null,
    };
  }
  if (mapping.orderingProvider === "clover") {
    return {
      provider: "clover",
      providerLocationId: cloverCheckoutConfigured(locationId) ? mapping.internalId : null,
    };
  }
  return { provider: mapping.orderingProvider, providerLocationId: mapping.providerLocationId };
}

function toDraft(request: CheckoutRequest, items: OrderItem[]): OrderDraft {
  return {
    locationId: request.locationId,
    orderType: request.orderType,
    items,
    customer: request.customer,
    deliveryAddress: request.deliveryAddress,
    notes: (request.notes ?? "").slice(0, 480),
  };
}

/** 1 — VALIDATE. Pure inputs in, human errors out. */
export function validateOrder(request: CheckoutRequest): ValidationReport {
  if (!hasCheckoutPayloadShape(request)) {
    return { valid: false, errors: [orderError("menu_changed")] };
  }
  const { items, dropped, unavailable } = buildItems(request);
  const draft = toDraft(request, items);
  const location = restaurantLocations.find((l) => l.id === request.locationId);

  const payment = paymentMethodOf(request);
  const route = routeFor(request.locationId, payment);
  const report = validateOrderDraft(draft, {
    locationKnown: Boolean(location),
    // An Interac order that cannot reach Food Hub gets its own, truthful reason below.
    locationMapped: payment === "interac" ? true : Boolean(route.providerLocationId),
  });
  const errors = [...report.errors];
  if (unavailable > 0 && !errors.some((e) => e.code === "item_unavailable")) {
    errors.push(orderError("item_unavailable"));
  }
  if (dropped > 0 && !errors.some((e) => e.code === "menu_changed")) {
    errors.push(orderError("menu_changed"));
  }
  // This merchant's Clover Hosted Checkout is pickup-only; reject unsupported
  // fulfilment before an order id, payment session, or guest grant is created.
  if (
    route.provider === "clover" &&
    request.orderType !== "PICKUP" &&
    !errors.some((e) => e.code === "unsupported_order_type")
  ) {
    errors.push(orderError("unsupported_order_type"));
  }
  if (payment === "interac" && location) {
    const availability = interacAvailability(request.locationId, request.orderType);
    if (!availability.available) {
      errors.push(
        orderError(
          availability.reason === "delivery_fee_unknown"
            ? "interac_delivery_unavailable"
            : "interac_unavailable",
        ),
      );
    } else if (items.some((item) => item.unitPrice === null)) {
      // An all-inclusive total cannot be shown for an unpriced item, so it cannot be committed to by transfer.
      errors.push(orderError("menu_changed"));
    }
  }
  return { valid: errors.length === 0, errors };
}

/** The browser's payment choice, defaulting to the card path; anything else is not a choice. */
export function paymentMethodOf(request: Pick<CheckoutRequest, "payment">): OrderPaymentMethod {
  return request.payment === "interac" ? "interac" : "card";
}

/** 2 — CREATE. An internal order exists before any provider is contacted. */
export function createOrder(
  request: CheckoutRequest,
  checkoutScope = "",
): OrderResult<InternalOrder> {
  // Validate the runtime shape before dereferencing user-provided JSON.
  const report = validateOrder(request);
  if (!report.valid) {
    const first = report.errors[0];
    return { ok: false, error: first ?? orderError("menu_changed") };
  }

  const { items } = buildItems(request);
  const draft = toDraft(request, items);

  // The scope is generated server-side from an HttpOnly browser cookie for live checkout.
  // Without it, two guests placing identical orders could be assigned the same receipt.
  const idempotencyKey = checkoutScope
    ? `${deriveIdempotencyKey(draft)}:${checkoutScope}`
    : deriveIdempotencyKey(draft);
  // Opaque unpredictable ids: a timestamp must never double as a receipt authorization secret.
  const existingId = claimOrderKey(idempotencyKey, `ord_${randomUUID().replace(/-/g, "")}`);
  const existing = existingId.fresh ? null : readOrder(existingId.orderId);
  if (existing) return { ok: true, data: existing };

  const payment = paymentMethodOf(request);
  const route = routeFor(request.locationId, payment);
  const now = new Date().toISOString();

  const order: InternalOrder = {
    id: existingId.orderId,
    orderNumber: null,
    customerId: request.customer.customerId,
    locationId: request.locationId,
    providerLocationId: route.providerLocationId,
    provider: route.provider,
    orderType: request.orderType,
    items,
    subtotal: computeSubtotal(items),
    tax: null,
    total: null,
    // Clover orders are paid online on Clover's page before the kitchen gets them; an Interac order is
    // unpaid until the restaurant confirms the transfer in Food Hub.
    paymentStatus:
      route.provider === "clover" || payment === "interac" ? "UNPAID" : "PAY_AT_RESTAURANT",
    status: "CREATED",
    providerStatus: null,
    providerOrderId: null,
    idempotencyKey,
    customer: request.customer,
    deliveryAddress: request.deliveryAddress,
    notes: draft.notes,
    failureCode: null,
    paymentMethod: payment,
    createdAt: now,
    updatedAt: now,
  };

  saveOrder(order);
  logIntegrationEvent({
    provider: order.provider,
    eventType: "order.created",
    status: "processed",
    payloadReference: order.id,
    detail: `${order.orderType} · ${order.items.length} lines`,
  });
  return { ok: true, data: order };
}

async function adapterFor(order: InternalOrder): Promise<ProviderOrderAdapter | null> {
  // Owner retired UrbanPiper; no third-party transport exists. Two first-party engines only:
  // Clover Hosted Checkout (card) and Food Hub (Interac e-Transfer, held until the transfer is confirmed).
  if (order.provider === "clover") {
    const { cloverOrderSubmitAdapter } = await import("@/lib/integration/providers/clover/orders");
    return cloverOrderSubmitAdapter;
  }
  if (order.provider === "foodhub" && order.paymentMethod === "interac") {
    const { foodhubInteracSubmitAdapter } = await import(
      "@/lib/integration/providers/foodhub/interac-orders.server"
    );
    return foodhubInteracSubmitAdapter;
  }
  return null;
}

/** What placeOrder knows at submit time and the provider needs; never stored on the order. */
export interface SubmitOptions {
  customerToken?: string | null;
  lang?: "fr" | "en" | "es";
  displayedTotalCents?: number | null;
}

/** Clover orders live in PostgreSQL when DATABASE_URL is set; other providers stay in memory. */
function isDurable(order: InternalOrder): boolean {
  return order.provider === "clover" && durableOrderStoreConfigured();
}

const durableOrders = () => import("./durable-orders.server");

async function fail(
  order: InternalOrder,
  code: OrderErrorCode,
): Promise<OrderResult<InternalOrder>> {
  const failed = updateOrder(order.id, { status: "FAILED", failureCode: code });
  // Every failure here happens before a payment page reaches the customer, so "Pay" again is a new order.
  releaseOrderKey(order.idempotencyKey);
  if (failed && isDurable(failed)) {
    // Best effort: a stored order that never got a payment page cannot be paid either way.
    await (await durableOrders()).recordUnpaidOutcome(failed).catch(() => undefined);
  }
  logIntegrationEvent({
    provider: order.provider,
    eventType: "order.submit_failed",
    status: "error",
    payloadReference: order.id,
    detail: code,
  });
  return orderFailure(code);
}

/** 3 — SUBMIT. Idempotent by construction; refuses rather than pretends. */
export async function submitOrder(
  orderId: string,
  options: SubmitOptions = {},
): Promise<OrderResult<InternalOrder>> {
  let order = readOrder(orderId);
  if (!order) return orderFailure("order_not_found");
  // Never answer a retry with an earlier failed attempt as if it had been placed.
  if (order.status === "FAILED") return orderFailure("provider_unavailable");
  if (order.status !== "CREATED") return { ok: true, data: order };

  const providerLocationId = order.providerLocationId;
  if (!providerLocationId) return fail(order, "location_not_mapped");

  const adapter = await adapterFor(order);
  if (!adapter || !adapter.isConfigured(order.locationId)) {
    return fail(order, "provider_unavailable");
  }

  // The order is stored before Clover is asked for a payment page: no money without a durable order.
  const durable = isDurable(order);
  if (durable) {
    let stored: InternalOrder;
    try {
      stored = await (await durableOrders()).persistNewOrder(order);
    } catch {
      return fail(order, "provider_unavailable");
    }
    if (stored.id !== order.id) {
      // Same browser, same cart, same window, across a restart: continue the first order.
      order = saveOrder(stored);
      if (order.status !== "CREATED") return { ok: true, data: order };
    }
  }

  const result = await adapter.createOrder(
    orderToUniversalDraft(order),
    providerLocationId,
    order.idempotencyKey,
    {
      orderId: order.id,
      items: order.items,
      customerToken: options.customerToken ?? null,
      ...(options.lang ? { lang: options.lang } : {}),
      displayedTotalCents: options.displayedTotalCents ?? null,
    },
  );
  if (!result.ok) return fail(order, result.error.code);

  const updated = updateOrder(order.id, {
    status: result.data.status,
    providerOrderId: result.data.providerOrderId,
    providerStatus: result.data.providerStatus,
    orderNumber: result.data.orderNumber,
    subtotal: result.data.subtotal ?? order.subtotal,
    tax: result.data.tax,
    total: result.data.total,
    ...(result.data.paymentUrl ? { paymentUrl: result.data.paymentUrl } : {}),
    ...(result.data.fees ? { fees: result.data.fees } : {}),
    ...(result.data.interac ? { interac: result.data.interac } : {}),
  });
  if (!updated) return orderFailure("order_not_found");

  // The customer is only sent to Clover once the session is linked to the stored order.
  if (durable) {
    try {
      await (await durableOrders()).linkCheckoutSession(updated);
    } catch {
      return fail(updated, "provider_unavailable");
    }
  }
  // Food Hub is the system of record for a held Interac order (it texts the customer and keeps the order); the
  // site keeps a copy for the receipt page, durably when PostgreSQL is configured, best effort.
  if (updated.provider === "foodhub" && durableOrderStoreConfigured()) {
    await (await durableOrders())
      .persistNewOrder(updated)
      .catch((error: unknown) =>
        logIntegrationEvent({
          provider: "foodhub",
          eventType: "order.persist_failed",
          status: "error",
          payloadReference: updated.id,
          detail: error instanceof Error ? error.message : "unknown",
        }),
      );
  }
  return { ok: true, data: updated };
}

/**
 * Clover's Hosted Checkout webhook said the payment for this checkout session went through (or was declined).
 * Null if the checkout is not associated with a tracked PPP Clover order.
 * The webhook must not modify Clover merchant orders without this linkage.
 */
export function applyCloverPayment(
  checkoutSessionId: string,
  paymentId: string | null,
  approved: boolean,
): InternalOrder | null {
  const order = findOrderByProviderId("clover", checkoutSessionId);
  if (!order) return null;
  // Do not revive terminal orders or silently replace an attached payment.
  // An unknown/mismatched payment must be reconciled by the merchant instead.
  if (order.status === "CANCELLED" || order.status === "FAILED") return null;
  if (
    approved &&
    (!paymentId || (order.providerPaymentId && order.providerPaymentId !== paymentId))
  )
    return null;
  if (!approved) return updateOrder(order.id, { providerStatus: "payment_declined" });
  updateOrder(order.id, {
    paymentStatus: "PAID",
    paymentUrl: null,
    ...(paymentId ? { providerPaymentId: paymentId } : {}),
  });
  return applyStatus(order.id, "ACCEPTED", "paid");
}

/** 4 — CANCEL. */
export async function cancelOrder(
  orderId: string,
  reason: string,
): Promise<OrderResult<InternalOrder>> {
  const order = await getOrderById(orderId);
  if (!order) return orderFailure("order_not_found");
  if (order.status === "CANCELLED" || order.status === "FAILED") return { ok: true, data: order };
  if (order.status === "READY" || order.status === "COMPLETED") {
    return orderFailure("not_cancellable");
  }

  if (order.providerOrderId) {
    const adapter = await adapterFor(order);
    const result = await adapter?.cancelOrder(order.providerOrderId, reason);
    if (result && !result.ok) return orderFailure(result.error.code);
  }

  const updated = applyStatus(order.id, "CANCELLED");
  if (updated) releaseOrderKey(updated.idempotencyKey);
  if (updated && isDurable(updated)) {
    await (await durableOrders()).recordUnpaidOutcome(updated).catch(() => undefined);
  }
  return updated ? { ok: true, data: updated } : orderFailure("order_not_found");
}

/** 5 — STATUS. Reads the provider when one exists, otherwise our own record. */
export async function getOrderStatus(orderId: string): Promise<OrderResult<OrderStatus>> {
  const order = await getOrderById(orderId);
  if (!order) return orderFailure("order_not_found");
  if (!order.providerOrderId) return { ok: true, data: order.status };

  const adapter = await adapterFor(order);
  const result = await adapter?.getStatus(order.providerOrderId);
  if (result?.ok) {
    applyStatus(order.id, result.data.status, result.data.providerStatus);
    return { ok: true, data: result.data.status };
  }
  return { ok: true, data: order.status };
}

/** Applied by the verified webhook receiver. */
export function applyProviderStatusUpdate(
  provider: IntegrationProviderId,
  providerOrderId: string,
  status: OrderStatus,
  providerStatus: string,
): InternalOrder | null {
  const order = findOrderByProviderId(provider, providerOrderId);
  if (!order) return null;
  return applyStatus(order.id, status, providerStatus);
}

/** The stored copy when there is one (it survives restarts), refreshed into this process; else memory. */
export async function getOrderById(orderId: string): Promise<InternalOrder | null> {
  if (durableOrderStoreConfigured()) {
    try {
      const stored = await (await durableOrders()).loadDurableOrder(orderId);
      if (stored) return saveOrder(stored);
    } catch {
      // Database briefly unreachable: this process's copy is the best answer.
    }
  }
  return readOrder(orderId);
}

export function listCustomerOrders(customerId: string | null, phone: string | null) {
  return listOrdersForCustomer(customerId, phone);
}

export async function listRecentOrders(limit = 50): Promise<InternalOrder[]> {
  const local = listAllOrders(limit);
  if (!durableOrderStoreConfigured()) return local;
  let stored: InternalOrder[];
  try {
    stored = await (await durableOrders()).listDurableOrders(limit);
  } catch {
    return local;
  }
  const ids = new Set(stored.map((o) => o.id));
  return [...stored, ...local.filter((o) => !ids.has(o.id))]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
