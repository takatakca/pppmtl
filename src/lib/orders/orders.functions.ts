/**
 * Server functions for ordering.
 *
 * The checkout screen calls only these. Provider modules, credentials and the
 * order store are imported INSIDE handlers, so nothing server-only can ever
 * reach the browser bundle.
 */

import { createServerFn } from "@tanstack/react-start";
import type { OrderError } from "./errors";
import type { InternalOrder, OrderStatus, OrderType } from "./types";

export interface PlaceOrderInput {
  locationId: string;
  orderType: OrderType;
  lines: Array<{
    itemId: string;
    quantity: number;
    notes: string;
    selections: Record<string, string>;
  }>;
  customer: {
    customerId: string | null;
    takatakCustomerId: string | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    isGuest: boolean;
  };
  deliveryAddress: string | null;
  notes: string;
}

/** Customer-safe view of an order: no provider ids, no internal codes. */
export interface OrderView {
  id: string;
  orderNumber: string | null;
  locationId: string;
  status: OrderStatus;
  orderType: OrderType;
  createdAt: string;
  subtotal: number;
  total: number | null;
  customerName: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  paymentStatus: InternalOrder["paymentStatus"];
  /** Clover's payment page while the order waits for payment; null otherwise. */
  paymentUrl: string | null;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    options: string[];
    selections: Record<string, string>;
    notes: string;
  }>;
}

export interface PlaceOrderResponse {
  ok: boolean;
  order: OrderView | null;
  error: OrderError | null;
}

function toView(order: InternalOrder): OrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    locationId: order.locationId,
    status: order.status,
    orderType: order.orderType,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    total: order.total,
    customerName: order.customer.name,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    paymentStatus: order.paymentStatus,
    paymentUrl: order.paymentStatus === "UNPAID" ? (order.paymentUrl ?? null) : null,
    items: order.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      options: i.modifiers.map((m) => m.label),
      // Several options of one group are kept comma-separated, like the cart.
      selections: i.modifiers.reduce<Record<string, string>>((acc, m) => {
        const prev = acc[m.groupId];
        acc[m.groupId] = prev ? `${prev},${m.choiceId}` : m.choiceId;
        return acc;
      }, {}),
      notes: i.notes,
    })),
  };
}

/** Validate only — used to show problems before the customer commits. */
export const checkOrder = createServerFn({ method: "POST" })
  .inputValidator((input: PlaceOrderInput) => input)
  .handler(async ({ data }): Promise<{ valid: boolean; errors: OrderError[] }> => {
    const { validateOrder } = await import("./order-service");
    return validateOrder(data);
  });

/** Validate -> create internal order -> submit to the provider. */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: PlaceOrderInput) => input)
  .handler(async ({ data }): Promise<PlaceOrderResponse> => {
    const { checkoutBrowserNonce, grantOrderAccess, orderAccessConfigured } = await import("@/lib/security/order-access.server");
    const { orderError } = await import("./errors");
    // Without a stable signing key the customer could pay but never read a protected receipt.
    if (!orderAccessConfigured()) {
      return { ok: false, order: null, error: orderError("provider_unavailable") };
    }
    const { createOrder, submitOrder } = await import("./order-service");

    const created = createOrder(data, checkoutBrowserNonce());
    if (!created.ok) return { ok: false, order: null, error: created.error };

    // The cookie is issued before redirecting off-domain to Clover, even if the provider errors.
    grantOrderAccess(created.data.id);
    const submitted = await submitOrder(created.data.id);
    if (!submitted.ok) {
      return { ok: false, order: toView(created.data), error: submitted.error };
    }
    return { ok: true, order: toView(submitted.data), error: null };
  });

export const cancelMyOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; reason: string }) => input)
  .handler(async ({ data }): Promise<PlaceOrderResponse> => {
    const { canReadOrder } = await import("@/lib/security/order-access.server");
    const { orderError } = await import("./errors");
    if (!canReadOrder(data.orderId)) {
      return { ok: false, order: null, error: orderError("order_not_found") };
    }
    const { cancelOrder } = await import("./order-service");
    const result = await cancelOrder(data.orderId, data.reason);
    return result.ok
      ? { ok: true, order: toView(result.data), error: null }
      : { ok: false, order: null, error: result.error };
  });

/** Order history. Returns an empty list honestly until ordering is live. */
export const listMyOrders = createServerFn({ method: "POST" })
  .inputValidator((input: { customerId: string | null; phone: string | null }) => input)
  .handler(async (): Promise<{ orders: OrderView[] }> => {
    // Client-supplied phone/customer IDs cannot authorize a customer history lookup.
    const { readableOrderIds } = await import("@/lib/security/order-access.server");
    const { getOrderById: findOrder } = await import("./order-service");
    const orders = readableOrderIds().map(findOrder).filter((o): o is InternalOrder => o !== null);
    return { orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toView) };
  });

export const getOrderById = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }): Promise<{ order: OrderView | null }> => {
    const { canReadOrder } = await import("@/lib/security/order-access.server");
    if (!canReadOrder(data.orderId)) return { order: null };
    const { getOrderById: findOrder } = await import("./order-service");
    const order = findOrder(data.orderId);
    return { order: order ? toView(order) : null };
  });

export interface AdminOrderRow {
  id: string;
  orderNumber: string | null;
  provider: string;
  locationId: string;
  providerLocationId: string | null;
  providerOrderId: string | null;
  status: OrderStatus;
  providerStatus: string | null;
  paymentStatus: string;
  failureCode: string | null;
  createdAt: string;
  itemCount: number;
}

export const getAdminOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ generatedAt: string; orders: AdminOrderRow[] }> => {
    const { requireAdmin } = await import("@/lib/security/admin.server");
    requireAdmin();
    const { listRecentOrders } = await import("./order-service");
    return {
      generatedAt: new Date().toISOString(),
      orders: listRecentOrders(50).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        provider: o.provider,
        locationId: o.locationId,
        providerLocationId: o.providerLocationId,
        providerOrderId: o.providerOrderId,
        status: o.status,
        providerStatus: o.providerStatus,
        paymentStatus: o.paymentStatus,
        failureCode: o.failureCode,
        createdAt: o.createdAt,
        itemCount: o.items.length,
      })),
    };
  },
);
