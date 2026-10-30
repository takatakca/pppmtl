/**
 * Server functions for ordering.
 *
 * The checkout screen calls only these. Provider modules, credentials and the
 * order store are imported INSIDE handlers, so nothing server-only can ever
 * reach the browser bundle.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  isGuestOrderCancelInput,
  isGuestOrderListInput,
  isGuestOrderReadInput,
} from "./guest-request-input";
import type { OrderError } from "./errors";
import type {
  InternalOrder,
  OrderFee,
  OrderInteracInstructions,
  OrderPaymentMethod,
  OrderStatus,
  OrderType,
} from "./types";

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
  /** "card" (Clover Hosted Checkout, default) or "interac" (e-Transfer held at Food Hub). */
  payment?: OrderPaymentMethod;
  /** Interac: the all-inclusive total shown to the customer (cents); the server refuses to send another. */
  displayedTotalCents?: number | null;
  lang?: "fr" | "en" | "es";
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
  /** Cents; null until a provider confirmed the taxes. */
  tax: number | null;
  total: number | null;
  customerName: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  paymentStatus: InternalOrder["paymentStatus"];
  paymentMethod: OrderPaymentMethod;
  /** Clover's payment page while the order waits for payment; null otherwise. */
  paymentUrl: string | null;
  /** Fees included in the total (cents), e.g. the Interac e-Transfer fee. */
  fees: OrderFee[];
  /** Interac e-Transfer instructions while Food Hub holds the order; null otherwise. */
  interac: OrderInteracInstructions | null;
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
    tax: order.tax,
    total: order.total,
    customerName: order.customer.name,
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod ?? "card",
    paymentUrl: order.paymentStatus === "UNPAID" ? (order.paymentUrl ?? null) : null,
    fees: order.fees ?? [],
    interac: order.paymentStatus === "UNPAID" ? (order.interac ?? null) : null,
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

/** What the checkout screen needs to show the Interac e-Transfer choice and its all-inclusive total BEFORE commitment. */
export interface InteracOptions {
  available: boolean;
  /** Why not, when unavailable: the UI words it; never a secret. */
  reason: "not_configured" | "not_enabled" | "location_not_mapped" | "delivery_fee_unknown" | null;
  /** Cents. */
  feeCents: number;
  /** Cents; null when the owner set no delivery fee (Interac delivery stays closed). */
  deliveryFeeCents: number | null;
}

export const getInteracOptions = createServerFn({ method: "POST" })
  .inputValidator((input: { locationId: string; orderType: OrderType }) => input)
  .handler(async ({ data }): Promise<InteracOptions> => {
    const locationId = typeof data?.locationId === "string" ? data.locationId.slice(0, 128) : "";
    const orderType = data?.orderType === "DELIVERY" ? "DELIVERY" : "PICKUP";
    const { interacAvailability } =
      await import("@/lib/integration/providers/foodhub/config.server");
    const availability = interacAvailability(locationId, orderType);
    return {
      available: availability.available,
      reason: availability.reason,
      feeCents: availability.feeCents,
      deliveryFeeCents: availability.deliveryFeeCents,
    };
  });

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
    const { checkoutBrowserNonce, grantOrderAccess, orderAccessConfigured } =
      await import("@/lib/security/order-access.server");
    const { orderError } = await import("./errors");
    // Without a stable signing key the customer could pay but never read a protected receipt.
    if (!orderAccessConfigured()) {
      return { ok: false, order: null, error: orderError("provider_unavailable") };
    }
    const { createOrder, submitOrder, validateOrder } = await import("./order-service");
    // Check the full untrusted JSON shape before passing customer properties
    // to the guest identity sanitizer (or attempting an order write).
    const validation = validateOrder(data);
    if (!validation.valid) {
      return { ok: false, order: null, error: validation.errors[0] ?? orderError("menu_changed") };
    }

    const { unverifiedCheckoutCustomer } = await import("@/lib/security/guest-identity");
    const guestRequest: PlaceOrderInput = {
      ...data,
      customer: unverifiedCheckoutCustomer(data.customer),
    };
    const created = createOrder(guestRequest, checkoutBrowserNonce());
    if (!created.ok) return { ok: false, order: null, error: created.error };

    // The cookie is issued before redirecting off-domain to Clover, even if the provider errors.
    grantOrderAccess(created.data.id);
    // A signed-in customer's Food Hub token (HttpOnly cookie) links an Interac order to their account at Food Hub.
    // The site never stores it on the order and never accepts it from the request body.
    const { readCustomerToken } = await import("@/lib/customer/customer-cookie.server");
    const submitted = await submitOrder(created.data.id, {
      customerToken: data.payment === "interac" ? readCustomerToken() : null,
      ...(data.lang === "fr" || data.lang === "en" || data.lang === "es"
        ? { lang: data.lang }
        : {}),
      displayedTotalCents:
        typeof data.displayedTotalCents === "number" &&
        Number.isSafeInteger(data.displayedTotalCents)
          ? data.displayedTotalCents
          : null,
    });
    if (!submitted.ok) {
      return { ok: false, order: toView(created.data), error: submitted.error };
    }
    // The stored order for this same cart may be an earlier one (resubmitted across a restart).
    if (submitted.data.id !== created.data.id) grantOrderAccess(submitted.data.id);
    return { ok: true, order: toView(submitted.data), error: null };
  });

export const cancelMyOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; reason: string }) => input)
  .handler(async ({ data }): Promise<PlaceOrderResponse> => {
    const { canReadOrder } = await import("@/lib/security/order-access.server");
    const { orderError } = await import("./errors");
    if (!isGuestOrderCancelInput(data) || !canReadOrder(data.orderId)) {
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
  .handler(async ({ data }): Promise<{ orders: OrderView[] }> => {
    // Never allow malformed JSON or a non-string phone to throw on .replace().
    // A valid phone is just a filter, never an authorization to read a receipt.
    if (!isGuestOrderListInput(data)) return { orders: [] };
    // A phone is only an additional filter. It NEVER authorizes an order by itself.
    const { readableOrderIds } = await import("@/lib/security/order-access.server");
    const { getOrderById: findOrder } = await import("./order-service");
    const phone = data.phone?.replace(/\D/g, "") ?? "";
    const orders = (await Promise.all(readableOrderIds().map(findOrder)))
      .filter((o): o is InternalOrder => o !== null)
      .filter((o) => !phone || (o.customer.phone ?? "").replace(/\D/g, "") === phone);
    return { orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toView) };
  });

export const getOrderById = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data }): Promise<{ order: OrderView | null }> => {
    if (!isGuestOrderReadInput(data)) return { order: null };
    const { canReadOrder } = await import("@/lib/security/order-access.server");
    if (!canReadOrder(data.orderId)) return { order: null };
    const { getOrderById: findOrder } = await import("./order-service");
    const order = await findOrder(data.orderId);
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
      orders: (await listRecentOrders(50)).map((o) => ({
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
