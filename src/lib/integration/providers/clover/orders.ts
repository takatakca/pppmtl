/**
 * Clover order adapters. SERVER ONLY.
 *
 * A PPP order paid online becomes a Clover Hosted Checkout session: the site prices the cart from Clover (live
 * inventory with a REST token, else the committed snapshot), sends one Clover line per cart line (options in the
 * note) and redirects the customer to Clover's payment page. Card data never touches PPP. The order is confirmed
 * by Clover's webhook (webhook.ts), which also titles and prints it in Clover.
 * Pickup only: no courier is wired for website orders.
 */
import type { OrderAdapter, OrderQuote } from "@/lib/integration/core/adapter";
import type {
  CapabilityStatus,
  IntegrationResult,
  UniversalOrderDraft,
} from "@/lib/integration/core/contracts";
import { cloverSlotFor, cloverSnapshot } from "@/data/clover/overlay";
import type { ProviderOrderAdapter, ProviderOrderRef } from "@/lib/orders/provider-order-adapter";
import { orderFailure, type OrderResult } from "@/lib/orders/errors";
import type { CloverInventory } from "./catalog";
import {
  buildHostedCheckoutRequest,
  priceCloverCart,
  taxesFor,
  type CheckoutLineInput,
  type CloverTaxRate,
} from "./checkout";
import {
  cloverCheckoutConfigured,
  cloverEnvironment,
  cloverTaxRatesFromEnv,
  DEFAULT_TAX_RATES,
  siteBaseUrl,
} from "./config.server";
import { createHostedCheckout, fetchDefaultTaxRates, fetchLiveInventory } from "./api.server";

const REASON_EN =
  "You pay on Clover's secure page; the order goes straight to the restaurant's Clover.";
const REASON_FR =
  "Vous payez sur la page sécurisée de Clover; la commande va directement dans la caisse Clover du restaurant.";
const NOT_READY_EN = "Online payment through Clover is not switched on for this restaurant yet.";
const NOT_READY_FR = "Le paiement en ligne par Clover n'est pas encore activé pour ce restaurant.";
const USE_PLACE_ORDER = "Clover orders are placed with placeOrder (Hosted Checkout).";

/** Kept for older imports: true when this store's orders can go to Clover. */
export function cloverOrdersConfigured(locationId: string): boolean {
  return cloverCheckoutConfigured(locationId);
}

function statusFor(locationId: string): CapabilityStatus {
  const available = cloverCheckoutConfigured(locationId);
  return {
    provider: "clover",
    capability: "orders",
    available,
    reasonEn: available ? REASON_EN : NOT_READY_EN,
    reasonFr: available ? REASON_FR : NOT_READY_FR,
  };
}

/** Live Clover inventory when a REST token exists, else the committed snapshot. */
export async function inventoryForCheckout(): Promise<{
  inventory: CloverInventory;
  source: "live" | "snapshot";
}> {
  const live = await fetchLiveInventory();
  return live
    ? { inventory: live, source: "live" }
    : { inventory: cloverSnapshot, source: "snapshot" };
}

/** CLOVER_TAX_RATES, else the merchant's default rates, else GST + QST. */
export async function taxRatesForCheckout(): Promise<CloverTaxRate[]> {
  return cloverTaxRatesFromEnv() ?? (await fetchDefaultTaxRates()) ?? DEFAULT_TAX_RATES;
}

/** Universal draft lines -> cart lines (options of one group joined back into "a,b"). */
export function draftLines(draft: UniversalOrderDraft): CheckoutLineInput[] {
  return draft.lines.map((line) => {
    const selections: Record<string, string> = {};
    for (const m of line.modifiers) {
      const prev = selections[m.groupId];
      selections[m.groupId] = prev ? `${prev},${m.choiceId}` : m.choiceId;
    }
    return { siteItemId: line.productId, quantity: line.quantity, notes: line.notes, selections };
  });
}

/** Short number said to the customer and shown on the Clover ticket. */
export function websiteOrderNumber(orderId: string): string {
  return `PPP-${orderId
    .replace(/[^a-z0-9]/gi, "")
    .slice(-5)
    .toUpperCase()}`;
}

