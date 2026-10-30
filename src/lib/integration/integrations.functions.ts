/**
 * Internal, read-only integration status snapshot.
 * UrbanPiper has been retired by the owner. Nothing in this file can trigger
 * a provider check, menu sync, test order, customer write or payment. The only
 * network call is Food Hub's public GET /api/health (status words, no data).
 */
import { createServerFn } from "@tanstack/react-start";
import type { CapabilityStatus, IntegrationProviderId } from "./core/contracts";

export interface FoodhubSnapshot {
  /** FOODHUB_URL and the Food Hub server secret are both set on this server. */
  configured: boolean;
  /** Hostname of FOODHUB_URL (never the secret). */
  host: string | null;
  /** GET /api/health answered (any status) — null when not configured, so nothing was pinged. */
  reachable: boolean | null;
  /** Food Hub's own overall status word from /api/health, when it answered. */
  health: string | null;
  interacEnabled: boolean;
  /** Dollars, as shown to customers. */
  interacFee: number;
  /** PPP slug -> Food Hub location code (verified defaults, env override). */
  locationCodes: Record<string, string>;
  ingressPath: string;
  message: string;
}

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
  foodhub: FoodhubSnapshot;
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
    const {
      foodhubConfigured,
      foodhubHost,
      foodhubLocationCodes,
      interacEnabled,
      interacFeeCents,
    } = await import("./providers/foodhub/config.server");
    const { foodhubHealth } = await import("./providers/foodhub/client.server");

    const pilot = firstConnectionMapping();
    const configured = foodhubConfigured();
    const health = configured ? await foodhubHealth() : null;
    const message = !configured
      ? "Not connected: set FOODHUB_URL and the Food Hub website-order secret on this service (Coolify). Phone sign-in and Interac e-Transfer stay closed until then."
      : !health?.reachable
        ? "Configured, but Food Hub's /api/health did not answer from this server. Phone sign-in and Interac orders will fail honestly until it does."
        : interacEnabled()
          ? `Connected (health: ${health.status ?? "answered"}). Phone sign-in is live; Interac e-Transfer orders are POSTed and held at Food Hub until the restaurant confirms the transfer.`
          : `Connected (health: ${health.status ?? "answered"}). Phone sign-in is live; Interac e-Transfer stays off until FOODHUB_INTERAC_ENABLED=true (set it once Food Hub's Interac branch is deployed).`;

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
        configured,
        host: foodhubHost(),
        reachable: health ? health.reachable : null,
        health: health?.status ?? null,
        interacEnabled: interacEnabled(),
        interacFee: interacFeeCents() / 100,
        locationCodes: foodhubLocationCodes(),
        ingressPath: FOODHUB_WEBSITE_ORDER_INGRESS,
        message,
      },
    };
  },
);
