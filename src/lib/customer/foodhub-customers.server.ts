/**
 * Customer identity through Food Hub (TAKATAK is the customer authority; PPP owns no customer database).
 * SERVER ONLY — called from customer.functions.ts; the cookie jar is injected so the logic is testable.
 *
 * Shared contract (2026-10-29), section A:
 *   POST /api/foodhub/customers/verify/start   { tenant, phone, lang }      -> { ok, expiresInS, channel }
 *   POST /api/foodhub/customers/verify/check   { tenant, phone, code }      -> { ok, token, expiresAt, customer }
 *   GET  /api/foodhub/customers/me             X-Customer-Token             -> { customer, addresses, favourites,
 *                                                                              loyalty, giftCards, orders }
 *   PATCH /api/foodhub/customers/me            { name?, email?, lang?, marketingConsent? }
 *   PUT  /api/foodhub/customers/me/addresses   { addresses }  ·  PUT …/me/favourites { favourites }
 *   POST /api/foodhub/customers/me/logout
 * A verified phone that Food Hub does not know is created on the spot: that IS the account. Codes are never
 * logged, returned or stored here.
 */
import { foodhubRequest, type FoodhubFailure } from "@/lib/integration/providers/foodhub/client.server";
import { foodhubConfigured, foodhubTenant } from "@/lib/integration/providers/foodhub/config.server";
import type { CustomerCookies } from "./customer-cookie.server";
import { isCustomerToken, isVerificationCode, toE164Canada } from "./token";

export type CustomerFailureCode =
  | "not_configured"
  | "not_available"
  | "unavailable"
  | "unreachable"
  | "rate_limited"
  | "invalid_phone"
  | "wrong_code"
  | "code_void"
  | "signed_out"
  | "invalid"
  | "error";

export interface CustomerFailure {
  ok: false;
  code: CustomerFailureCode;
  retryAfterS?: number;
  attemptsLeft?: number;
}

export type CustomerResult<T> = { ok: true; data: T } | CustomerFailure;

export interface FoodhubCustomer {
  id: string;
  /** E.164. */
  phone: string;
  name: string | null;
  email: string | null;
  lang: "fr" | "en";
  createdAt: string | null;
  verifiedAt: string | null;
}

export interface FoodhubAddress {
  label: string | null;
  street: string;
  unit: string | null;
  city: string;
  province: string | null;
  postalCode: string;
  instructions: string | null;
}

export type LoyaltyState =
  | { connected: false; reason: string }
  | { connected: true; points: number; tier: string | null };

export type GiftCardState =
  | { connected: false; reason: string }
  | { connected: true; cards: Array<{ last4: string; balance: number }> };

export interface FoodhubOrderSummary {
  id: string;
  number: string;
  at: string;
  total: number | null;
  status: string;
  brand: string | null;
  fulfillment: string | null;
}

export interface CustomerMe {
  customer: FoodhubCustomer;
  addresses: FoodhubAddress[];
  favourites: string[];
  loyalty: LoyaltyState;
  giftCards: GiftCardState;
  orders: FoodhubOrderSummary[];
}

/* ------------------------------------------------------------- parsing */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const str = (value: unknown, max = 200): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export function parseCustomer(value: unknown): FoodhubCustomer | null {
  if (!isRecord(value)) return null;
  const id = str(value["id"], 80);
  const phone = str(value["phone"], 20);
  if (!id || !phone) return null;
  return {
    id,
    phone,
    name: str(value["name"], 80),
    email: str(value["email"], 120),
    lang: value["lang"] === "en" ? "en" : "fr",
    createdAt: str(value["createdAt"], 40),
    verifiedAt: str(value["verifiedAt"], 40),
  };
}

function parseAddress(value: unknown): FoodhubAddress | null {
  if (!isRecord(value)) return null;
  const street = str(value["street"], 160);
  const city = str(value["city"], 80);
  const postalCode = str(value["postalCode"], 12);
  if (!street || !city || !postalCode) return null;
  return {
    label: str(value["label"], 40),
    street,
    unit: str(value["unit"], 20),
    city,
    province: str(value["province"], 10),
    postalCode,
    instructions: str(value["instructions"], 200),
  };
}

function parseLoyalty(value: unknown): LoyaltyState {
  if (isRecord(value) && value["connected"] === true) {
    const points = Number(value["points"]);
    return {
      connected: true,
      points: Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0,
      tier: str(value["tier"], 40),
    };
  }
  return {
    connected: false,
    reason: (isRecord(value) && str(value["reason"], 200)) || "Loyalty is not connected yet.",
  };
}

