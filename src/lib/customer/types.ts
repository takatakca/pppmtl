/**
 * Customer domain types for the PPP restaurant customer.
 *
 * IMPORTANT — production architecture seam:
 * Supabase Auth owns credentials (email, password hashing, verification,
 * reset, session). Prisma owns the RestaurantCustomer profile and its
 * related records, keyed by `authUserId` (the Supabase auth user UUID).
 * A PPP customer is NOT a TAKATAK workspace user: no Client,
 * ClientMembership, WorkspaceMembership or merchant permission ever
 * applies here. No password field exists in this domain, by design.
 */

export interface RestaurantCustomer {
  id: string;
  authUserId: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  preferredLanguage: "en" | "fr" | null;
  preferredLocationId: string | null;
  preferredOrderMode: "pickup" | "delivery" | null;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
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

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "unavailable" | "invalid" | "conflict" | "rate_limited"; message: string };

export interface SignUpInput {
  email: string;
  username: string;
  password: string;
  firstName?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

/** Credentials go to Supabase Auth; nothing here ever persists a password. */
export interface AuthRepository {
  signUp(input: SignUpInput): Promise<AuthResult<{ verificationEmailSentTo: string }>>;
  signIn(input: SignInInput): Promise<AuthResult<{ authUserId: string }>>;
  signOut(): Promise<AuthResult<null>>;
  requestPasswordReset(email: string): Promise<AuthResult<null>>;
}

export interface CustomerRepository {
  me(): Promise<AuthResult<RestaurantCustomer | null>>;
  update(patch: Partial<RestaurantCustomer>): Promise<AuthResult<RestaurantCustomer>>;
  isUsernameAvailable(username: string): Promise<AuthResult<boolean>>;
}

export interface AddressRepository {
  list(): Promise<AuthResult<CustomerAddress[]>>;
  create(input: Omit<CustomerAddress, "id" | "customerId">): Promise<AuthResult<CustomerAddress>>;
  remove(id: string): Promise<AuthResult<null>>;
}

export interface FavoriteRepository {
  list(): Promise<AuthResult<CustomerFavorite[]>>;
  add(menuItemId: string): Promise<AuthResult<CustomerFavorite>>;
  remove(menuItemId: string): Promise<AuthResult<null>>;
}
