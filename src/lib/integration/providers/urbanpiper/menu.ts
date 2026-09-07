/**
 * UrbanPiper menu adapter. SERVER ONLY.
 *
 * No credentials exist yet, so `status()` reports unavailable and every call
 * returns `not_configured`. The request shape is written out so that wiring
 * real credentials later is a configuration change, not a rewrite.
 */

import type { MenuAdapter } from "@/lib/integration/core/adapter";
import type {
  CapabilityStatus,
  IntegrationResult,
  UniversalMenu,
} from "@/lib/integration/core/contracts";
import { notConfigured } from "@/lib/integration/core/contracts";
import { hasCredentials, requireCredential } from "@/lib/integration/core/credentials.server";
import { mappingForLocation } from "@/config/integration-locations";
import {
  mapCategory,
  mapProduct,
  type UrbanPiperCategoryPayload,
  type UrbanPiperItemPayload,
} from "./mapping";

const REASON_EN = "Menu sync runs on the verified in-house catalog until UrbanPiper is connected.";
const REASON_FR =
  "La synchronisation du menu utilise le catalogue vérifié tant qu'UrbanPiper n'est pas connecté.";

export function urbanPiperMenuConfigured(locationId: string): boolean {
  return (
    hasCredentials("URBANPIPER_API_KEY", "URBANPIPER_BASE_URL") &&
    Boolean(mappingForLocation(locationId)?.providerLocationId)
  );
}

export const urbanPiperMenuAdapter: MenuAdapter = {
  provider: "urbanpiper",
  status(locationId): CapabilityStatus {
    return {
      provider: "urbanpiper",
      capability: "menu",
      available: urbanPiperMenuConfigured(locationId),
      reasonEn: REASON_EN,
      reasonFr: REASON_FR,
    };
  },

  async fetchMenu(locationId): Promise<IntegrationResult<UniversalMenu>> {
    if (!urbanPiperMenuConfigured(locationId)) return notConfigured(REASON_EN);

    const baseUrl = requireCredential("URBANPIPER_BASE_URL");
    const apiKey = requireCredential("URBANPIPER_API_KEY");
    const storeRef = mappingForLocation(locationId)!.providerLocationId!;

    const response = await fetch(`${baseUrl}/hub/api/v1/stores/${storeRef}/menu/`, {
      headers: { Authorization: `apikey ${apiKey}`, Accept: "application/json" },
    });
    if (!response.ok) {
      return {
        ok: false,
        code: "provider_error",
        message: `Menu sync failed (${response.status})`,
      };
    }

    const payload = (await response.json()) as {
      categories?: UrbanPiperCategoryPayload[];
      items?: UrbanPiperItemPayload[];
    };

    return {
      ok: true,
      data: {
        locationId,
        provider: "urbanpiper",
        categories: (payload.categories ?? []).map(mapCategory),
        products: (payload.items ?? []).map(mapProduct),
        syncedAt: new Date().toISOString(),
      },
    };
  },

  async fetchAvailability(locationId) {
    if (!urbanPiperMenuConfigured(locationId)) return notConfigured(REASON_EN);
    const menu = await urbanPiperMenuAdapter.fetchMenu(locationId);
    if (!menu.ok) return menu;
    return {
      ok: true,
      data: Object.fromEntries(menu.data.products.map((p) => [p.id, p.available])),
    };
  },
};
