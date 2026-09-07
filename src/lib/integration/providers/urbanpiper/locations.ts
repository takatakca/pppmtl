/**
 * UrbanPiper location adapter. SERVER ONLY.
 *
 * Store mapping lives in `src/config/integration-locations.ts`; this adapter
 * only reports it and, once credentials exist, verifies it against the
 * provider's store list.
 */

import type { LocationAdapter, ProviderLocationRef } from "@/lib/integration/core/adapter";
import type { IntegrationResult } from "@/lib/integration/core/contracts";
import { hasCredentials } from "@/lib/integration/core/credentials.server";
import { locationIntegrationMappings, mappingForLocation } from "@/config/integration-locations";

const REASON_EN = "No PPP store is mapped to an UrbanPiper store id yet.";
const REASON_FR = "Aucune succursale PPP n'est encore associée à un identifiant UrbanPiper.";

export const urbanPiperLocationAdapter: LocationAdapter = {
  provider: "urbanpiper",
  status: (locationId) => ({
    provider: "urbanpiper",
    capability: "locations",
    available:
      hasCredentials("URBANPIPER_API_KEY", "URBANPIPER_BASE_URL") &&
      Boolean(mappingForLocation(locationId)?.providerLocationId),
    reasonEn: REASON_EN,
    reasonFr: REASON_FR,
  }),
  listLocations: async (): Promise<IntegrationResult<ProviderLocationRef[]>> => ({
    ok: true,
    data: locationIntegrationMappings.map<ProviderLocationRef>((m) => ({
      internalId: m.internalId,
      providerLocationId: m.providerLocationId,
      name: m.name,
    })),
  }),
};
