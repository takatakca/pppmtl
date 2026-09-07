/**
 * Checkout service boundary.
 *
 * The checkout UI calls ONLY these four functions. They are server functions,
 * so no provider code, credential or SDK ever reaches the browser. While no
 * provider is connected each one answers `not_configured` with a
 * customer-safe reason instead of faking an order.
 */

import { createServerFn } from "@tanstack/react-start";
import type { IntegrationResult, UniversalOrder, UniversalOrderDraft } from "./core/contracts";
import type { OrderQuote } from "./core/adapter";

const NOT_CONNECTED = "Online ordering is completed by phone until PPP Direct opens.";

function validateDraft(draft: UniversalOrderDraft): string | null {
  if (!draft.locationId) return "Choose a restaurant first.";
  if (draft.lines.length === 0) return "Your order is empty.";
  if (draft.orderType === "DELIVERY" && !draft.deliveryAddress) return "Add a delivery address.";
  return null;
}

/** Customer-side validation of the identity projection before submitting. */
export const validateCustomer = createServerFn({ method: "POST" })
  .inputValidator((input: UniversalOrderDraft) => input)
  .handler(async ({ data }): Promise<IntegrationResult<{ valid: true }>> => {
    if (!data.customer.preferredName) {
      return { ok: false, code: "invalid_request", message: "Tell us who the order is for." };
    }
    if (!data.customer.phone) {
      return { ok: false, code: "invalid_request", message: "A phone number is required." };
    }
    return { ok: true, data: { valid: true } };
  });

export const quoteOrder = createServerFn({ method: "POST" })
  .inputValidator((input: UniversalOrderDraft) => input)
  .handler(async ({ data }): Promise<IntegrationResult<OrderQuote>> => {
    const invalid = validateDraft(data);
    if (invalid) return { ok: false, code: "invalid_request", message: invalid };
    const { orderingAdaptersForLocation } = await import("./core/registry");
    const orders = orderingAdaptersForLocation(data.locationId)?.orders;
    if (!orders) return { ok: false, code: "not_configured", message: NOT_CONNECTED };
    return orders.quoteOrder(data);
  });

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: UniversalOrderDraft) => input)
  .handler(async ({ data }): Promise<IntegrationResult<UniversalOrder>> => {
    const invalid = validateDraft(data);
    if (invalid) return { ok: false, code: "invalid_request", message: invalid };
    const { orderingAdaptersForLocation } = await import("./core/registry");
    const orders = orderingAdaptersForLocation(data.locationId)?.orders;
    if (!orders) return { ok: false, code: "not_configured", message: NOT_CONNECTED };
    return orders.createOrder(data);
  });

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { locationId: string; orderId: string }) => input)
  .handler(async ({ data }): Promise<IntegrationResult<UniversalOrder>> => {
    const { orderingAdaptersForLocation } = await import("./core/registry");
    const orders = orderingAdaptersForLocation(data.locationId)?.orders;
    if (!orders) return { ok: false, code: "not_configured", message: NOT_CONNECTED };
    return orders.submitOrder(data.orderId);
  });

export const processPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { locationId: string; orderId: string; amount: number }) => input)
  .handler(
    async ({ data }): Promise<IntegrationResult<{ intentId: string; clientSecret: string }>> => {
      const { adaptersFor } = await import("./core/registry");
      const payments = adaptersFor("clover")?.payments;
      if (!payments) {
        return { ok: false, code: "not_configured", message: NOT_CONNECTED };
      }
      return payments.createPaymentIntent(data.orderId, data.amount, "CAD");
    },
  );
