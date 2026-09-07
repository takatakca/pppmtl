/**
 * Server functions exposing integration state to internal screens.
 * Provider modules are imported INSIDE handlers so credential-reading code
 * never enters the client bundle.
 */

import { createServerFn } from "@tanstack/react-start";
import type { CapabilityStatus, IntegrationProviderId } from "./core/contracts";
import type { ProviderHealthReport } from "./providers/urbanpiper/health.server";

export type { ProviderHealthReport, HealthCheck } from "./providers/urbanpiper/health.server";

export interface ConnectionCard {
  locationId: string;
  internalId: string;
  name: string;
  address: string;
  inRollout: boolean;
  connected: boolean;
  environment: "sandbox" | "production" | "not set";
  requirements: Array<{ label: string; met: boolean }>;
  missingProviderFields: string[];
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
  connection: ConnectionCard;
}

export const getIntegrationSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<IntegrationSnapshot> => {
    const { credentialPresence } = await import("./core/credentials.server");
    const { providerHealth } = await import("./core/registry");
    const { recentIntegrationEvents } = await import("./core/logging");
    const { locationIntegrationMappings } = await import("@/config/integration-locations");
    const { mappingCoverage } = await import("@/config/integration-menu-map");
    const { lastMenuSyncFor } = await import("./core/menu-sync-log");
    const { urbanPiperMenuConfigured } = await import("./providers/urbanpiper/menu");
    const { firstConnectionMapping } = await import("@/config/integration-locations");
    const { urbanPiperReadiness, urbanPiperEnvironmentLabel } =
      await import("./providers/urbanpiper/config.server");

    const target = firstConnectionMapping() ?? locationIntegrationMappings[0];
    const primary = target?.locationId ?? "";
    const readiness = urbanPiperReadiness(primary);

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
      menuSync: {
        connected: locationIntegrationMappings.some((m) => urbanPiperMenuConfigured(m.locationId)),
        reason:
          "Menu sync activates per store once UrbanPiper credentials and that store's provider id exist.",
        coverage: mappingCoverage(),
        stores: locationIntegrationMappings.map((m) => {
          const last = lastMenuSyncFor(m.locationId);
          return {
            internalId: m.internalId,
            name: m.name,
            connected: urbanPiperMenuConfigured(m.locationId),
            lastSyncAt: last?.completedAt ?? last?.startedAt ?? null,
            lastStatus: last?.status ?? "never run",
            categoriesReceived: last?.categoriesReceived ?? 0,
            productsReceived: last?.productsReceived ?? 0,
            itemsUpdated: last?.itemsUpdated ?? 0,
            errors: last?.errors ?? [],
          };
        }),
      },
      connection: {
        locationId: primary,
        internalId: target?.internalId ?? "",
        name: target?.name ?? "",
        address: target?.address ?? "",
        inRollout: readiness.inRollout,
        connected: readiness.connected,
        environment: urbanPiperEnvironmentLabel(),
        requirements: [
          { label: "API url", met: readiness.apiUrlSet },
          { label: "API key", met: readiness.apiKeySet },
          { label: "Client id", met: readiness.clientIdSet },
          { label: "Client secret", met: readiness.clientSecretSet },
          { label: "Webhook secret", met: readiness.webhookSecretSet },
          { label: "Store id", met: readiness.storeMapped },
        ],
        missingProviderFields: readiness.missingProviderFields,
      },
    };
  },
);

/** "Test Connection" — runs the real checks, never fakes a success. */
export const testProviderConnection = createServerFn({ method: "POST" })
  .inputValidator((input: { locationId: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: boolean; message: string; report: ProviderHealthReport }> => {
      const { testUrbanPiperConnection } = await import("./providers/urbanpiper/health.server");
      return testUrbanPiperConnection(data.locationId);
    },
  );

/** Live health snapshot for one store. */
export const getProviderHealth = createServerFn({ method: "POST" })
  .inputValidator((input: { locationId: string }) => input)
  .handler(async ({ data }): Promise<ProviderHealthReport> => {
    const { urbanPiperHealth } = await import("./providers/urbanpiper/health.server");
    return urbanPiperHealth(data.locationId);
  });

export interface MenuSyncRunResult {
  ok: boolean;
  message: string;
  lastSyncAt: string | null;
  categories: number;
  products: number;
  modifiers: number;
}

/** "Sync Menu Now" — blocked unless the store is mapped and credentials exist. */
export const runMenuSyncNow = createServerFn({ method: "POST" })
  .inputValidator((input: { locationId: string }) => input)
  .handler(async ({ data }): Promise<MenuSyncRunResult> => {
    const { urbanPiperConfigured } = await import("./providers/urbanpiper/config.server");
    if (!urbanPiperConfigured(data.locationId)) {
      return {
        ok: false,
        message: "Sync blocked: this store has no provider credentials or store id yet.",
        lastSyncAt: null,
        categories: 0,
        products: 0,
        modifiers: 0,
      };
    }
    const { syncLocationMenu } = await import("./providers/urbanpiper/menu-sync");
    const result = await syncLocationMenu(data.locationId);
    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        lastSyncAt: null,
        categories: 0,
        products: 0,
        modifiers: 0,
      };
    }
    const menu = result.data.menu;
    const modifiers = menu?.products.reduce((sum, p) => sum + p.modifierGroups.length, 0) ?? 0;
    return {
      ok: true,
      message: "Menu synced.",
      lastSyncAt: menu?.syncedAt ?? result.data.event.completedAt ?? null,
      categories: menu?.categories.length ?? 0,
      products: menu?.products.length ?? 0,
      modifiers,
    };
  });

export interface OrderTestPreview {
  payload: string;
  sent: boolean;
  environment: string;
  providerResponse: string | null;
  errors: string[];
}

/** Order Test Mode — builds the exact payload; transmits only to a sandbox. */
export const previewTestOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { locationId: string }) => input)
  .handler(async ({ data }): Promise<OrderTestPreview> => {
    const { runOrderTest } = await import("./providers/urbanpiper/test-order");
    const result = await runOrderTest({
      locationId: data.locationId,
      orderType: "PICKUP",
      items: [
        {
          lineId: "test-line-1",
          productId: "test-product",
          providerProductId: null,
          name: "Connection test item",
          quantity: 1,
          unitPrice: null,
          modifiers: [],
          notes: "",
        },
      ],
      customer: {
        customerId: null,
        takatakCustomerId: null,
        name: "PPP Connection Test",
        phone: "0000000000",
        email: null,
        isGuest: true,
      },
      deliveryAddress: null,
      notes: "Order test mode — not a customer order.",
    });
    return {
      payload: JSON.stringify(result.payload, null, 2),
      sent: result.sent,
      environment: result.environment,
      providerResponse: result.providerResponse,
      errors: result.errors,
    };
  });
