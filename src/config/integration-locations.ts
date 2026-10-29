/**
 * PPP-owned location routing. Canonical location facts remain in locations.ts.
 * Clover continues to be the POS for NDG. Every other storefront is reserved
 * for TAKATAK Food Hub, with NO inferred provider id or active order transport.
 */
import type { IntegrationProviderId } from "@/lib/integration/core/contracts";
import { restaurantLocations } from "@/config/locations";

export interface LocationIntegrationMapping {
  internalId: string;
  locationId: string;
  name: string;
  address: string;
  menuSource: IntegrationProviderId;
  orderingProvider: IntegrationProviderId;
  /** Null until explicitly verified against the active operator/provider store. */
  providerLocationId: string | null;
  /** Food Hub store code, not necessarily the PPP display slug. */
  foodhubLocationCode: string | null;
  /** Food Hub brand identity must also be verified before any order transfer. */
  foodhubBrandRef: string | null;
  /** Clover merchant mapping remains server-side; never invent this field. */
  cloverMerchantId: string | null;
  connectionPhase: 1 | null;
}

/** Pilot location for future Food Hub onboarding, not active routing. */
export const FIRST_CONNECTION_LOCATION_SLUG = "ndg";

/** NDG still uses real Clover inventory and its gated Hosted Checkout. */
export const CLOVER_LOCATION_SLUGS = ["ndg"];

export const locationIntegrationMappings: LocationIntegrationMapping[] = restaurantLocations.map(
  (location) => ({
    internalId: `PPP-${location.slug.toUpperCase()}`,
    locationId: location.id,
    name: location.displayName,
    address: `${location.address}, ${location.city}`,
    menuSource: CLOVER_LOCATION_SLUGS.includes(location.slug) ? "clover" : "local",
    orderingProvider: CLOVER_LOCATION_SLUGS.includes(location.slug) ? "clover" : "foodhub",
    providerLocationId: null,
    foodhubLocationCode: null,
    foodhubBrandRef: null,
    cloverMerchantId: null,
    connectionPhase: location.slug === FIRST_CONNECTION_LOCATION_SLUG ? 1 : null,
  }),
);

export function mappingForLocation(locationId: string): LocationIntegrationMapping | undefined {
  return locationIntegrationMappings.find(
    (location) => location.locationId === locationId || location.internalId === locationId,
  );
}

/** Never report an unverified Food Hub / Clover store as connected. */
export function isLocationMapped(locationId: string): boolean {
  return Boolean(mappingForLocation(locationId)?.providerLocationId);
}

export function firstConnectionMapping(): LocationIntegrationMapping | undefined {
  return locationIntegrationMappings.find((location) => location.connectionPhase === 1);
}

export function isConnectionEnabledFor(locationId: string): boolean {
  return mappingForLocation(locationId)?.connectionPhase === 1;
}
