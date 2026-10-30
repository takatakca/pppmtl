/**
 * Interac e-Transfer website orders -> Food Hub. SERVER ONLY.
 *
 * The order-service adapter for `payment: "interac"`: the priced PPP order becomes one POST to Food Hub's
 * website-order ingress (shared contract, section B). Food Hub holds the order ("awaiting_payment") until a person
 * presses "Transfer received" there; then it makes the Clover ticket, texts the customer and, for a delivery,
 * books the courier. This site never reads a bank and never marks an Interac order paid by itself.
 *
 * Fail-closed: no POST without FOODHUB_URL + secret + FOODHUB_INTERAC_ENABLED + a verified location code, and a
 * 200 that carries no Interac instructions is treated as a failure (the Food Hub that answered does not run the
 * Interac contract yet), logged for the owner.
 */
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import type { OrderItem } from "@/lib/orders/types";
import type { ProviderOrderAdapter, ProviderOrderRef } from "@/lib/orders/provider-order-adapter";
import { orderFailure, type OrderErrorCode, type OrderResult } from "@/lib/orders/errors";
import { foodhubRequest } from "./client.server";
import { foodhubBrandName, interacAvailability } from "./config.server";
import {
  buildInteracWebsiteOrder,
  interacQuote,
  parseInteracResponse,
  totalsAgree,
  type InteracQuote,
} from "./interac";

export const FOODHUB_WEBSITE_ORDER_PATH = "/api/foodhub/webhooks/website-order";

function failure(code: OrderErrorCode): OrderResult<ProviderOrderRef> {
  return orderFailure<ProviderOrderRef>(code);
}

/** The figures the customer was shown, recomputed from the server-priced order. */
export function quoteForOrder(
  locationId: string,
  orderType: "PICKUP" | "DELIVERY",
  subtotalCents: number,
): { quote: InteracQuote; available: boolean } {
  const availability = interacAvailability(locationId, orderType);
  const quote = interacQuote({
    subtotalCents,
    interacFeeCents: availability.feeCents,
    feeTaxable: availability.feeTaxable,
    deliveryFeeCents: orderType === "DELIVERY" ? (availability.deliveryFeeCents ?? 0) : 0,
  });
  return { quote, available: availability.available };
}

export const foodhubInteracSubmitAdapter: ProviderOrderAdapter = {
  provider: "foodhub",

  isConfigured(locationId) {
    return interacAvailability(locationId, "PICKUP").available;
  },

  async createOrder(draft, providerLocationId, _idempotencyKey, context) {
    const orderId = context?.orderId;
    if (!orderId) return failure("provider_unavailable");
    const orderType = draft.orderType === "DELIVERY" ? "DELIVERY" : "PICKUP";
    const availability = interacAvailability(draft.locationId, orderType);
    if (!availability.available || availability.locationCode !== providerLocationId) {
      return failure(
        availability.reason === "delivery_fee_unknown"
          ? "interac_delivery_unavailable"
          : "interac_unavailable",
      );
    }
    const items: OrderItem[] = context.items ?? [];
    if (!items.length) return failure("empty_cart");
    if (items.some((item) => item.unitPrice === null)) return failure("menu_changed");

    const subtotalCents = items.reduce((sum, item) => {
      const options = item.modifiers.reduce((m, mod) => m + (mod.priceDelta ?? 0), 0);
      return sum + ((item.unitPrice ?? 0) + options) * item.quantity;
    }, 0);
    const { quote } = quoteForOrder(draft.locationId, orderType, subtotalCents);
    // The site must never show one price and send another: refuse when the display drifted (stale cart).
    if (
      typeof context.displayedTotalCents === "number" &&
      !totalsAgree(context.displayedTotalCents, quote.totalCents)
    ) {
      logIntegrationEvent({
        provider: "foodhub",
        eventType: "interac.total_mismatch",
        status: "rejected",
        payloadReference: orderId,
        detail: `displayed ${context.displayedTotalCents} vs server ${quote.totalCents} cents`,
      });
      return failure("price_changed");
    }

    const payload = buildInteracWebsiteOrder({
      orderId,
      brand: foodhubBrandName(),
      locationCode: providerLocationId,
      customer: {
        name: draft.customer.preferredName,
        phone: draft.customer.phone,
        email: draft.customer.email,
        lang: context.lang ?? "fr",
      },
      fulfillment: orderType === "DELIVERY" ? "delivery" : "pickup",
      deliveryAddress: draft.deliveryAddress,
      lines: items.map((item) => ({
        productId: item.productId,
        providerProductId: item.providerProductId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiers: item.modifiers.map((m) => ({ label: m.label, priceDelta: m.priceDelta })),
        notes: item.notes,
      })),
      quote,
      customerToken: context.customerToken ?? null,
    });

    const response = await foodhubRequest(FOODHUB_WEBSITE_ORDER_PATH, {
      method: "POST",
      body: payload,
      timeoutMs: 15_000,
    });
    if (!response.ok) {
      logIntegrationEvent({
        provider: "foodhub",
        eventType: "interac.order_refused",
        status: response.kind === "unreachable" ? "error" : "rejected",
        payloadReference: orderId,
        detail: `${response.kind}${response.status ? ` ${response.status}` : ""}${response.error ? `: ${response.error}` : ""}`,
      });
      if (response.kind === "unreachable") return failure("timeout");
      if (response.kind === "invalid") {
        // Food Hub re-priced differently (fee, menu price, total): the customer must review, never be charged more.
        const reason = (response.error ?? "").toLowerCase();
        return failure(
          reason.includes("fee") || reason.includes("total") || reason.includes("price")
            ? "price_changed"
            : "menu_changed",
        );
      }
      return failure("interac_unavailable");
    }
    const parsed = parseInteracResponse(response.body);
    if (!parsed) {
      // Loud: an order may exist at Food Hub without a hold. The owner must check the Direct orders drawer.
      logIntegrationEvent({
        provider: "foodhub",
        eventType: "interac.instructions_missing",
        status: "error",
        payloadReference: orderId,
        detail: "200 without interac instructions: Food Hub Interac contract not deployed?",
      });
      return failure("interac_unavailable");
    }
    logIntegrationEvent({
      provider: "foodhub",
      eventType: parsed.duplicate ? "interac.order_duplicate" : "interac.order_held",
      status: "processed",
      payloadReference: orderId,
      detail: `${parsed.number} · ${orderType.toLowerCase()} · awaiting transfer`,
    });
    const ref: ProviderOrderRef = {
      providerOrderId: parsed.id,
      orderNumber: parsed.number,
      providerStatus: "awaiting_payment",
      status: "SUBMITTED",
      subtotal: quote.subtotalCents,
      tax: quote.taxCents,
      total: quote.totalCents,
      fees: [{ code: "interac", name: "Frais Interac e-Transfer", amount: quote.interacFeeCents }],
      interac: parsed.interac,
    };
    return { ok: true, data: ref };
  },

  // Food Hub has no update/cancel/read endpoint for a held Interac order in the contract: the restaurant does it.
  updateOrder: async () => orderFailure("not_cancellable"),
  cancelOrder: async () => orderFailure("not_cancellable"),
  getStatus: async () => orderFailure("provider_unavailable"),
};
