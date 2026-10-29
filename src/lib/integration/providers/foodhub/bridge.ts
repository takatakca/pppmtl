/**
 * First-party TAKATAK Food Hub bridge. No third-party aggregator is involved.
 *
 * The Food Hub repository already owns a website-order ingress contract at
 * /api/foodhub/webhooks/website-order. Do NOT POST orders there until the two
 * systems have verified store/brand identities, signed authentication, trusted
 * server-priced lines and a durable exactly-once order/outbox handoff.
 *
 * This adapter is deliberately fail-closed. A future approved implementation
 * can replace the methods without changing the PPP product/catalog screens.
 */
import type { ProviderAdapterSet } from "@/lib/integration/core/adapter";
import type { CapabilityStatus } from "@/lib/integration/core/contracts";
import { notConfigured } from "@/lib/integration/core/contracts";

export const FOODHUB_WEBSITE_ORDER_INGRESS = "/api/foodhub/webhooks/website-order";

/** No production connection is asserted merely from a store code or a secret. */
export function foodhubBridgeConfigured(_locationId: string): boolean {
  return false;
}

function status(capability: CapabilityStatus["capability"]): CapabilityStatus {
  return {
    provider: "foodhub",
    capability,
    available: false,
    reasonEn: "TAKATAK Food Hub bridge awaits verified tenant, store and durable order handoff.",
    reasonFr:
      "Le pont TAKATAK Food Hub attend la validation du tenant, du restaurant et des commandes durables.",
  };
}

const unavailable = () =>
  notConfigured<never>("Food Hub bridge is not activated; no order or sync was transmitted.");

export const foodhubAdapters: ProviderAdapterSet = {
  provider: "foodhub",
  menu: {
    provider: "foodhub",
    status: () => status("menu"),
    fetchMenu: async () => unavailable(),
    fetchAvailability: async () => unavailable(),
  },
  orders: {
    provider: "foodhub",
    status: () => status("orders"),
    quoteOrder: async () => unavailable(),
    createOrder: async () => unavailable(),
    submitOrder: async () => unavailable(),
    getOrder: async () => unavailable(),
    listOrders: async () => unavailable(),
    cancelOrder: async () => unavailable(),
  },
};
