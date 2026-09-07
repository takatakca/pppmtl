/**
 * UrbanPiper customer adapter. SERVER ONLY.
 *
 * TAKATAK owns master identity. This adapter can only mirror the authorised
 * projection to the provider; it must never become a PPP-side CRM.
 */

import type { CustomerAdapter } from "@/lib/integration/core/adapter";
import { notConfigured } from "@/lib/integration/core/contracts";
import { hasCredentials } from "@/lib/integration/core/credentials.server";

const REASON_EN = "Customer identity is owned by TAKATAK; provider mirroring is not enabled.";
const REASON_FR =
  "L'identité client appartient à TAKATAK; la copie chez le fournisseur est inactive.";

export const urbanPiperCustomerAdapter: CustomerAdapter = {
  provider: "urbanpiper",
  status: (locationId) => ({
    provider: "urbanpiper",
    capability: "customers",
    // Requires BOTH provider credentials and a TAKATAK-authorised projection.
    available: false,
    reasonEn: REASON_EN,
    reasonFr: REASON_FR,
    ...(locationId ? {} : {}),
  }),
  upsertCustomer: async () => notConfigured(REASON_EN),
};

export function urbanPiperCustomersConfigured(): boolean {
  return hasCredentials("URBANPIPER_API_KEY") && false; // TAKATAK authority not wired yet.
}
