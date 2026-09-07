/**
 * ORDER TEST MODE — payload preview. SERVER ONLY.
 *
 * Builds the exact payload PPP would send, shows it, and refuses to transmit
 * unless the API url points at a sandbox environment AND the store is
 * connected. A live URL can never receive a test order by accident.
 */

import type { OrderDraft } from "@/lib/orders/types";
import { draftToUniversalDraft } from "@/lib/orders/order-mapping";
import { mapDraftToUrbanPiperOrder } from "./mapping";
import {
  urbanPiperConfigured,
  urbanPiperEnvironmentLabel,
  urbanPiperStoreRef,
} from "./config.server";

export interface OrderTestResult {
  /** The payload exactly as it would be sent. */
  payload: unknown;
  /** Whether the payload was actually transmitted. */
  sent: boolean;
  environment: "sandbox" | "production" | "not set";
  providerResponse: string | null;
  errors: string[];
}

export async function runOrderTest(draft: OrderDraft): Promise<OrderTestResult> {
  const environment = urbanPiperEnvironmentLabel();
  const storeRef = urbanPiperStoreRef(draft.locationId);
  const universal = draftToUniversalDraft(draft);
  const payload = mapDraftToUrbanPiperOrder(universal, storeRef ?? "<store id pending>");

  const errors: string[] = [];
  if (!storeRef) errors.push("Store is not mapped to a provider store id.");
  if (!urbanPiperConfigured(draft.locationId)) errors.push("Provider credentials are not set.");
  if (environment !== "sandbox") {
    errors.push("Test orders are only transmitted to a sandbox API url.");
  }

  return {
    payload,
    sent: false,
    environment,
    providerResponse: null,
    errors,
  };
}
