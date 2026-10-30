import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerCookies } from "../customer-cookie.server";
import {
  checkVerification,
  deleteAccount,
  fetchMe,
  logout,
  parseMe,
  saveFavourites,
  startVerification,
  updateProfile,
} from "../foodhub-customers.server";
import { customerTokenExpired, isCustomerToken, toE164Canada, formatPhoneDisplay } from "../token";

const SECRET = "test-secret-0123456789abcdef";
const TOKEN = `cust.c1.pppmtl.1900000000.1.${"a".repeat(43)}`;

function jar(initial: string | null = null): CustomerCookies & { token: string | null; writes: string[] } {
  const state = {
    token: initial,
    writes: [] as string[],
    read: () => state.token,
    write: (token: string) => {
      state.token = token;
      state.writes.push(token);
    },
    clear: () => {
      state.token = null;
    },
  };
  return state;
}

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(body === null ? "" : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", ...headers },
      });
    }),
  );
  return calls;
}

const customer = {
  id: "c1",
  phone: "+15145550000",
  name: "Mathieu",
  email: null,
  lang: "fr",
  marketingConsent: false,
  createdAt: "2026-10-29T12:00:00.000Z",
  verifiedAt: "2026-10-29T12:00:00.000Z",
};

beforeEach(() => {
  vi.stubEnv("FOODHUB_URL", "https://foodhub.test");
  vi.stubEnv("FOODHUB_WEBSITE_ORDER_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("token and phone helpers", () => {
  it("accepts only Food Hub-shaped tokens and reads their expiry", () => {
    expect(isCustomerToken(TOKEN)).toBe(true);
    expect(isCustomerToken("cust.c1.pppmtl.notanumber.1.abc")).toBe(false);
    expect(isCustomerToken("Bearer something")).toBe(false);
    expect(isCustomerToken(TOKEN + "x".repeat(600))).toBe(false);
    expect(customerTokenExpired(TOKEN)).toBe(false);
    expect(customerTokenExpired(`cust.c1.pppmtl.1000000000.1.${"a".repeat(43)}`)).toBe(true);
  });

  it("normalises Canadian numbers to E.164 and formats them for display", () => {
    expect(toE164Canada("(514) 555-0123")).toBe("+15145550123");
    expect(toE164Canada("1 514 555 0123")).toBe("+15145550123");
    expect(toE164Canada("+15145550123")).toBe("+15145550123");
    expect(toE164Canada("555-0123")).toBeNull();
    expect(toE164Canada("0145550123")).toBeNull();
    expect(formatPhoneDisplay("+15145550123")).toBe("(514) 555-0123");
  });
});

describe("verify/start", () => {
  it("POSTs tenant + E.164 phone + lang with the bearer secret, never a code", async () => {
    const calls = mockFetch(200, { ok: true, expiresInS: 600, channel: "sms" });
    const result = await startVerification({ phone: "514 555 0123", lang: "fr" });
    expect(result).toEqual({ ok: true, data: { expiresInS: 600 } });
    expect(calls[0]!.url).toBe("https://foodhub.test/api/foodhub/customers/verify/start");
    expect((calls[0]!.init.headers as Record<string, string>)["authorization"]).toBe(`Bearer ${SECRET}`);
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      tenant: "pppmtl",
      phone: "+15145550123",
      lang: "fr",
    });
  });

  it("refuses a bad number before any network call", async () => {
    const calls = mockFetch(200, { ok: true });
    expect(await startVerification({ phone: "555", lang: "en" })).toEqual({
      ok: false,
      code: "invalid_phone",
    });
    expect(calls).toHaveLength(0);
  });

  it("maps 429 to rate_limited with retryAfterS, 404 to not_available, 503 to unavailable, network to unreachable", async () => {
    mockFetch(429, { ok: false, error: "Too many", retryAfterS: 240 });
    expect(await startVerification({ phone: "5145550123", lang: "en" })).toEqual({
      ok: false,
      code: "rate_limited",
      retryAfterS: 240,
    });
    mockFetch(404, null);
    expect(await startVerification({ phone: "5145550123", lang: "en" })).toEqual({
      ok: false,
      code: "not_available",
    });
    mockFetch(503, { ok: false, error: "cannot text" });
    expect(await startVerification({ phone: "5145550123", lang: "en" })).toEqual({
      ok: false,
      code: "unavailable",
    });
    mockFetch(403, { ok: false, error: "unknown tenant" });
    expect(await startVerification({ phone: "5145550123", lang: "en" })).toEqual({
      ok: false,
      code: "not_available",
    });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    expect(await startVerification({ phone: "5145550123", lang: "en" })).toEqual({
      ok: false,
      code: "unreachable",
    });
  });

  it("says not configured without Food Hub env, and makes no call", async () => {
    vi.stubEnv("FOODHUB_URL", "");
    const calls = mockFetch(200, { ok: true });
    expect(await startVerification({ phone: "5145550123", lang: "en" })).toEqual({
      ok: false,
      code: "not_configured",
    });
    expect(calls).toHaveLength(0);
  });
});

