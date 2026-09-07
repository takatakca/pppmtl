/**
 * UrbanPiper order submission adapter. SERVER ONLY.
 *
 * The payload mapping is real and tested. The transport is deliberately not
 * wired: with no credentials and no store id, every method refuses honestly.
 * No fabricated order ids, no invented statuses, no simulated success.
 */

import type {
  ProviderOrderAdapter,
  ProviderOrderRef,
  ProviderStatusRef,
} from "@/lib/orders/provider-order-adapter";
import type { OrderResult } from "@/lib/orders/errors";
import { orderFailure } from "@/lib/orders/errors";
import { hasCredentials } from "@/lib/integration/core/credentials.server";
import { mappingForLocation } from "@/config/integration-locations";
import { mapDraftToUrbanPiperOrder } from "./mapping";

export function urbanPiperOrderingConfigured(locationId: string): boolean {
  return (
    hasCredentials("URBANPIPER_API_KEY", "URBANPIPER_BASE_URL") &&
    Boolean(mappingForLocation(locationId)?.providerLocationId)
  );
}

export const urbanPiperOrderSubmitAdapter: ProviderOrderAdapter = {
  provider: "urbanpiper",
  isConfigured: urbanPiperOrderingConfigured,

  async createOrder(
    draft,
    providerLocationId,
    idempotencyKey,
  ): Promise<OrderResult<ProviderOrderRef>> {
    if (!urbanPiperOrderingConfigured(draft.locationId)) {
      return orderFailure("provider_unavailable");
    }
    // Payload is built and keyed exactly as it will be sent, so switching the
    // transport on is a one-line change once credentials exist.
    void mapDraftToUrbanPiperOrder(draft, providerLocationId);
    void idempotencyKey;
    return orderFailure("provider_unavailable");
  },

  async updateOrder(): Promise<OrderResult<true>> {
    return orderFailure("provider_unavailable");
  },

  async cancelOrder(): Promise<OrderResult<true>> {
    return orderFailure("provider_unavailable");
  },

  async getStatus(): Promise<OrderResult<ProviderStatusRef>> {
    return orderFailure("provider_unavailable");
  },
};
