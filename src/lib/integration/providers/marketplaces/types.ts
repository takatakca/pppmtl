import type { IntegrationProviderId } from "@/lib/integration/core/contracts";

/**
 * A delivery marketplace as PPP sees it: a storefront link plus the engine
 * that would synchronise menu and orders with it. PPP itself never calls a
 * marketplace API.
 */
export interface MarketplaceChannel {
  id: Extract<IntegrationProviderId, "uber_eats" | "doordash" | "skip">;
  label: string;
  /** Intended first-party operations owner; this is NOT evidence of an active connection. */
  managedBy: IntegrationProviderId;
  storefrontUrl: (locationId: string) => string | null;
}