describe("verify/check", () => {
  it("stores the Food Hub token as the session cookie and returns the customer", async () => {
    const cookies = jar();
    const calls = mockFetch(200, { ok: true, token: TOKEN, expiresAt: "2030-01-01", customer, created: true });
    const result = await checkVerification({ phone: "5145550000", code: "123456" }, cookies);
    expect(result).toMatchObject({ ok: true, data: { id: "c1", phone: "+15145550000", name: "Mathieu" } });
    expect(cookies.writes).toEqual([TOKEN]);
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      tenant: "pppmtl",
      phone: "+15145550000",
      code: "123456",
    });
  });

  it("reports a wrong code with the attempts left, a voided code (401 with 0, or 410), and stores nothing", async () => {
    const cookies = jar();
    mockFetch(401, { ok: false, error: "Wrong code", attemptsLeft: 3 });
    expect(await checkVerification({ phone: "5145550000", code: "000000" }, cookies)).toEqual({
      ok: false,
      code: "wrong_code",
      attemptsLeft: 3,
    });
    mockFetch(401, { ok: false, error: "Wrong code", attemptsLeft: 0 });
    expect(await checkVerification({ phone: "5145550000", code: "000000" }, cookies)).toEqual({
      ok: false,
      code: "code_void",
      attemptsLeft: 0,
    });
    mockFetch(410, { ok: false, error: "Code expired" });
    expect(await checkVerification({ phone: "5145550000", code: "000000" }, cookies)).toEqual({
      ok: false,
      code: "code_void",
      attemptsLeft: 0,
    });
    expect(cookies.writes).toEqual([]);
  });

  it("never stores a token that is not Food Hub-shaped", async () => {
    const cookies = jar();
    mockFetch(200, { ok: true, token: "<script>", customer });
    expect(await checkVerification({ phone: "5145550000", code: "123456" }, cookies)).toEqual({
      ok: false,
      code: "error",
    });
    expect(cookies.token).toBeNull();
  });

  it("refuses a malformed code locally", async () => {
    const calls = mockFetch(200, { ok: true, token: TOKEN, customer });
    expect(await checkVerification({ phone: "5145550000", code: "abc" }, jar())).toEqual({
      ok: false,
      code: "wrong_code",
    });
    expect(calls).toHaveLength(0);
  });
});

