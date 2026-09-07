/**
 * Server functions exposing integration state to internal screens.
 * Provider modules are imported INSIDE handlers so credential-reading code
 * never enters the client bundle.
 */

import { createServerFn } from "@tanstack/react-start";
import type { CapabilityStatus, IntegrationProviderId } from "./core/contracts";

export interface IntegrationSnapshot {
  generatedAt: string;
  credentials: Record<string, boolean>;
  providers: Array<{
    provider: IntegrationProviderId;
    capabilities: CapabilityStatus[];
  }>;
  locations: Array<{
    internalId: string;
    name: string;
    address: string;
    menuSource: IntegrationProviderId;
    orderingProvider: IntegrationProviderId;
    providerLocationId: string | null;
  }>;
  events: Array<{
    id: string;
    provider: IntegrationProviderId;
    eventType: string;
    receivedAt: string;
    status: string;
    payloadReference: string;
  }>;
  menuSync: {
    connected: boolean;
    reason: string;
    coverage: {
      categoriesMapped: number;
      categoriesTotal: number;
      productsMapped: number;
      modifiersMapped: number;
    };
    stores: Array<{
      internalId: string;
      name: string;
      connected: boolean;
      lastSyncAt: string | null;
      lastStatus: string;
      categoriesReceived: number;
      productsReceived: number;
      itemsUpdated: number;
      errors: string[];
    }>;
  };
}

export const getIntegrationSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<IntegrationSnapshot> => {
    const { credentialPresence } = await import("./core/credentials.server");
    const { providerHealth } = await import("./core/registry");
    const { recentIntegrationEvents } = await import("./core/logging");
    const { locationIntegrationMappings } = await import("@/config/integration-locations");

    const primary = locationIntegrationMappings[0]?.locationId ?? "";

    return {
      generatedAt: new Date().toISOString(),
      credentials: credentialPresence(),
      providers: providerHealth(primary).map((p) => ({
        provider: p.provider,
        capabilities: p.capabilities,
      })),
      locations: locationIntegrationMappings.map((m) => ({
        internalId: m.internalId,
        name: m.name,
        address: m.address,
        menuSource: m.menuSource,
        orderingProvider: m.orderingProvider,
        providerLocationId: m.providerLocationId,
      })),
      events: recentIntegrationEvents(15).map((e) => ({
        id: e.id,
        provider: e.provider,
        eventType: e.eventType,
        receivedAt: e.receivedAt,
        status: e.status,
        payloadReference: e.payloadReference,
      })),
    };
  },
);
