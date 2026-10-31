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
import {
  orderError,
  orderFailure,
  type OrderErrorCode,
  type OrderResult,
} from "@/lib/orders/errors";
import { foodhubRequest } from "./client.server";
import { foodhubBrandName, foodhubTenant, interacAvailability } from "./config.server";
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

/**
 * Food Hub may hold (and have texted) the order although we got no usable answer: the order service keeps the order
 * id and resends the SAME id on retry, which Food Hub answers with `duplicate: true` and the same instructions.
 */
function unknownOutcome(code: OrderErrorCode): OrderResult<ProviderOrderRef> {
  return { ok: false, error: orderError(code), outcomeUnknown: true };
}

/**
 * Words a Food Hub 400/422 for the customer. Interac not ready at Food Hub (switch off, no recipient e-mail, no
 * security question), an unknown store or brand, or no saved menu: Interac is closed, retrying will not help.
 * A fee or total mismatch: review the total. Anything else about the cart: review the order.
 */
export function refusalCode(error: string | null): OrderErrorCode {
  const reason = (error ?? "").toLowerCase();
  if (
    /interac e-transfer is turned off|no interac e-mail|auto-deposit is off|security question|unknown location|unknown brand|no menu saved|not available/.test(
      reason,
    )
  ) {
    return "interac_unavailable";
  }
  // "Item/Option … is not on the menu: its price cannot be confirmed" is a menu change, not a new total.
  if (/is not on the/.test(reason)) return "menu_changed";
  if (/\bfee\b|total|price|charged/.test(reason)) return "price_changed";
  return "menu_changed";
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
    if (!context?.orderId) return failure("provider_unavailable");
    const orderId = context.orderId;
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
        // Food Hub matches a paid option by its Clover modifier id (`ref`), then by its Clover name.
        modifiers: item.modifiers.map((m) => ({
          label: m.label,
          name: m.providerName ?? null,
          priceDelta: m.priceDelta,
          ref: m.providerModifierId,
        })),
        notes: item.notes,
      })),
      quote,
      customerToken: context.customerToken ?? null,
      tenant: foodhubTenant(),
    });

    // Food Hub lists recent orders and texts the customer before it answers: give it its whole route budget
    // (maxDuration 30 s) so a slow answer is not mistaken for a lost one.
    const response = await foodhubRequest(FOODHUB_WEBSITE_ORDER_PATH, {
      method: "POST",
      body: payload,
      timeoutMs: 30_000,
    });
    if (!response.ok) {
      // Unreachable/timeout and 5xx (other than Food Hub's own 503 refusal) may come after Food Hub created and
      // texted the order: the outcome is unknown, never a reason to make a new order id.
      const unknown = response.kind === "unreachable" || response.kind === "error";
      logIntegrationEvent({
        provider: "foodhub",
        eventType: unknown ? "interac.order_unconfirmed" : "interac.order_refused",
        status: unknown ? "error" : "rejected",
        payloadReference: orderId,
        detail: `${response.kind}${response.status ? ` ${response.status}` : ""}${response.error ? `: ${response.error}` : ""}`,
      });
      if (unknown) return unknownOutcome("submit_unconfirmed");
      // Food Hub re-priced differently (fee, menu price, total): the customer must review, never be charged more.
      if (response.kind === "invalid") return failure(refusalCode(response.error));
      return failure("interac_unavailable");
    }
    const parsed = parseInteracResponse(response.body);
    if (!parsed) {
      // Loud: an order may exist at Food Hub without a hold. The owner must check the Direct orders drawer.
      // The order id is kept, so a retry gets Food Hub's duplicate answer instead of creating a second order.
      logIntegrationEvent({
        provider: "foodhub",
        eventType: "interac.instructions_missing",
        status: "error",
        payloadReference: orderId,
        detail: "200 without interac instructions: Food Hub Interac contract not deployed?",
      });
      return unknownOutcome("interac_unavailable");
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
      interac: { ...parsed.interac, trackUrl: parsed.trackUrl },
    };
    return { ok: true, data: ref };
  },

  // Food Hub has no update/cancel/read endpoint for a held Interac order in the contract: the restaurant does it.
  updateOrder: async () => orderFailure("not_cancellable"),
  cancelOrder: async () => orderFailure("not_cancellable"),
  getStatus: async () => orderFailure("provider_unavailable"),
};
