import type {
  AddressRepository,
  AuthRepository,
  AuthResult,
  CustomerRepository,
  FavoriteRepository,
} from "./types";

/**
 * PRODUCTION BACKEND SEAM — TAKATAK-BACKED, NOT PPP-OWNED.
 *
 * PPP must never own a customer database. TAKATAK is the identity and
 * customer-data authority: one human -> one TAKATAK MasterCustomer -> many
 * company/brand/location relationships. PPP is a tenant that receives only
 * the scoped projection of its own relationship with that person.
 *
 * Until the TAKATAK customer APIs exist, every adapter below is explicitly
 * DISABLED: it reports `unavailable` rather than faking persistence. When
 * those APIs ship, replace these with TAKATAK-backed adapters
 * (identity/register, identity/login, customer/me, orders, addresses,
 * favourites, rewards) — never with a PPP-local database connector, and
 * without touching any UI component.
 */
export const backendEnabled = false;

function unavailable<T>(): Promise<AuthResult<T>> {
  return Promise.resolve({
    ok: false,
    code: "unavailable",
    message:
      "PPP accounts are coming soon. Nothing was saved — please try again once accounts open.",
  });
}

export const authRepository: AuthRepository = {
  signUp: () => unavailable(),
  signIn: () => unavailable(),
  signOut: () => unavailable(),
  requestPasswordReset: () => unavailable(),
};

export const customerRepository: CustomerRepository = {
  me: () => unavailable(),
  update: () => unavailable(),
  isUsernameAvailable: () => unavailable(),
  lockPreferredName: () => unavailable(),
};

export const addressRepository: AddressRepository = {
  list: () => unavailable(),
  create: () => unavailable(),
  remove: () => unavailable(),
};

export const favoriteRepository: FavoriteRepository = {
  list: () => unavailable(),
  add: () => unavailable(),
  remove: () => unavailable(),
};
