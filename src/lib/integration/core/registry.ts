/**
 * Provider registry. SERVER ONLY — it pulls provider adapters, which read
 * credentials. Never import this from a component or a route module; call it
 * from inside a server function handler or a server route handler.
 */

import type { ProviderAdapterSet } from "./adapter";
import type { CapabilityStatus, IntegrationProviderId } from "./contracts";
import { mappingForLocation } from "@/config/integration-locations";
import { foodhubAdapters } from "@/lib/integration/providers/foodhub/bridge";
import { cloverMenuAdapter } from "@/lib/integration/providers/clover/menu";
import { cloverOrderAdapter } from "@/lib/integration/providers/clover/orders";
import { cloverPaymentAdapter } from "@/lib/integration/providers/clover/payments";
import { cloverWebhookAdapter } from "@/lib/integration/providers/clover/webhook";
import { uberEatsChannel } from "@/lib/integration/providers/marketplaces/uber";
import { doorDashChannel } from "@/lib/integration/providers/marketplaces/doordash";
import { skipChannel } from "@/lib/integration/providers/marketplaces/skip";

/** NDG's ordering engine: real Clover menu, Clover Hosted Checkout, order titled + printed in Clover. */
export const cloverAdapters: ProviderAdapterSet = {
  provider: "clover",
  menu: cloverMenuAdapter,
  orders: cloverOrderAdapter,
  payments: cloverPaymentAdapter,
  webhooks: cloverWebhookAdapter,
};

const REGISTRY: Partial<Record<IntegrationProviderId, ProviderAdapterSet>> = {
  foodhub: foodhubAdapters,
  clover: cloverAdapters,
};

export const marketplaceChannels = [uberEatsChannel, doorDashChannel, skipChannel];

export function adaptersFor(provider: IntegrationProviderId): ProviderAdapterSet | undefined {
  return REGISTRY[provider];
}

/** The ordering engine configured for a store (mapping-driven, never guessed). */
export function orderingAdaptersForLocation(locationId: string): ProviderAdapterSet | undefined {
  const mapping = mappingForLocation(locationId);
  return mapping ? adaptersFor(mapping.orderingProvider) : undefined;
}

export interface ProviderHealth {
  provider: IntegrationProviderId;
  capabilities: CapabilityStatus[];
  mappedLocations: Array<{ internalId: string; providerLocationId: string | null }>;
}

/** Truthful health snapshot: a capability is green only when really usable. */
export function providerHealth(locationId: string): ProviderHealth[] {
  return (Object.keys(REGISTRY) as IntegrationProviderId[]).map((provider) => {
    const set = REGISTRY[provider]!;
    const capabilities: CapabilityStatus[] = [];
    if (set.menu) capabilities.push(set.menu.status(locationId));
    if (set.orders) capabilities.push(set.orders.status(locationId));
    if (set.customers) capabilities.push(set.customers.status(locationId));
    if (set.locations) capabilities.push(set.locations.status(locationId));
    if (set.payments) capabilities.push(set.payments.status(locationId));
    return {
      provider,
      capabilities,
      mappedLocations: [],
    };
  });
}
