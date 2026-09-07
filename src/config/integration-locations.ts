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
  /** Clover merchant/device mapping, when POS is wired. */
  cloverMerchantId: string | null;
}

export const locationIntegrationMappings: LocationIntegrationMapping[] = restaurantLocations.map(
  (l) => ({
    internalId: `PPP-${l.slug.toUpperCase()}`,
    locationId: l.id,
    name: l.displayName,
    address: `${l.address}, ${l.city}`,
    menuSource: l.slug === "ndg" ? "local" : "local",
    orderingProvider: "urbanpiper",
    providerLocationId: null,
    cloverMerchantId: null,
  }),
);

export function mappingForLocation(locationId: string): LocationIntegrationMapping | undefined {
  return locationIntegrationMappings.find(
    (m) => m.locationId === locationId || m.internalId === locationId,
  );
}

/** True only when a real provider store id has been supplied. */
export function isLocationMapped(locationId: string): boolean {
  return Boolean(mappingForLocation(locationId)?.providerLocationId);
}
