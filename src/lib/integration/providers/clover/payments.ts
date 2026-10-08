/**
 * Clover payment adapter. SERVER ONLY.
 *
 * PPP never touches card data. Payment happens on Clover's Hosted Checkout page: placeOrder returns its link
 * (orders.ts) and Clover's webhook confirms the payment (webhook.ts). There is no payment intent to create here.
 */

import type { PaymentAdapter } from "@/lib/integration/core/adapter";
import { cloverCheckoutConfigured } from "./config.server";

const REASON_EN = "Card payment happens on Clover's secure Hosted Checkout page.";
const REASON_FR = "Le paiement par carte se fait sur la page sécurisée Hosted Checkout de Clover.";

export function cloverPaymentsConfigured(locationId: string): boolean {
  return cloverCheckoutConfigured(locationId);
}

export const cloverPaymentAdapter: PaymentAdapter = {
  provider: "clover",
  status: (locationId) => ({
    provider: "clover",
    capability: "payments",
    available: cloverPaymentsConfigured(locationId),
    reasonEn: REASON_EN,
    reasonFr: REASON_FR,
  }),
  createPaymentIntent: async () => ({
    ok: false,
    code: "invalid_request",
    message:
      "Clover Hosted Checkout: the customer pays on Clover's page (placeOrder returns its link).",
  }),
};
