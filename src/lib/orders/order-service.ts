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

import { restaurantLocations } from "@/config/locations";
import { mappingForLocation } from "@/config/integration-locations";
import { menuRepository } from "@/lib/menu-repository";
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import { orderError, orderFailure, type OrderErrorCode, type OrderResult } from "./errors";
import { claimOrderKey, deriveIdempotencyKey } from "./idempotency";
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
  type OrderStatus,
  type OrderType,
} from "./types";

/** What checkout submits — ids and quantities only, never money. */
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
}

const toCents = (dollars: number | null): number | null =>
  dollars === null ? null : Math.round(dollars * 100);

/** Rebuild priced items from the verified catalog. Unknown ids are dropped. */
function buildItems(request: CheckoutRequest): { items: OrderItem[]; dropped: number } {
  const items: OrderItem[] = [];
  let dropped = 0;

  request.lines.forEach((line, index) => {
    const item = menuRepository.getItem(line.itemId);
    if (!item) {
      dropped += 1;
      return;
    }
    const modifiers = Object.entries(line.selections ?? {}).flatMap(([groupId, choiceId]) => {
      const group = item.modifierGroups?.find((g) => g.id === groupId);
      const choice = group?.choices.find((c) => c.id === choiceId);
      if (!group || !choice) return [];
      return [
        {
          groupId,
          choiceId,
          providerModifierId: null,
          label: `${group.labelEn}: ${choice.labelEn}`,
          priceDelta: null,
        },
      ];
    });

    items.push({
      lineId: `${line.itemId}:${index}`,
      productId: item.id,
      providerProductId: null,
      name: item.nameEn,
      quantity: Math.max(1, Math.floor(line.quantity)),
      unitPrice: toCents(item.price),
      modifiers,
      notes: (line.notes ?? "").slice(0, 240),
    });
  });

  return { items, dropped };
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
  const { items, dropped } = buildItems(request);
  const draft = toDraft(request, items);
  const location = restaurantLocations.find((l) => l.id === request.locationId);
  const mapping = mappingForLocation(request.locationId);

  const report = validateOrderDraft(draft, {
    locationKnown: Boolean(location),
    locationMapped: Boolean(mapping?.providerLocationId),
    availability: Object.fromEntries(
      menuRepository.getItems(request.locationId).map((i) => [i.id, i.isAvailable]),
    ),
  });

  if (dropped > 0 && !report.errors.some((e) => e.code === "menu_changed")) {
    return { valid: false, errors: [...report.errors, orderError("menu_changed")] };
  }
  return report;
}

/** 2 — CREATE. An internal order exists before any provider is contacted. */
export function createOrder(request: CheckoutRequest): OrderResult<InternalOrder> {
  const { items } = buildItems(request);
  const draft = toDraft(request, items);

  const report = validateOrder(request);
  if (!report.valid) {
    const first = report.errors[0];
    return { ok: false, error: first ?? orderError("menu_changed") };
  }

  const idempotencyKey = deriveIdempotencyKey(draft);
  const existingId = claimOrderKey(idempotencyKey, `ord_${Date.now().toString(36)}`);
  const existing = existingId.fresh ? null : readOrder(existingId.orderId);
  if (existing) return { ok: true, data: existing };

  const mapping = mappingForLocation(request.locationId);
  const now = new Date().toISOString();

  const order: InternalOrder = {
    id: existingId.orderId,
    orderNumber: null,
    customerId: request.customer.customerId,
    locationId: request.locationId,
    providerLocationId: mapping?.providerLocationId ?? null,
    provider: mapping?.orderingProvider ?? "local",
    orderType: request.orderType,
    items,
    subtotal: computeSubtotal(items),
    tax: null,
    total: null,
    paymentStatus: "PAY_AT_RESTAURANT",
    status: "CREATED",
    providerStatus: null,
    providerOrderId: null,
    idempotencyKey,
    customer: request.customer,
    deliveryAddress: request.deliveryAddress,
    notes: draft.notes,
    failureCode: null,
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

async function adapterFor(order: InternalOrder) {
  if (order.provider !== "urbanpiper") return null;
  const { urbanPiperOrderSubmitAdapter } = await import(
    "@/lib/integration/providers/urbanpiper/order-submit"
  );
  return urbanPiperOrderSubmitAdapter;
}

function fail(order: InternalOrder, code: OrderErrorCode): OrderResult<InternalOrder> {
  updateOrder(order.id, { status: "FAILED", failureCode: code });
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
export async function submitOrder(orderId: string): Promise<OrderResult<InternalOrder>> {
  const order = readOrder(orderId);
  if (!order) return orderFailure("order_not_found");
  if (order.status !== "CREATED") return { ok: true, data: order };

  if (!order.providerLocationId) return fail(order, "location_not_mapped");

  const adapter = await adapterFor(order);
  if (!adapter || !adapter.isConfigured(order.locationId)) {
    return fail(order, "provider_unavailable");
  }

  const result = await adapter.createOrder(
    orderToUniversalDraft(order),
    order.providerLocationId,
    order.idempotencyKey,
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
  });
  return updated ? { ok: true, data: updated } : orderFailure("order_not_found");
}

/** 4 — CANCEL. */
export async function cancelOrder(
  orderId: string,
  reason: string,
): Promise<OrderResult<InternalOrder>> {
  const order = readOrder(orderId);
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
  return updated ? { ok: true, data: updated } : orderFailure("order_not_found");
}

/** 5 — STATUS. Reads the provider when one exists, otherwise our own record. */
export async function getOrderStatus(orderId: string): Promise<OrderResult<OrderStatus>> {
  const order = readOrder(orderId);
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
  providerOrderId: string,
  status: OrderStatus,
  providerStatus: string,
): InternalOrder | null {
  const order = findOrderByProviderId(providerOrderId);
  if (!order) return null;
  return applyStatus(order.id, status, providerStatus);
}

export function getOrderById(orderId: string): InternalOrder | null {
  return readOrder(orderId);
}

export function listCustomerOrders(customerId: string | null, phone: string | null) {
  return listOrdersForCustomer(customerId, phone);
}

export function listRecentOrders(limit = 50) {
  return listAllOrders(limit);
}