async function quote(draft: UniversalOrderDraft): Promise<IntegrationResult<OrderQuote>> {
  const { inventory, source } = await inventoryForCheckout();
  if (cloverEnvironment() === "production" && source !== "live") {
    return { ok: false, code: "provider_unavailable", message: "Live Clover inventory unavailable" };
  }
  const priced = priceCloverCart(draftLines(draft), inventory, cloverSlotFor);
  if (!priced.ok) return { ok: false, code: "invalid_request", message: priced.code };
  const taxes = taxesFor(priced.subtotal, await taxRatesForCheckout());
  return {
    ok: true,
    data: { subtotal: priced.subtotal, taxes, fees: 0, total: priced.subtotal + taxes },
  };
}

/** Checkout-service boundary (quotes). Orders themselves go through placeOrder -> order-service. */
export const cloverOrderAdapter: OrderAdapter = {
  provider: "clover",
  status: statusFor,
  quoteOrder: quote,
  createOrder: async () => ({ ok: false, code: "invalid_request", message: USE_PLACE_ORDER }),
  submitOrder: async () => ({ ok: false, code: "invalid_request", message: USE_PLACE_ORDER }),
  getOrder: async () => ({
    ok: false,
    code: "invalid_request",
    message: "Read orders from the PPP order service.",
  }),
  listOrders: async () => ({ ok: true, data: [] }),
  cancelOrder: async () => ({
    ok: false,
    code: "invalid_request",
    message: "A paid Clover order is cancelled and refunded in Clover.",
  }),
};

function failureFor(reason: string) {
  if (reason === "timeout") return orderFailure<ProviderOrderRef>("timeout");
  if (reason === "not_configured") return orderFailure<ProviderOrderRef>("provider_unavailable");
  return orderFailure<ProviderOrderRef>("provider_error");
}

/** The order-service adapter: the cart becomes a Clover Hosted Checkout session. */
export const cloverOrderSubmitAdapter: ProviderOrderAdapter = {
  provider: "clover",
  isConfigured: cloverCheckoutConfigured,

  async createOrder(draft, _providerLocationId, _idempotencyKey, context) {
    if (!cloverCheckoutConfigured(draft.locationId)) return orderFailure("provider_unavailable");
    if (draft.orderType !== "PICKUP") return orderFailure("unsupported_order_type");
    const orderId = context?.orderId ?? `ord_${Date.now().toString(36)}`;
    const { inventory, source } = await inventoryForCheckout();
    // A committed catalog snapshot is only suitable for development/sandbox.
    // Never charge real cards using prices or availability that Clover did not confirm.
    if (cloverEnvironment() === "production" && source !== "live") {
      return orderFailure("provider_unavailable");
    }
    const priced = priceCloverCart(draftLines(draft), inventory, cloverSlotFor);
    if (!priced.ok) {
      return orderFailure(priced.code === "item_unavailable" ? "item_unavailable" : "menu_changed");
    }
    const taxRates = await taxRatesForCheckout();
    const site = siteBaseUrl();
    const session = await createHostedCheckout(
      buildHostedCheckoutRequest({
        lines: priced.lines,
        customer: {
          name: draft.customer.preferredName,
          phone: draft.customer.phone,
          email: draft.customer.email,
        },
        taxRates,
        urls: {
          success: `${site}/orders/${encodeURIComponent(orderId)}?paid=1`,
          failure: `${site}/checkout?payment=failed`,
          cancel: `${site}/checkout?payment=cancelled`,
        },
      }),
    );
    if (!session.ok) return failureFor(session.reason);
    const tax = taxesFor(priced.subtotal, taxRates);
    const ref: ProviderOrderRef = {
      providerOrderId: session.checkoutSessionId,
      orderNumber: websiteOrderNumber(orderId),
      providerStatus: "awaiting_payment",
      status: "SUBMITTED",
      subtotal: priced.subtotal,
      tax,
      total: priced.subtotal + tax,
      paymentUrl: session.href,
    };
    return { ok: true, data: ref } satisfies OrderResult<ProviderOrderRef>;
  },

  // A Clover order is changed, cancelled or refunded in Clover itself.
  updateOrder: async () => orderFailure("not_cancellable"),
  cancelOrder: async () => orderFailure("not_cancellable"),
  // Clover offers no read of a checkout session: the webhook is the source of truth.
  getStatus: async () => orderFailure("provider_unavailable"),
};