function parseGiftCards(value: unknown): GiftCardState {
  if (isRecord(value) && value["connected"] === true) {
    const cards = Array.isArray(value["cards"]) ? value["cards"] : [];
    return {
      connected: true,
      cards: cards.flatMap((card) => {
        if (!isRecord(card)) return [];
        const last4 = str(card["last4"], 8);
        const balance = Number(card["balance"]);
        return last4 && Number.isFinite(balance) ? [{ last4, balance }] : [];
      }),
    };
  }
  return {
    connected: false,
    reason: (isRecord(value) && str(value["reason"], 200)) || "Gift cards are not connected yet.",
  };
}

function parseOrders(value: unknown): FoodhubOrderSummary[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((order) => {
    if (!isRecord(order)) return [];
    const id = str(order["id"], 80);
    const number = str(order["number"], 40);
    const at = str(order["at"], 40);
    if (!id || !number || !at) return [];
    const total = Number(order["total"]);
    return [
      {
        id,
        number,
        at,
        total: Number.isFinite(total) ? total : null,
        status: str(order["status"], 40) ?? "unknown",
        brand: str(order["brand"], 80),
        fulfillment: str(order["fulfillment"], 20),
      },
    ];
  });
}

export function parseMe(body: unknown): CustomerMe | null {
  if (!isRecord(body)) return null;
  const customer = parseCustomer(body["customer"]);
  if (!customer) return null;
  return {
    customer,
    addresses: Array.isArray(body["addresses"])
      ? body["addresses"].flatMap((a) => {
          const parsed = parseAddress(a);
          return parsed ? [parsed] : [];
        })
      : [],
    favourites: Array.isArray(body["favourites"])
      ? body["favourites"].filter((f): f is string => typeof f === "string").slice(0, 50)
      : [],
    loyalty: parseLoyalty(body["loyalty"]),
    giftCards: parseGiftCards(body["giftCards"]),
    orders: parseOrders(body["orders"]),
  };
}

/* ------------------------------------------------------------ failures */

function failure(code: CustomerFailureCode, extra: Partial<CustomerFailure> = {}): CustomerFailure {
  return { ok: false, code, ...extra };
}

/** Food Hub transport failures as the customer flow reads them. `invalidAs` words a 400/422 for the call. */
function fromTransport(
  response: FoodhubFailure,
  invalidAs: CustomerFailureCode = "invalid",
): CustomerFailure {
  switch (response.kind) {
    case "not_configured":
      return failure("not_configured");
    case "not_available":
      return failure("not_available");
    case "unavailable":
      return failure("unavailable");
    case "unreachable":
      return failure("unreachable");
    case "rate_limited":
      return failure("rate_limited", { retryAfterS: response.retryAfterS ?? 60 });
    case "unauthorized":
    case "forbidden":
      return failure("signed_out");
    case "invalid":
      return failure(invalidAs);
    default:
      return failure("error");
  }
}

/* ---------------------------------------------------------------- calls */

const BASE = "/api/foodhub/customers";

export function customersConfigured(): boolean {
  return foodhubConfigured();
}

export async function startVerification(input: {
  phone: string;
  lang: "fr" | "en";
}): Promise<CustomerResult<{ expiresInS: number }>> {
  const phone = toE164Canada(input.phone);
  if (!phone) return failure("invalid_phone");
  const response = await foodhubRequest<{ ok?: boolean; expiresInS?: number }>(
    `${BASE}/verify/start`,
    { method: "POST", body: { tenant: foodhubTenant(), phone, lang: input.lang } },
  );
  if (!response.ok) return fromTransport(response, "invalid_phone");
  const expiresInS = Number(response.body?.expiresInS);
  return { ok: true, data: { expiresInS: Number.isFinite(expiresInS) ? expiresInS : 600 } };
}

/** On success the Food Hub token becomes the HttpOnly session cookie; the customer projection is returned. */
export async function checkVerification(
  input: { phone: string; code: string },
  cookies: CustomerCookies,
): Promise<CustomerResult<FoodhubCustomer>> {
  const phone = toE164Canada(input.phone);
  if (!phone) return failure("invalid_phone");
  if (!isVerificationCode(input.code)) return failure("wrong_code");
  const response = await foodhubRequest<{ ok?: boolean; token?: unknown; customer?: unknown }>(
    `${BASE}/verify/check`,
    { method: "POST", body: { tenant: foodhubTenant(), phone, code: input.code } },
  );
  if (!response.ok) {
    if (response.kind === "unauthorized") {
      const left = isRecord(response.body) ? Number(response.body["attemptsLeft"]) : NaN;
      const attemptsLeft = Number.isFinite(left) ? Math.max(0, Math.round(left)) : undefined;
      return attemptsLeft === 0
        ? failure("code_void", { attemptsLeft: 0 })
        : failure("wrong_code", attemptsLeft === undefined ? {} : { attemptsLeft });
    }
    return fromTransport(response, "invalid_phone");
  }
  const customer = parseCustomer(response.body?.customer);
  const token = response.body?.token;
  if (!customer || !isCustomerToken(token)) return failure("error");
  cookies.write(token);
  return { ok: true, data: customer };
}

