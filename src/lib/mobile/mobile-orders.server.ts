/**
 * Orders from the MontrealHub phone app. Same steps and same checks as `placeOrder` (orders.functions.ts), with the
 * phone's receipt token in place of the browser cookie (see mobile-api.server.ts).
 */
import type { PlaceOrderInput, OrderView } from "@/lib/orders/orders.functions";
import type { OrderError } from "@/lib/orders/errors";
import { parseReceipts, receiptAllows, type ReceiptRef } from "./mobile-api.server";

export interface MobilePlaceResult {
  ok: boolean;
  order: OrderView | null;
  /** Receipt token for this order (keep it in the phone's secure storage). */
  token: string | null;
  error: OrderError | null;
}

/** The app never claims an identity: every phone order is a guest order (TAKATAK sign-in comes later). */
function guestInput(data: PlaceOrderInput): PlaceOrderInput {
  return {
    ...data,
    customer: {
      customerId: null,
      takatakCustomerId: null,
      name: data.customer?.name ?? null,
      phone: data.customer?.phone ?? null,
      email: data.customer?.email ?? null,
      isGuest: true,
    },
  };
}

export async function mobileCheck(
  input: unknown,
): Promise<{ valid: boolean; errors: OrderError[] }> {
  const { validateOrder } = await import("@/lib/orders/order-service");
  const { orderError } = await import("@/lib/orders/errors");
  if (!input || typeof input !== "object")
    return { valid: false, errors: [orderError("menu_changed")] };
  return validateOrder(guestInput(input as PlaceOrderInput));
}

export async function mobilePlace(input: unknown, scope: string): Promise<MobilePlaceResult> {
  const { orderError } = await import("@/lib/orders/errors");
  const { orderAccessKey, signOrderGrant } = await import("@/lib/security/order-access.server");
  const key = orderAccessKey();
  // Without a stable signing key the customer could pay but never read the receipt.
  if (!key)
    return { ok: false, order: null, token: null, error: orderError("provider_unavailable") };
  if (!input || typeof input !== "object") {
    return { ok: false, order: null, token: null, error: orderError("menu_changed") };
  }
  const { createOrder, submitOrder, validateOrder } = await import("@/lib/orders/order-service");
  const { unverifiedCheckoutCustomer } = await import("@/lib/security/guest-identity");
  const { toView } = await import("@/lib/orders/orders.functions");
  const data = guestInput(input as PlaceOrderInput);
  const validation = validateOrder(data);
  if (!validation.valid) {
    return {
      ok: false,
      order: null,
      token: null,
      error: validation.errors[0] ?? orderError("menu_changed"),
    };
  }
  const request: PlaceOrderInput = { ...data, customer: unverifiedCheckoutCustomer(data.customer) };
  const created = createOrder(request, scope);
  if (!created.ok) return { ok: false, order: null, token: null, error: created.error };
  const submitted = await submitOrder(created.data.id, { returnTo: "app" });
  if (!submitted.ok) {
    return {
      ok: false,
      order: toView(created.data),
      token: signOrderGrant([created.data.id], key),
      error: submitted.error,
    };
  }
  return {
    ok: true,
    order: toView(submitted.data),
    token: signOrderGrant([submitted.data.id], key),
    error: null,
  };
}

/** Fresh status of the orders this phone holds receipts for. Orders without a valid receipt are left out. */
export async function mobileStatus(input: unknown): Promise<{ orders: OrderView[] }> {
  const { orderAccessKey, verifyOrderGrant } = await import("@/lib/security/order-access.server");
  const { getOrderById } = await import("@/lib/orders/order-service");
  const { toView } = await import("@/lib/orders/orders.functions");
  const key = orderAccessKey();
  const allowed = parseReceipts(input).filter((r) => receiptAllows(r, key, verifyOrderGrant));
  const found = await Promise.all(allowed.map((r) => getOrderById(r.id)));
  return { orders: found.filter((o) => o !== null).map(toView) };
}

export async function mobileCancel(input: unknown): Promise<MobilePlaceResult> {
  const { orderError } = await import("@/lib/orders/errors");
  const { orderAccessKey, verifyOrderGrant } = await import("@/lib/security/order-access.server");
  const { isGuestOrderCancelInput } = await import("@/lib/orders/guest-request-input");
  const key = orderAccessKey();
  const ref = parseReceipts({ orders: [input] })[0] as ReceiptRef | undefined;
  const reason =
    input && typeof input === "object" ? (input as { reason?: unknown }).reason : undefined;
  const payload = { orderId: ref?.id ?? "", reason: typeof reason === "string" ? reason : "" };
  if (!ref || !receiptAllows(ref, key, verifyOrderGrant) || !isGuestOrderCancelInput(payload)) {
    return { ok: false, order: null, token: null, error: orderError("order_not_found") };
  }
  const { cancelOrder } = await import("@/lib/orders/order-service");
  const { toView } = await import("@/lib/orders/orders.functions");
  const result = await cancelOrder(ref.id, payload.reason);
  return result.ok
    ? { ok: true, order: toView(result.data), token: ref.token, error: null }
    : { ok: false, order: null, token: ref.token, error: result.error };
}
