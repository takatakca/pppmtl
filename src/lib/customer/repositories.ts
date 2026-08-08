import type {
  AddressRepository,
  AuthRepository,
  AuthResult,
  CustomerRepository,
  FavoriteRepository,
} from "./types";

/**
 * PRODUCTION BACKEND SEAM.
 *
 * This prototype has no Supabase Auth / Prisma backend wired yet, so every
 * adapter below is explicitly DISABLED: it reports `unavailable` rather than
 * faking a successful persistence. Swap these for the production adapters
 * (Supabase Auth for credentials + server-side Prisma for the
 * RestaurantCustomer domain) without touching any UI component.
 */
export const backendEnabled = false;

function unavailable<T>(): Promise<AuthResult<T>> {
  return Promise.resolve({
    ok: false,
    code: "unavailable",
    message:
      "Customer accounts are not connected yet. This form is the production-ready interface; no data is stored.",
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