/** No cookie means signed out — no network call. A dead token is cleared and reads as signed out. */
export async function fetchMe(cookies: CustomerCookies): Promise<CustomerResult<CustomerMe>> {
  const token = cookies.read();
  if (!token) return failure("signed_out");
  const response = await foodhubRequest(`${BASE}/me`, { method: "GET", customerToken: token });
  if (!response.ok) {
    if (response.kind === "unauthorized" || response.kind === "forbidden") cookies.clear();
    return fromTransport(response);
  }
  const me = parseMe(response.body);
  return me ? { ok: true, data: me } : failure("error");
}

export interface ProfilePatch {
  name?: string;
  email?: string;
  lang?: "fr" | "en";
  marketingConsent?: boolean;
}

export async function updateProfile(
  patch: ProfilePatch,
  cookies: CustomerCookies,
): Promise<CustomerResult<FoodhubCustomer>> {
  const token = cookies.read();
  if (!token) return failure("signed_out");
  const body: ProfilePatch = {};
  if (typeof patch.name === "string") body.name = patch.name.trim().slice(0, 80);
  if (typeof patch.email === "string") body.email = patch.email.trim().slice(0, 120);
  if (patch.lang === "fr" || patch.lang === "en") body.lang = patch.lang;
  if (typeof patch.marketingConsent === "boolean") body.marketingConsent = patch.marketingConsent;
  const response = await foodhubRequest<{ customer?: unknown }>(`${BASE}/me`, {
    method: "PATCH",
    body,
    customerToken: token,
  });
  if (!response.ok) {
    if (response.kind === "unauthorized" || response.kind === "forbidden") cookies.clear();
    return fromTransport(response);
  }
  const customer = parseCustomer(response.body?.customer);
  return customer ? { ok: true, data: customer } : failure("error");
}

export async function saveAddresses(
  addresses: FoodhubAddress[],
  cookies: CustomerCookies,
): Promise<CustomerResult<FoodhubAddress[]>> {
  const token = cookies.read();
  if (!token) return failure("signed_out");
  const clean = addresses
    .map(parseAddress)
    .filter((a): a is FoodhubAddress => a !== null)
    .slice(0, 5)
    .map((a) => ({
      ...(a.label ? { label: a.label } : {}),
      street: a.street,
      ...(a.unit ? { unit: a.unit } : {}),
      city: a.city,
      ...(a.province ? { province: a.province } : {}),
      postalCode: a.postalCode,
      ...(a.instructions ? { instructions: a.instructions } : {}),
    }));
  const response = await foodhubRequest<{ addresses?: unknown }>(`${BASE}/me/addresses`, {
    method: "PUT",
    body: { addresses: clean },
    customerToken: token,
  });
  if (!response.ok) {
    if (response.kind === "unauthorized" || response.kind === "forbidden") cookies.clear();
    return fromTransport(response);
  }
  const saved = Array.isArray(response.body?.addresses)
    ? response.body.addresses.flatMap((a) => {
        const parsed = parseAddress(a);
        return parsed ? [parsed] : [];
      })
    : [];
  return { ok: true, data: saved };
}

export async function saveFavourites(
  favourites: string[],
  cookies: CustomerCookies,
): Promise<CustomerResult<string[]>> {
  const token = cookies.read();
  if (!token) return failure("signed_out");
  const clean = Array.from(
    new Set(favourites.filter((f) => typeof f === "string" && f.length <= 128)),
  ).slice(0, 50);
  const response = await foodhubRequest<{ favourites?: unknown }>(`${BASE}/me/favourites`, {
    method: "PUT",
    body: { favourites: clean },
    customerToken: token,
  });
  if (!response.ok) {
    if (response.kind === "unauthorized" || response.kind === "forbidden") cookies.clear();
    return fromTransport(response);
  }
  const saved = Array.isArray(response.body?.favourites)
    ? response.body.favourites.filter((f): f is string => typeof f === "string")
    : clean;
  return { ok: true, data: saved };
}

/** The cookie is cleared whatever Food Hub answers; Food Hub voids every token of the customer when reachable. */
export async function logout(cookies: CustomerCookies): Promise<CustomerResult<null>> {
  const token = cookies.read();
  cookies.clear();
  if (!token) return { ok: true, data: null };
  await foodhubRequest(`${BASE}/me/logout`, { method: "POST", body: {}, customerToken: token });
  return { ok: true, data: null };
}