describe("me / profile / favourites / logout / delete", () => {
  const me = {
    ok: true,
    customer,
    addresses: [{ label: "Home", street: "1 Rue Test", city: "Montréal", province: "QC", postalCode: "H1H 1H1" }],
    favourites: ["pizza-pepperoni", 42],
    loyalty: { connected: false, reason: "LOY4LTY not connected yet" },
    giftCards: { connected: false, reason: "REW4RDS not connected yet" },
    orders: [{ id: "dir_1", number: "PPP-1", at: "2026-10-29T12:00:00Z", total: 36.78, status: "awaiting_payment", brand: "PPP Pizzeria", fulfillment: "pickup" }],
  };

  it("is signed out without a cookie and makes no call", async () => {
    const calls = mockFetch(200, me);
    expect(await fetchMe(jar())).toEqual({ ok: false, code: "signed_out" });
    expect(calls).toHaveLength(0);
  });

  it("forwards the token and parses the truthful projection (loyalty and gift cards not connected)", async () => {
    const cookies = jar(TOKEN);
    const calls = mockFetch(200, me);
    const result = await fetchMe(cookies);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((calls[0]!.init.headers as Record<string, string>)["x-customer-token"]).toBe(TOKEN);
    expect(result.data.loyalty).toEqual({ connected: false, reason: "LOY4LTY not connected yet" });
    expect(result.data.giftCards).toEqual({ connected: false, reason: "REW4RDS not connected yet" });
    expect(result.data.favourites).toEqual(["pizza-pepperoni"]);
    expect(result.data.addresses[0]).toMatchObject({ street: "1 Rue Test", postalCode: "H1H 1H1" });
    expect(result.data.orders[0]).toMatchObject({ number: "PPP-1", total: 36.78 });
    expect(result.data.customer.marketingConsent).toBe(false);
  });

  it("clears a dead token on 401 and reads as signed out; a 404 says not available and keeps the cookie", async () => {
    const cookies = jar(TOKEN);
    mockFetch(401, { ok: false, error: "bad token" });
    expect(await fetchMe(cookies)).toEqual({ ok: false, code: "signed_out" });
    expect(cookies.token).toBeNull();

    const kept = jar(TOKEN);
    mockFetch(404, null);
    expect(await fetchMe(kept)).toEqual({ ok: false, code: "not_available" });
    expect(kept.token).toBe(TOKEN);
  });

  it("rejects a projection without a customer instead of inventing one", () => {
    expect(parseMe({ ok: true, addresses: [] })).toBeNull();
  });

  it("PATCHes only known profile fields and PUTs a bounded favourites list", async () => {
    const cookies = jar(TOKEN);
    const calls = mockFetch(200, { ok: true, customer: { ...customer, marketingConsent: true } });
    const result = await updateProfile({ marketingConsent: true, name: "  Mathieu  " }, cookies);
    expect(result).toMatchObject({ ok: true, data: { marketingConsent: true } });
    expect(calls[0]!.init.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ name: "Mathieu", marketingConsent: true });

    const favCalls = mockFetch(200, { ok: true, favourites: ["a", "b"] });
    const saved = await saveFavourites(["a", "b", "a"], cookies);
    expect(saved).toEqual({ ok: true, data: ["a", "b"] });
    expect(favCalls[0]!.init.method).toBe("PUT");
    expect(JSON.parse(String(favCalls[0]!.init.body))).toEqual({ favourites: ["a", "b"] });
  });

  it("logout clears the cookie whatever Food Hub answers; delete clears it only when Food Hub confirmed", async () => {
    const cookies = jar(TOKEN);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("down"))));
    expect(await logout(cookies)).toEqual({ ok: true, data: null });
    expect(cookies.token).toBeNull();

    const kept = jar(TOKEN);
    mockFetch(503, { ok: false, error: "down" });
    expect(await deleteAccount(kept)).toEqual({ ok: false, code: "unavailable" });
    expect(kept.token).toBe(TOKEN);

    const gone = jar(TOKEN);
    const calls = mockFetch(200, { ok: true, deleted: true });
    expect(await deleteAccount(gone)).toEqual({ ok: true, data: null });
    expect(calls[0]!.init.method).toBe("DELETE");
    expect(gone.token).toBeNull();
  });
});
