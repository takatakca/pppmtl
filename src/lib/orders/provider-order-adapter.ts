/**
 * Provider order contract.
 *
 * Any owner-approved engine (Food Hub, Clover or a direct POS later)
 * implements this. The order service knows nothing else about them.
 */

import type { IntegrationProviderId, UniversalOrderDraft } from "@/lib/integration/core/contracts";
import type { OrderResult } from "./errors";
import type { OrderFee, OrderInteracInstructions, OrderItem, OrderStatus } from "./types";

export interface ProviderOrderRef {
  providerOrderId: string;
  /** Human order number from the provider, when it issues one. */
  orderNumber: string | null;
  providerStatus: string;
  status: OrderStatus;
  /** Cents, when the provider prices the order. */
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  /** Provider-hosted payment page the customer is sent to (Clover Hosted Checkout). */
  paymentUrl?: string;
  /** Fees included in `total` (cents), e.g. the Interac e-Transfer fee. */
  fees?: OrderFee[];
  /** Interac e-Transfer instructions for an order held until the transfer is confirmed. */
  interac?: OrderInteracInstructions;
}

/** What the order service knows about the order being sent. */
export interface ProviderOrderContext {
  /** PPP order id (used in the provider's return links). */
  orderId: string;
  /** Priced items with their names (the universal draft carries ids only). */
  items?: OrderItem[];
  /** Food Hub customer token from the signed-in customer's cookie; never stored on the order. */
  customerToken?: string | null;
  lang?: "fr" | "en" | "es";
  /** All-inclusive total the customer was shown (cents): the provider refuses to send a different one. */
  displayedTotalCents?: number | null;
}

export interface ProviderStatusRef {
  providerStatus: string;
  status: OrderStatus;
}

export interface ProviderOrderPatch {
  notes?: string;
  deliveryAddress?: string | null;
}

export interface ProviderOrderAdapter {
  readonly provider: IntegrationProviderId;
  /** True only with real credentials AND a provider store id. */
  isConfigured(locationId: string): boolean;
  createOrder(
    draft: UniversalOrderDraft,
    providerLocationId: string,
    idempotencyKey: string,
    context?: ProviderOrderContext,
  ): Promise<OrderResult<ProviderOrderRef>>;
  updateOrder(providerOrderId: string, patch: ProviderOrderPatch): Promise<OrderResult<true>>;
  cancelOrder(providerOrderId: string, reason: string): Promise<OrderResult<true>>;
  getStatus(providerOrderId: string): Promise<OrderResult<ProviderStatusRef>>;
}
