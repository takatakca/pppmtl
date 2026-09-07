/**
 * PPP location -> provider mapping.
 *
 * Canonical store data (name, address, hours, phone) stays in
 * `src/config/locations.ts`. This file only records WHICH engine serves a
 * store. `providerLocationId: null` means "not mapped yet" and must render as
 * unavailable — never as connected.
 */

import type { IntegrationProviderId } from "@/lib/integration/core/contracts";
import { restaurantLocations } from "@/config/locations";

export interface LocationIntegrationMapping {
  /** Stable PPP-side id, e.g. "PPP-NDG". */
  internalId: string;
  /** Matches `RestaurantLocation.id` in the canonical registry. */
  locationId: string;
  name: string;
  address: string;
  /** Where the catalog comes from today. */
  menuSource: IntegrationProviderId;
  /** Who would process an order once credentials exist. */
  orderingProvider: IntegrationProviderId;
  /** Provider-side store id. Null until a real value is supplied. */
  providerLocationId: string | null;
  /** UrbanPiper location reference (biz location). Null until supplied. */
  urbanPiperLocationId: string | null;
  /** UrbanPiper store reference used by menu + order APIs. Null until supplied. */
  urbanPiperStoreId: string | null;
  /** UrbanPiper organization id. Null until supplied. */
  organizationId: string | null;
  /** UrbanPiper / POS merchant id. Null until supplied. */
  merchantId: string | null;
  /** Clover merchant/device mapping, when POS is wired. */
  cloverMerchantId: string | null;
  /**
   * Phase 1 rollout: only one store is prepared for the first real provider
   * connection. Every other store stays on the local catalog.
   */
  connectionPhase: 1 | null;
}

/** The single store prepared for the first UrbanPiper connection. */
export const FIRST_CONNECTION_LOCATION_SLUG = "ndg";

export const locationIntegrationMappings: LocationIntegrationMapping[] = restaurantLocations.map(
  (l) => ({
    internalId: `PPP-${l.slug.toUpperCase()}`,
    locationId: l.id,
    name: l.displayName,
    address: `${l.address}, ${l.city}`,
    menuSource: "local" as IntegrationProviderId,
    orderingProvider: "urbanpiper" as IntegrationProviderId,
    providerLocationId: null,
    urbanPiperLocationId: null,
    urbanPiperStoreId: null,
    organizationId: null,
    merchantId: null,
    cloverMerchantId: null,
    connectionPhase: l.slug === FIRST_CONNECTION_LOCATION_SLUG ? (1 as const) : null,
  }),
);

export function mappingForLocation(locationId: string): LocationIntegrationMapping | undefined {
  return locationIntegrationMappings.find(
    (m) => m.locationId === locationId || m.internalId === locationId,
  );
}

/** True only when a real provider store id has been supplied. */
export function isLocationMapped(locationId: string): boolean {
  const m = mappingForLocation(locationId);
  return Boolean(m?.providerLocationId ?? m?.urbanPiperStoreId);
}

/** The store currently prepared for the first real connection, if any. */
export function firstConnectionMapping(): LocationIntegrationMapping | undefined {
  return locationIntegrationMappings.find((m) => m.connectionPhase === 1);
}

/** Phase 1 gate: no other store may be connected before NDG works. */
export function isConnectionEnabledFor(locationId: string): boolean {
  return mappingForLocation(locationId)?.connectionPhase === 1;
}

/** Fields UrbanPiper must supply before this store can be connected. */
export function missingProviderFields(mapping: LocationIntegrationMapping): string[] {
  const missing: string[] = [];
  if (!mapping.urbanPiperLocationId) missing.push("urbanPiperLocationId");
  if (!mapping.urbanPiperStoreId) missing.push("urbanPiperStoreId");
  if (!mapping.organizationId) missing.push("organizationId");
  if (!mapping.merchantId) missing.push("merchantId");
  return missing;
}

