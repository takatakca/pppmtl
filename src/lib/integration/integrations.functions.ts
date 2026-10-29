/**
 * Internal, read-only integration status snapshot.
 * UrbanPiper has been retired by the owner. Nothing in this file can trigger
 * a provider check, menu sync, test order, customer write or payment.
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
  }>;
  foodhub: {
    connected: false;
    readyForOrders: false;
    message: string;
    ingressPath: string;
    pilotLocationId: string | null;
  };
}

export const getIntegrationSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<IntegrationSnapshot> => {
    const { requireAdmin } = await import("@/lib/security/admin.server");
    requireAdmin();

    const { credentialPresence } = await import("./core/credentials.server");
    const { providerHealth } = await import("./core/registry");
    const { recentIntegrationEvents } = await import("./core/logging");
    const { locationIntegrationMappings, firstConnectionMapping } =
      await import("@/config/integration-locations");
    const { FOODHUB_WEBSITE_ORDER_INGRESS } = await import("./providers/foodhub/bridge");

    const pilot = firstConnectionMapping();
    return {
      generatedAt: new Date().toISOString(),
      credentials: credentialPresence(),
      providers: providerHealth(pilot?.locationId ?? "").map((p) => ({
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
      events: recentIntegrationEvents(15).map((event) => ({
        id: event.id,
        provider: event.provider,
        eventType: event.eventType,
        receivedAt: event.receivedAt,
        status: event.status,
      })),
      foodhub: {
        connected: false,
        readyForOrders: false,
        pilotLocationId: pilot?.locationId ?? null,
        ingressPath: FOODHUB_WEBSITE_ORDER_INGRESS,
        message:
          "Owner-controlled Food Hub is the intended engine. Orders and menu sync stay offline until signed tenant/store mapping, server-side pricing, durable reconciliation and operator QA are verified.",
      },
    };
  },
);
