import type { OrderCustomer } from "@/lib/orders/types";

/**
 * Until a TAKATAK-signed session has been verified server-side, all checkout
 * requests are guests. A browser-supplied customerId/TAKATAK ID is not proof
 * of ownership and must never be stored as a verified account relationship.
 * Contact fields remain explicitly unverified fulfilment details.
 */
export function unverifiedCheckoutCustomer(input: OrderCustomer): OrderCustomer {
  return {
    ...input,
    customerId: null,
    takatakCustomerId: null,
    isGuest: true,
  };
}

/**
 * A customer signed in with TAKATAK: the TAKATAK user id comes ONLY from the server-verified session
 * (takatak-auth.server.ts), never from the browser. Contact fields stay what the customer typed.
 */
export function verifiedCheckoutCustomer(input: OrderCustomer, takatakSub: string): OrderCustomer {
  return {
    ...input,
    customerId: null,
    takatakCustomerId: takatakSub,
    isGuest: false,
  };
}
