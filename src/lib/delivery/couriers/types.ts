/**
 * Provider-neutral courier dispatch model. Pure data, safe to import anywhere (the tablet screen uses it).
 *
 * Money is in CENTS, times are ISO-8601 strings, `null` means "the provider did not say" — never zero,
 * never invented. A provider without credentials is "not_connected" and never shows a price.
 */

/** Who brings the food: two on-demand courier APIs, Skip (manual booking) and the restaurant's own driver. */
export type CourierProviderId = "doordash" | "uber" | "skip" | "own_driver";

/** The two providers this site can quote and book through an API. */
export type OnDemandProviderId = "doordash" | "uber";

export const COURIER_LABELS: Record<CourierProviderId, string> = {
  doordash: "DoorDash",
  uber: "Uber",
  skip: "SkipTheDishes",
  own_driver: "My driver",
};

/** A structured Québec / Canadian street address. */
export interface DispatchAddress {
  street: string;
  unit: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: "CA";
  /** Customer's delivery instructions (door code, buzzer…). */
  instructions: string | null;
}

/** Everything a courier provider needs, built on the server from a stored, paid order. */
export interface CourierRequest {
  orderId: string;
  /** Human order number (PPP-AB12C), or the order id when none was issued. */
  orderNumber: string;
  pickup: {
    businessName: string;
    address: DispatchAddress;
    phoneE164: string;
    latitude: number | null;
    longitude: number | null;
    instructions: string;
  };
  dropoff: {
    address: DispatchAddress;
    contactName: string;
    phoneE164: string;
    email: string | null;
  };
  /** Food subtotal in cents, without tax, delivery fee or tip. */
  orderValueCents: number;
  items: Array<{ name: string; quantity: number; unitPriceCents: number | null }>;
  currency: "CAD";
}

/** Can staff book this option right now? */
export type CourierAvailability =
  /** A live quote: a courier can be requested now. */
  | "available"
  /** The provider answered that no courier is free right now. */
  | "busy"
  /** The provider refused this delivery (address, distance, account…); see `reason`. */
  | "unavailable"
  /** No credentials on the server: never a price. */
  | "not_connected"
  /** Booked by hand outside this site (Skip) or the restaurant's own driver. */
  | "manual";

export type CourierBadge = "cheapest" | "fastest" | "closest";

/** One card on the tablet's "Find a driver" screen. */
export interface CourierOption {
  provider: CourierProviderId;
  label: string;
  availability: CourierAvailability;
  /** Staff-readable reason when it cannot be booked; never a secret. */
  reason: string | null;
  /** Provider quote id (DoorDash: external_delivery_id; Uber: dqt_…). */
  quoteId: string | null;
  feeCents: number | null;
  currency: string | null;
  /** When a courier is expected at the restaurant. */
  pickupEta: string | null;
  /** When the customer is expected to get the food. */
  dropoffEta: string | null;
  /** Courier's distance from the restaurant, when the provider gives one. */
  distanceMeters: number | null;
  /** After this the quote cannot be booked any more. */
  expiresAt: string | null;
  /** Test credentials: no real courier comes. */
  sandbox: boolean;
  /** Where staff book it by hand (Skip). */
  manualUrl: string | null;
  badges: CourierBadge[];
}

/** A quote as the server keeps it on the order between "Find a driver" and "Book". */
export interface StoredQuote {
  provider: OnDemandProviderId;
  quoteId: string;
  feeCents: number;
  currency: string;
  pickupEta: string | null;
  dropoffEta: string | null;
  distanceMeters: number | null;
  expiresAt: string | null;
  sandbox: boolean;
}

export type CourierQuoteResult =
  | { ok: true; quote: StoredQuote }
  | { ok: false; availability: "busy" | "unavailable" | "not_connected"; reason: string };

/** Provider-neutral delivery lifecycle. */
export type DispatchStatus =
  /** This site is asking the provider right now (or a crash left it unknown). */
  | "booking"
  /** The provider accepted the delivery and is looking for a courier. */
  | "requested"
  /** A courier accepted and is heading to the restaurant. */
  | "assigned"
  | "at_pickup"
  /** The courier has the food and is heading to the customer. */
  | "picked_up"
  | "at_dropoff"
  | "delivered"
  | "cancelled"
  /** The courier is bringing the food back to the restaurant. */
  | "returning"
  | "returned"
  /** Booking was refused or could not be confirmed. */
  | "failed";

export const TERMINAL_DISPATCH_STATUSES: readonly DispatchStatus[] = [
  "delivered",
  "cancelled",
  "returned",
  "failed",
];

export function isTerminalDispatchStatus(status: DispatchStatus): boolean {
  return TERMINAL_DISPATCH_STATUSES.includes(status);
}

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  booking: "Booking…",
  requested: "Looking for a courier",
  assigned: "Courier on the way to the restaurant",
  at_pickup: "Courier at the restaurant",
  picked_up: "On the way to the customer",
  at_dropoff: "Courier at the customer's door",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returning: "Coming back to the restaurant",
  returned: "Returned to the restaurant",
  failed: "Not booked",
};

export interface CourierDriver {
  name: string | null;
  /** DoorDash and Uber give a masked number that only works for the trip. */
  phone: string | null;
  vehicle: string | null;
  location: { lat: number; lng: number } | null;
}

/** What a provider tells us about a delivery (booking answer, status read or webhook). */
export interface CourierDeliveryUpdate {
  externalId: string;
  /** Null: this update carries no status change (e.g. a courier location ping). */
  status: DispatchStatus | null;
  /** The provider's own status string, kept for support. */
  providerStatus: string;
  trackingUrl: string | null;
  feeCents: number | null;
  currency: string | null;
  pickupEta: string | null;
  dropoffEta: string | null;
  driver: CourierDriver | null;
  /** When the provider produced this update (used to ignore late, out-of-order webhooks). */
  providerUpdatedAt: string | null;
  sandbox: boolean | null;
  cancelReason: string | null;
}

export type CourierBookResult =
  | { ok: true; update: CourierDeliveryUpdate }
  /**
   * `uncertain`: no clear answer (timeout, 5xx) — the delivery may exist. The booking stays "booking" until
   * staff press Refresh (DoorDash) or check the provider's dashboard and release it (Uber).
   */
  | { ok: false; reason: string; expired: boolean; uncertain: boolean };

export type CourierCancelResult =
  | { ok: true; update: CourierDeliveryUpdate | null }
  /** `notFound`: the provider has no such delivery (never created). */
  | { ok: false; reason: string; notCancellable: boolean; notFound: boolean };

export type CourierStatusResult =
  { ok: true; update: CourierDeliveryUpdate } | { ok: false; reason: string; notFound: boolean };

/** The contract every API courier provider implements. Nothing here throws to the caller. */
export interface CourierProvider {
  id: OnDemandProviderId;
  label: string;
  /** All required credentials are set on the server. */
  configured(): boolean;
  sandbox(): boolean;
  quote(request: CourierRequest, now: Date): Promise<CourierQuoteResult>;
  /** Accept the quote: a real delivery is created. `attemptKey` is unique per booking (idempotency). */
  book(input: {
    request: CourierRequest;
    quote: StoredQuote;
    tipCents: number;
    attemptKey: string;
  }): Promise<CourierBookResult>;
  cancel(externalId: string): Promise<CourierCancelResult>;
  status(externalId: string): Promise<CourierStatusResult>;
}
