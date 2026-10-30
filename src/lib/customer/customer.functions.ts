/**
 * Server functions for the customer account (phone verification = sign-in = account).
 *
 * The browser calls only these. Food Hub modules, the server secret and the session cookie are imported INSIDE
 * handlers, so nothing server-only reaches the browser bundle. No password exists anywhere in this flow.
 */
import { createServerFn } from "@tanstack/react-start";
import type {
  CustomerFailure,
  CustomerMe,
  FoodhubAddress,
  FoodhubCustomer,
  ProfilePatch,
} from "./foodhub-customers.server";

export type { CustomerFailure, CustomerFailureCode, CustomerMe } from "./foodhub-customers.server";

export type CustomerCall<T> = { ok: true; data: T } | CustomerFailure;

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}

const BAD_INPUT: CustomerFailure = { ok: false, code: "invalid" };

export const startPhoneVerification = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; lang: "fr" | "en" | "es" }) => input)
  .handler(async ({ data }): Promise<CustomerCall<{ expiresInS: number }>> => {
    if (!isRecord(data) || typeof data["phone"] !== "string" || data["phone"].length > 40) {
      return { ok: false, code: "invalid_phone" };
    }
    const { startVerification } = await import("./foodhub-customers.server");
    return startVerification({
      phone: data["phone"],
      lang: data["lang"] === "fr" ? "fr" : "en",
    });
  });

export const checkPhoneVerification = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string }) => input)
  .handler(async ({ data }): Promise<CustomerCall<FoodhubCustomer>> => {
    if (
      !isRecord(data) ||
      typeof data["phone"] !== "string" ||
      data["phone"].length > 40 ||
      typeof data["code"] !== "string" ||
      data["code"].length > 12
    ) {
      return BAD_INPUT;
    }
    const { checkVerification } = await import("./foodhub-customers.server");
    const { requestCustomerCookies } = await import("./customer-cookie.server");
    return checkVerification({ phone: data["phone"], code: data["code"] }, requestCustomerCookies);
  });

export interface CustomerMeResponse {
  /** False while FOODHUB_URL / FOODHUB_WEBSITE_ORDER_SECRET are not set: sign-in entry points stay honest. */
  accountsEnabled: boolean;
  result: CustomerCall<CustomerMe>;
}

export const getCustomerMe = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomerMeResponse> => {
    const { customersConfigured, fetchMe } = await import("./foodhub-customers.server");
    const { requestCustomerCookies } = await import("./customer-cookie.server");
    const accountsEnabled = customersConfigured();
    if (!accountsEnabled) return { accountsEnabled, result: { ok: false, code: "not_configured" } };
    return { accountsEnabled, result: await fetchMe(requestCustomerCookies) };
  },
);

export const updateCustomerProfile = createServerFn({ method: "POST" })
  .inputValidator((input: ProfilePatch) => input)
  .handler(async ({ data }): Promise<CustomerCall<FoodhubCustomer>> => {
    if (!isRecord(data)) return BAD_INPUT;
    const patch: ProfilePatch = {};
    if (typeof data["name"] === "string" && data["name"].length <= 80) patch.name = data["name"];
    if (typeof data["email"] === "string" && data["email"].length <= 120) {
      patch.email = data["email"];
    }
    if (data["lang"] === "fr" || data["lang"] === "en") patch.lang = data["lang"];
    if (typeof data["marketingConsent"] === "boolean") {
      patch.marketingConsent = data["marketingConsent"];
    }
    const { updateProfile } = await import("./foodhub-customers.server");
    const { requestCustomerCookies } = await import("./customer-cookie.server");
    return updateProfile(patch, requestCustomerCookies);
  });

export const saveCustomerAddresses = createServerFn({ method: "POST" })
  .inputValidator((input: { addresses: FoodhubAddress[] }) => input)
  .handler(async ({ data }): Promise<CustomerCall<FoodhubAddress[]>> => {
    if (!isRecord(data) || !Array.isArray(data["addresses"]) || data["addresses"].length > 5) {
      return BAD_INPUT;
    }
    const { saveAddresses } = await import("./foodhub-customers.server");
    const { requestCustomerCookies } = await import("./customer-cookie.server");
    return saveAddresses(data["addresses"] as FoodhubAddress[], requestCustomerCookies);
  });

export const saveCustomerFavourites = createServerFn({ method: "POST" })
  .inputValidator((input: { favourites: string[] }) => input)
  .handler(async ({ data }): Promise<CustomerCall<string[]>> => {
    if (!isRecord(data) || !Array.isArray(data["favourites"]) || data["favourites"].length > 50) {
      return BAD_INPUT;
    }
    const { saveFavourites } = await import("./foodhub-customers.server");
    const { requestCustomerCookies } = await import("./customer-cookie.server");
    return saveFavourites(
      data["favourites"].filter((f): f is string => typeof f === "string"),
      requestCustomerCookies,
    );
  });

export const signOutCustomer = createServerFn({ method: "POST" }).handler(
  async (): Promise<CustomerCall<null>> => {
    const { logout } = await import("./foodhub-customers.server");
    const { requestCustomerCookies } = await import("./customer-cookie.server");
    return logout(requestCustomerCookies);
  },
);

/** Law 25: the signed-in customer deletes their own account at Food Hub (record anonymised, tokens void). */
export const deleteCustomerAccount = createServerFn({ method: "POST" }).handler(
  async (): Promise<CustomerCall<null>> => {
    const { deleteAccount } = await import("./foodhub-customers.server");
    const { requestCustomerCookies } = await import("./customer-cookie.server");
    return deleteAccount(requestCustomerCookies);
  },
);
