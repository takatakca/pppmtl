/**
 * Customer domain types for the PPP restaurant customer.
 *
 * IMPORTANT — production architecture seam:
 * TAKATAK Food Hub is the customer authority. A verified phone number IS the account: Food Hub creates the
 * customer on the first verified code, signs a 30-day token, and this site keeps that token in an HttpOnly
 * cookie. PPP owns no customer table, no password, no e-mail credential. A PPP customer is NOT a TAKATAK
 * workspace user: no Client, ClientMembership, WorkspaceMembership or merchant permission ever applies here.
 */

export interface RestaurantCustomer {
  /** Food Hub customer id. */
  id: string;
  /** E.164 — the key of the account. */
  phone: string;
  email: string | null;
  username: string | null;
  /**
   * What PPP calls the customer everywhere in the product (Food Hub `name`). Chosen once after the first
   * verification; `preferredNameLockedAt` is set once a name exists.
   */
  preferredName: string | null;
  preferredNameLockedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  preferredLanguage: "en" | "fr" | null;
  preferredLocationId: string | null;
  preferredOrderMode: "pickup" | "delivery" | null;
  verifiedAt: string | null;
  createdAt: string | null;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string | null;
  street: string;
  unit: string | null;
  city: string;
  province: string;
  postalCode: string;
  instructions: string | null;
  isDefault: boolean;
}

export interface CustomerFavorite {
  id: string;
  customerId: string;
  menuItemId: string;
}

/** Truthful loyalty state from Food Hub: `connected: false` carries the reason the customer reads. */
export type CustomerLoyalty =
  | { connected: false; reason: string }
  | { connected: true; points: number; tier: string | null };

export type CustomerGiftCards =
  | { connected: false; reason: string }
  | { connected: true; cards: Array<{ last4: string; balance: number }> };

/** A website order Food Hub holds for this phone (newest first, max 20). */
export interface CustomerOrderSummary {
  id: string;
  number: string;
  at: string;
  /** Dollars. */
  total: number | null;
  status: string;
  brand: string | null;
  fulfillment: string | null;
}

/** Everything /account shows, from one `GET …/customers/me`. */
export interface CustomerProfile {
  customer: RestaurantCustomer;
  addresses: CustomerAddress[];
  favourites: string[];
  loyalty: CustomerLoyalty;
  giftCards: CustomerGiftCards;
  orders: CustomerOrderSummary[];
}

export type AuthResultCode =
  | "unavailable"
  | "invalid"
  | "conflict"
  | "rate_limited"
  | "signed_out"
  | "wrong_code"
  | "code_void";

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AuthResultCode; message: string; retryAfterS?: number; attemptsLeft?: number };

/** Phone verification is the only credential; nothing here ever handles a password. */
export interface PhoneAuthRepository {
  startVerification(phone: string, lang: "fr" | "en" | "es"): Promise<AuthResult<{ expiresInS: number }>>;
  checkVerification(phone: string, code: string): Promise<AuthResult<RestaurantCustomer>>;
  signOut(): Promise<AuthResult<null>>;
}

export interface CustomerRepository {
  /** Null data = signed out. */
  me(): Promise<AuthResult<RestaurantCustomer | null>>;
  /** Null data = signed out. Also reports whether accounts are open at all (Food Hub configured). */
  profile(): Promise<AuthResult<CustomerProfile | null> & { accountsEnabled?: boolean }>;
  update(patch: {
    name?: string;
    email?: string;
    lang?: "fr" | "en";
    marketingConsent?: boolean;
  }): Promise<AuthResult<RestaurantCustomer>>;
  /** First name write; Food Hub keeps `name` editable, the site shows it as set once. */
  lockPreferredName(preferredName: string): Promise<AuthResult<RestaurantCustomer>>;
}

export interface AddressRepository {
  list(): Promise<AuthResult<CustomerAddress[]>>;
  /** Replaces the whole list at Food Hub (max 5). */
  saveAll(addresses: Array<Omit<CustomerAddress, "id" | "customerId">>): Promise<AuthResult<CustomerAddress[]>>;
}

export interface FavoriteRepository {
  list(): Promise<AuthResult<string[]>>;
  /** Replaces the whole list at Food Hub (max 50). */
  saveAll(menuItemIds: string[]): Promise<AuthResult<string[]>>;
}
