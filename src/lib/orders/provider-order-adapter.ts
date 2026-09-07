/**
 * Provider order contract.
 *
 * Any ordering engine (UrbanPiper today, Clover or a direct POS later)
 * implements this. The order service knows nothing else about them.
 */

import type { IntegrationProviderId, UniversalOrderDraft } from "@/lib/integration/core/contracts";
import type { OrderResult } from "./errors";
import type { OrderStatus } from "./types";

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
  ): Promise<OrderResult<ProviderOrderRef>>;
  updateOrder(providerOrderId: string, patch: ProviderOrderPatch): Promise<OrderResult<true>>;
  cancelOrder(providerOrderId: string, reason: string): Promise<OrderResult<true>>;
  getStatus(providerOrderId: string): Promise<OrderResult<ProviderStatusRef>>;
}
