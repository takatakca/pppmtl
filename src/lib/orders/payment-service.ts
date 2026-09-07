/**
 * Payment boundary. SERVER ONLY.
 *
 * Deliberately inert: authorize / capture / refund exist so checkout, refunds
 * and support flows can be written today, but nothing charges anything until a
 * real processor is connected. No fake authorizations, ever.
 */

import type { OrderResult } from "./errors";
import { orderFailure } from "./errors";

export type PaymentProvider = "stripe" | "clover" | "none";

export interface PaymentAuthorization {
  provider: PaymentProvider;
  authorizationId: string;
  /** Cents. */
  amount: number;
  currency: "CAD";
}

export interface PaymentCapture {
  provider: PaymentProvider;
  captureId: string;
  amount: number;
}

export interface PaymentRefund {
  provider: PaymentProvider;
  refundId: string;
  amount: number;
}

export interface PaymentService {
  readonly provider: PaymentProvider;
  isConfigured(): boolean;
  authorize(orderId: string, amount: number): Promise<OrderResult<PaymentAuthorization>>;
  capture(authorizationId: string, amount: number): Promise<OrderResult<PaymentCapture>>;
  refund(captureId: string, amount: number, reason: string): Promise<OrderResult<PaymentRefund>>;
}

/** The only implementation today: it says no, clearly and in human words. */
export const inactivePaymentService: PaymentService = {
  provider: "none",
  isConfigured: () => false,
  authorize: async () => orderFailure("payment_unavailable"),
  capture: async () => orderFailure("payment_unavailable"),
  refund: async () => orderFailure("payment_unavailable"),
};

/**
 * Resolves the processor for a location. Stripe and Clover slot in here once
 * their keys exist; until then every order is pay-at-restaurant.
 */
export async function paymentServiceFor(locationId: string): Promise<PaymentService> {
  void locationId;
  const { hasCredentials } = await import("@/lib/integration/core/credentials.server");
  const stripeReady = hasCredentials("STRIPE_SECRET_KEY");
  const cloverReady = hasCredentials("CLOVER_API_KEY", "CLOVER_MERCHANT_ID");
  // Keys alone are not a live integration: no processor is wired yet, so the
  // service stays inactive rather than pretending it can charge a card.
  void stripeReady;
  void cloverReady;
  return inactivePaymentService;
}
