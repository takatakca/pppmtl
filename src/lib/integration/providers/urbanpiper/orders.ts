/**
 * UrbanPiper order adapter. SERVER ONLY.
 *
 * Every method refuses honestly until credentials and a store mapping exist.
 * No simulated orders, no invented statuses, no fake order numbers.
 */

import type { OrderAdapter } from "@/lib/integration/core/adapter";
import type { CapabilityStatus } from "@/lib/integration/core/contracts";
import { notConfigured } from "@/lib/integration/core/contracts";
import { hasCredentials } from "@/lib/integration/core/credentials.server";
import { mappingForLocation } from "@/config/integration-locations";

const REASON_EN = "Online ordering is completed by phone or a delivery app until PPP Direct opens.";
const REASON_FR =
  "La commande se termine par téléphone ou une app de livraison jusqu'à l'ouverture de PPP Direct.";

export function urbanPiperOrdersConfigured(locationId: string): boolean {
  return (
    hasCredentials("URBANPIPER_API_KEY", "URBANPIPER_BASE_URL") &&
    Boolean(mappingForLocation(locationId)?.providerLocationId)
  );
}

function statusFor(locationId: string): CapabilityStatus {
  return {
    provider: "urbanpiper",
    capability: "orders",
    available: urbanPiperOrdersConfigured(locationId),
    reasonEn: REASON_EN,
    reasonFr: REASON_FR,
  };
}

export const urbanPiperOrderAdapter: OrderAdapter = {
  provider: "urbanpiper",
  status: statusFor,
  quoteOrder: async () => notConfigured(REASON_EN),
  createOrder: async () => notConfigured(REASON_EN),
  submitOrder: async () => notConfigured(REASON_EN),
  getOrder: async () => notConfigured(REASON_EN),
  listOrders: async () => notConfigured(REASON_EN),
  cancelOrder: async () => notConfigured(REASON_EN),
};
