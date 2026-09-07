import type { IntegrationProviderId } from "@/lib/integration/core/contracts";

/**
 * A delivery marketplace as PPP sees it: a storefront link plus the engine
 * that would synchronise menu and orders with it. PPP itself never calls a
 * marketplace API.
 */
export interface MarketplaceChannel {
  id: Extract<IntegrationProviderId, "uber_eats" | "doordash" | "skip">;
  label: string;
  /** The aggregator responsible for menu + order sync with this channel. */
  aggregatedBy: IntegrationProviderId;
  storefrontUrl: (locationId: string) => string | null;
}
