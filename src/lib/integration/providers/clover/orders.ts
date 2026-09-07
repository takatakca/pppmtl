/**
 * Clover POS order adapter. SERVER ONLY.
 *
 * Clover is a possible POS engine for PPP. Nothing is connected: every call
 * refuses with an honest reason until a merchant id and API key exist.
 */

import type { OrderAdapter } from "@/lib/integration/core/adapter";
import type { CapabilityStatus } from "@/lib/integration/core/contracts";
import { notConfigured } from "@/lib/integration/core/contracts";
import { hasCredentials } from "@/lib/integration/core/credentials.server";
import { mappingForLocation } from "@/config/integration-locations";

const REASON_EN = "Clover POS routing is not connected for this restaurant.";
const REASON_FR = "Le routage vers la caisse Clover n'est pas connecté pour ce restaurant.";

export function cloverOrdersConfigured(locationId: string): boolean {
  return (
    hasCredentials("CLOVER_API_KEY", "CLOVER_MERCHANT_ID") &&
    Boolean(mappingForLocation(locationId)?.cloverMerchantId)
  );
}

function statusFor(locationId: string): CapabilityStatus {
  return {
    provider: "clover",
    capability: "orders",
    available: cloverOrdersConfigured(locationId),
    reasonEn: REASON_EN,
    reasonFr: REASON_FR,
  };
}

export const cloverOrderAdapter: OrderAdapter = {
  provider: "clover",
  status: statusFor,
  quoteOrder: async () => notConfigured(REASON_EN),
  createOrder: async () => notConfigured(REASON_EN),
  submitOrder: async () => notConfigured(REASON_EN),
  getOrder: async () => notConfigured(REASON_EN),
  listOrders: async () => notConfigured(REASON_EN),
  cancelOrder: async () => notConfigured(REASON_EN),
};
