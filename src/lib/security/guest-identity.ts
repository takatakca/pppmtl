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
