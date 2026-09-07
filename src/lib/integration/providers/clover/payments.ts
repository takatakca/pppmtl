/**
 * Clover payment adapter. SERVER ONLY.
 *
 * PPP never touches card data: a payment intent is created provider-side and
 * only an opaque client secret crosses back. Disabled until credentials exist.
 */

import type { PaymentAdapter } from "@/lib/integration/core/adapter";
import { notConfigured } from "@/lib/integration/core/contracts";
import { hasCredentials } from "@/lib/integration/core/credentials.server";

const REASON_EN = "Online payment is not enabled; payment is confirmed with the restaurant.";
const REASON_FR = "Le paiement en ligne n'est pas activé; le paiement se confirme au restaurant.";

export function cloverPaymentsConfigured(): boolean {
  return hasCredentials("CLOVER_API_KEY", "CLOVER_MERCHANT_ID");
}

export const cloverPaymentAdapter: PaymentAdapter = {
  provider: "clover",
  status: () => ({
    provider: "clover",
    capability: "payments",
    available: cloverPaymentsConfigured(),
    reasonEn: REASON_EN,
    reasonFr: REASON_FR,
  }),
  createPaymentIntent: async () => notConfigured(REASON_EN),
};
