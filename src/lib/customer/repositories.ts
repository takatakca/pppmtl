import {
  checkPhoneVerification,
  deleteCustomerAccount,
  getCustomerMe,
  saveCustomerAddresses,
  saveCustomerFavourites,
  signOutCustomer,
  startPhoneVerification,
  updateCustomerProfile,
  type CustomerCall,
  type CustomerFailure,
  type CustomerMe,
} from "./customer.functions";
import type {
  AddressRepository,
  AuthResult,
  AuthResultCode,
  CustomerAddress,
  CustomerProfile,
  CustomerRepository,
  FavoriteRepository,
  PhoneAuthRepository,
  RestaurantCustomer,
} from "./types";

/**
 * PRODUCTION BACKEND SEAM — TAKATAK-BACKED, NOT PPP-OWNED.
 *
 * PPP never owns a customer database. TAKATAK Food Hub is the identity and customer-data authority: one human
 * -> one customer keyed by a verified phone number -> the scoped projection PPP is allowed to show. Every
 * adapter below talks to Food Hub through server functions (the server secret stays on the server; the session
 * is an HttpOnly cookie holding Food Hub's signed token). While Food Hub is not configured, or while its
 * customer routes are not deployed yet (404), the adapters say so — nothing is faked, nothing is stored locally.
 */

type FoodhubCustomer = CustomerMe["customer"];

const MESSAGES: Record<CustomerFailure["code"], string> = {
  not_configured: "PPP accounts are not open yet — Food Hub is not connected to this site.",
  not_available: "Phone sign-in is not available yet on Food Hub. Please try again later.",
  unavailable: "Food Hub is temporarily unavailable. Please try again in a few minutes.",
  unreachable: "We could not reach Food Hub. Check your connection and try again.",
  rate_limited: "Too many attempts. Please wait before trying again.",
  invalid_phone: "Enter a 10-digit Canadian mobile number.",
  wrong_code: "That code is not right. Check the text message and try again.",
  code_void: "That code is no longer valid. Request a new one.",
  signed_out: "You are signed out. Verify your number again to continue.",
  invalid: "Something in that request was not valid.",
  error: "Food Hub answered in a way we did not expect. Please try again.",
};

function toAuthResult<T, U>(call: CustomerCall<T>, map: (data: T) => U): AuthResult<U> {
  if (call.ok) return { ok: true, data: map(call.data) };
  const code: AuthResultCode =
    call.code === "rate_limited"
      ? "rate_limited"
      : call.code === "wrong_code"
        ? "wrong_code"
        : call.code === "code_void"
          ? "code_void"
          : call.code === "signed_out"
            ? "signed_out"
            : call.code === "invalid_phone" || call.code === "invalid"
              ? "invalid"
              : "unavailable";
  return {
    ok: false,
    code,
    message: MESSAGES[call.code],
    ...(call.retryAfterS !== undefined ? { retryAfterS: call.retryAfterS } : {}),
    ...(call.attemptsLeft !== undefined ? { attemptsLeft: call.attemptsLeft } : {}),
  };
}

export function toRestaurantCustomer(customer: FoodhubCustomer): RestaurantCustomer {
  const name = customer.name?.trim() || null;
  const [firstName = null, ...rest] = name ? name.split(/\s+/) : [];
  return {
    id: customer.id,
    phone: customer.phone,
    email: customer.email,
    username: null,
    preferredName: name,
    preferredNameLockedAt: name ? (customer.verifiedAt ?? customer.createdAt ?? "set") : null,
    firstName,
    lastName: rest.length ? rest.join(" ") : null,
    preferredLanguage: customer.lang,
    preferredLocationId: null,
    preferredOrderMode: null,
    marketingConsent: customer.marketingConsent,
    verifiedAt: customer.verifiedAt,
    createdAt: customer.createdAt,
  };
}

function toAddresses(customerId: string, addresses: CustomerMe["addresses"]): CustomerAddress[] {
  return addresses.map((address, index) => ({
    id: `${customerId}:${index}`,
    customerId,
    label: address.label,
    street: address.street,
    unit: address.unit,
    city: address.city,
    province: address.province ?? "QC",
    postalCode: address.postalCode,
    instructions: address.instructions,
    isDefault: index === 0,
  }));
}

export function toProfile(me: CustomerMe): CustomerProfile {
  const customer = toRestaurantCustomer(me.customer);
  return {
    customer,
    addresses: toAddresses(customer.id, me.addresses),
    favourites: me.favourites,
    loyalty: me.loyalty,
    giftCards: me.giftCards,
    orders: me.orders,
  };
}

export const authRepository: PhoneAuthRepository = {
  startVerification: async (phone, lang) =>
    toAuthResult(await startPhoneVerification({ data: { phone, lang } }), (data) => data),
  checkVerification: async (phone, code) =>
    toAuthResult(await checkPhoneVerification({ data: { phone, code } }), toRestaurantCustomer),
  signOut: async () => toAuthResult(await signOutCustomer(), () => null),
  deleteAccount: async () => toAuthResult(await deleteCustomerAccount(), () => null),
};

export const customerRepository: CustomerRepository = {
  profile: async () => {
    const response = await getCustomerMe();
    if (!response.result.ok && response.result.code === "signed_out") {
      return { ok: true, data: null, accountsEnabled: response.accountsEnabled };
    }
    return {
      ...toAuthResult(response.result, toProfile),
      accountsEnabled: response.accountsEnabled,
    };
  },
  me: async () => {
    const result = await customerRepository.profile();
    return result.ok ? { ok: true, data: result.data?.customer ?? null } : result;
  },
  update: async (patch) =>
    toAuthResult(await updateCustomerProfile({ data: patch }), toRestaurantCustomer),
  lockPreferredName: async (preferredName) =>
    toAuthResult(
      await updateCustomerProfile({ data: { name: preferredName } }),
      toRestaurantCustomer,
    ),
};

export const addressRepository: AddressRepository = {
  list: async () => {
    const result = await customerRepository.profile();
    return result.ok ? { ok: true, data: result.data?.addresses ?? [] } : result;
  },
  saveAll: async (addresses) => {
    const response = await saveCustomerAddresses({
      data: {
        addresses: addresses.map((a) => ({
          label: a.label,
          street: a.street,
          unit: a.unit,
          city: a.city,
          province: a.province,
          postalCode: a.postalCode,
          instructions: a.instructions,
        })),
      },
    });
    return toAuthResult(response, (saved) => toAddresses("me", saved));
  },
};

export const favoriteRepository: FavoriteRepository = {
  list: async () => {
    const result = await customerRepository.profile();
    return result.ok ? { ok: true, data: result.data?.favourites ?? [] } : result;
  },
  saveAll: async (menuItemIds) =>
    toAuthResult(await saveCustomerFavourites({ data: { favourites: menuItemIds } }), (f) => f),
};
