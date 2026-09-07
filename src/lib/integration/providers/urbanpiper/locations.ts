/**
 * UrbanPiper location adapter. SERVER ONLY.
 *
 * Store mapping lives in `src/config/integration-locations.ts`; this adapter
 * only reports it and, once credentials exist, verifies it against the
 * provider's store list.
 */

import type { LocationAdapter, ProviderLocationRef } from "@/lib/integration/core/adapter";
import type { IntegrationResult } from "@/lib/integration/core/contracts";
import { locationIntegrationMappings } from "@/config/integration-locations";
import { urbanPiperConfigured } from "./config.server";

const REASON_EN = "No PPP store is mapped to an UrbanPiper store id yet.";
const REASON_FR = "Aucune succursale PPP n'est encore associée à un identifiant UrbanPiper.";

export const urbanPiperLocationAdapter: LocationAdapter = {
  provider: "urbanpiper",
  status: (locationId) => ({
    provider: "urbanpiper",
    capability: "locations",
    available: urbanPiperConfigured(locationId),
    reasonEn: REASON_EN,
    reasonFr: REASON_FR,
  }),
  listLocations: async (): Promise<IntegrationResult<ProviderLocationRef[]>> => ({
    ok: true,
    data: locationIntegrationMappings.map<ProviderLocationRef>((m) => ({
      internalId: m.internalId,
      providerLocationId: m.urbanPiperStoreId ?? m.providerLocationId,
      name: m.name,
    })),
  }),
};
