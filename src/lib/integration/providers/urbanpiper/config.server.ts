/**
 * UrbanPiper connection configuration. SERVER ONLY.
 *
 * Single source of truth for "is this store actually connected?". A store is
 * connected only when ALL of the following are true:
 *   1. it is the store selected for the current rollout phase,
 *   2. real credentials exist in the environment,
 *   3. a real provider store id has been supplied.
 *
 * Anything less reports not-connected. Nothing is ever assumed.
 */

import {
  hasCredentials,
  urbanPiperApiUrl,
  optionalCredential,
} from "@/lib/integration/core/credentials.server";
import {
  isConnectionEnabledFor,
  mappingForLocation,
  missingProviderFields,
} from "@/config/integration-locations";

export function urbanPiperCredentialsReady(): boolean {
  return Boolean(urbanPiperApiUrl()) && hasCredentials("URBANPIPER_API_KEY");
}

/** Real provider store reference for a PPP location, or null. */
export function urbanPiperStoreRef(locationId: string): string | null {
  const mapping = mappingForLocation(locationId);
  if (!mapping) return null;
  return mapping.urbanPiperStoreId ?? mapping.providerLocationId ?? null;
}

export function urbanPiperConfigured(locationId: string): boolean {
  return (
    isConnectionEnabledFor(locationId) &&
    urbanPiperCredentialsReady() &&
    Boolean(urbanPiperStoreRef(locationId))
  );
}

export interface UrbanPiperReadiness {
  locationId: string;
  /** Store selected for the current connection phase. */
  inRollout: boolean;
  apiUrlSet: boolean;
  apiKeySet: boolean;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  webhookSecretSet: boolean;
  storeMapped: boolean;
  missingProviderFields: string[];
  connected: boolean;
}

export function urbanPiperReadiness(locationId: string): UrbanPiperReadiness {
  const mapping = mappingForLocation(locationId);
  return {
    locationId,
    inRollout: isConnectionEnabledFor(locationId),
    apiUrlSet: Boolean(urbanPiperApiUrl()),
    apiKeySet: hasCredentials("URBANPIPER_API_KEY"),
    clientIdSet: hasCredentials("URBANPIPER_CLIENT_ID"),
    clientSecretSet: hasCredentials("URBANPIPER_CLIENT_SECRET"),
    webhookSecretSet: hasCredentials("URBANPIPER_WEBHOOK_SECRET"),
    storeMapped: Boolean(urbanPiperStoreRef(locationId)),
    missingProviderFields: mapping ? missingProviderFields(mapping) : ["unknown location"],
    connected: urbanPiperConfigured(locationId),
  };
}

/** Non-secret hint of which environment the API url points at. */
export function urbanPiperEnvironmentLabel(): "sandbox" | "production" | "not set" {
  const url = urbanPiperApiUrl();
  if (!url) return "not set";
  return /sandbox|staging|test/i.test(url) ? "sandbox" : "production";
}

export function urbanPiperApiKeyOrNull(): string | undefined {
  return optionalCredential("URBANPIPER_API_KEY");
}
