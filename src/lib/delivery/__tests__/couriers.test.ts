import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliveryAddressLine, RESTAURANT_COORDS } from "@/config/delivery";
import {
  addressOneLine,
  distanceMeters,
  dropoffNote,
  parseDeliveryAddress,
  toE164,
} from "../couriers/address";
import {
  doorDashEventStatus,
  doorDashJwt,
  doorDashProvider,
  doorDashStatus,
} from "../couriers/doordash.server";
import { parseSavedDrivers, textDriver } from "../couriers/own-driver.server";
import { rankCourierOptions } from "../couriers/ranking";
import { skipOption } from "../couriers/skip";
import type { CourierOption, CourierRequest, StoredQuote } from "../couriers/types";
import {
  parseUberDelivery,
  resetUberTokenForTests,
  uberProvider,
  uberStatus,
} from "../couriers/uber.server";
import { courierRequestFor } from "../dispatch-service.server";
import {
  clearCourierEnv,
  DD_ENV,
  doorDashQuoteResponder,
  json,
  mockFetch,
  paidDeliveryOrder,
  stubEnv,
  UBER_ENV,
  uberQuoteResponder,
  uberTokenResponder,
} from "./fixtures";

beforeEach(() => {
  clearCourierEnv();
  resetUberTokenForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(): CourierRequest {
  const built = courierRequestFor(paidDeliveryOrder());
  if (!built.ok) throw new Error(built.reason);
  return built.request;
}

describe("delivery address and phone", () => {
  it("reads the checkout's one-line Québec address with unit and instructions", () => {
    expect(
      parseDeliveryAddress("5555 Av. de Monkland, App. 4, Montréal, QC H4A 1C9 — Sonnez au 4"),
    ).toEqual({
      street: "5555 Av. de Monkland",
      unit: "4",
      city: "Montréal",
      province: "QC",
      postalCode: "H4A 1C9",
      country: "CA",
      instructions: "Sonnez au 4",
    });
  });

  it("reads exactly what the checkout writes (deliveryAddressLine)", () => {
    const line = deliveryAddressLine({
      street: "5800 Avenue de Monkland",
      unit: "3",
      city: "Montréal",
      postalCode: "h4a1g1",
      instructions: "Sonnez 302",
    });
    expect(line).toBe("5800 Avenue de Monkland, App. 3, Montréal, QC H4A 1G1 — Sonnez 302");
    expect(parseDeliveryAddress(line)).toEqual({
      street: "5800 Avenue de Monkland",
      unit: "3",
      city: "Montréal",
      province: "QC",
      postalCode: "H4A 1G1",
      country: "CA",
      instructions: "Sonnez 302",
    });
    expect(
      parseDeliveryAddress(
        deliveryAddressLine({ street: "6280 Av. Somerled", postalCode: "H3X 2B6" }),
      ),
    ).toMatchObject({
      street: "6280 Av. Somerled",
      unit: null,
      city: "Montréal",
      instructions: null,
    });
  });

  it("accepts a missing unit, missing instructions, lowercase postal code and a trailing Canada", () => {
    expect(parseDeliveryAddress("6280 Av. Somerled, Montréal, QC h3x2b6, Canada")).toMatchObject({
      street: "6280 Av. Somerled",
      unit: null,
      city: "Montréal",
      postalCode: "H3X 2B6",
      instructions: null,
    });
    expect(parseDeliveryAddress("100 rue Sherbrooke O, Montréal H2X 1X1")).toMatchObject({
      city: "Montréal",
      province: "QC",
      postalCode: "H2X 1X1",
    });
  });

  it("refuses addresses it cannot read with confidence", () => {
    expect(parseDeliveryAddress(null)).toBeNull();
    expect(parseDeliveryAddress("")).toBeNull();
    expect(parseDeliveryAddress("chez Marie")).toBeNull();
    expect(parseDeliveryAddress("Av. Somerled, Montréal, QC H3X 2B6")).toBeNull(); // no civic number
    expect(parseDeliveryAddress("6280 Av. Somerled, Montréal, QC")).toBeNull(); // no postal code
    expect(parseDeliveryAddress("x".repeat(700))).toBeNull();
  });

  it("formats one line for DoorDash and a courier note with the unit", () => {
    const a = parseDeliveryAddress(
      "5555 Av. de Monkland, App. 4, Montréal, QC H4A 1C9 — Sonnez au 4",
    )!;
    expect(addressOneLine(a)).toBe("5555 Av. de Monkland, Montréal, QC H4A 1C9, Canada");
    expect(dropoffNote(a)).toBe("App./Apt 4 — Sonnez au 4");
  });

  it("converts North American phone numbers to E.164 and rejects the rest", () => {
    expect(toE164("(514) 555-0199")).toBe("+15145550199");
    expect(toE164("1-450-999-4999")).toBe("+14509994999");
    expect(toE164("+1 438 555 0100")).toBe("+14385550100");
    expect(toE164("555-0199")).toBeNull();
    expect(toE164("011 33 1 23 45 67 89")).toBeNull();
    expect(toE164("1234567890")).toBeNull(); // area code cannot start with 1
    expect(toE164(null)).toBeNull();
  });

  it("measures distance in metres", () => {
    // About 1.1 km between the restaurant and Monkland village.
    const d = distanceMeters(
      { lat: 45.4705921, lng: -73.6353129 },
      { lat: 45.4733, lng: -73.6214 },
    );
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1300);
  });
});

describe("CHEAPEST / FASTEST / CLOSEST", () => {
  const now = Date.parse("2026-10-31T22:00:00Z");
  const at = (min: number) => new Date(now + min * 60_000).toISOString();
  function option(
    partial: Partial<CourierOption> & Pick<CourierOption, "provider">,
  ): CourierOption {
    return {
      label: partial.provider,
      availability: "available",
      reason: null,
      quoteId: "q",
      feeCents: 900,
      currency: "CAD",
      pickupEta: at(10),
      dropoffEta: at(30),
      distanceMeters: null,
      expiresAt: at(5),
      sandbox: false,
      manualUrl: null,
      badges: [],
      ...partial,
    };
  }

  it("gives CHEAPEST to the lower fee and FASTEST to the earlier pickup", () => {
    const ranked = rankCourierOptions(
      [
        option({ provider: "doordash", feeCents: 975, pickupEta: at(6) }),
        option({ provider: "uber", feeCents: 850, pickupEta: at(12) }),
        skipOption(),
      ],
      now,
    );
    expect(ranked[0]!.badges).toEqual(["fastest"]);
    expect(ranked[1]!.badges).toEqual(["cheapest"]);
    expect(ranked[2]!.badges).toEqual([]);
  });

  it("breaks a pickup tie with the earlier drop-off, and shares a fee tie", () => {
    const ranked = rankCourierOptions(
      [
        option({ provider: "doordash", pickupEta: at(8), dropoffEta: at(28) }),
        option({ provider: "uber", pickupEta: at(8), dropoffEta: at(25) }),
      ],
      now,
    );
    expect(ranked[0]!.badges).toEqual(["cheapest"]);
    expect(ranked[1]!.badges).toEqual(["cheapest", "fastest"]);
  });

  it("gives CLOSEST only when providers report a courier distance", () => {
    const without = rankCourierOptions(
      [option({ provider: "doordash" }), option({ provider: "uber", feeCents: 800 })],
      now,
    );
    expect(without.flatMap((o) => o.badges)).not.toContain("closest");
    const withDistance = rankCourierOptions(
      [
        option({ provider: "doordash", distanceMeters: 2400 }),
        option({ provider: "uber", distanceMeters: 900 }),
      ],
      now,
    );
    expect(withDistance[1]!.badges).toContain("closest");
  });

  it("never badges expired, busy, not-connected or manual options, nor a lone quote", () => {
    const ranked = rankCourierOptions(
      [
        option({ provider: "doordash", feeCents: 100, expiresAt: at(-1) }),
        option({ provider: "uber", availability: "busy", feeCents: null }),
        { ...skipOption(), feeCents: 0 },
        option({ provider: "own_driver", availability: "manual", feeCents: 0 }),
      ],
      now,
    );
    expect(ranked.flatMap((o) => o.badges)).toEqual([]);
    expect(rankCourierOptions([option({ provider: "uber" })], now)[0]!.badges).toEqual([]);
  });
});

describe("DoorDash Drive", () => {
  it("signs a DD-JWT-V1 token with the base64-decoded signing secret", () => {
    const now = Date.parse("2026-10-31T22:00:00Z");
    const token = doorDashJwt(
      {
        developerId: DD_ENV.DOORDASH_DEVELOPER_ID,
        keyId: DD_ENV.DOORDASH_KEY_ID,
        signingSecret: DD_ENV.DOORDASH_SIGNING_SECRET,
      },
      now,
    );
    const [h, p, s] = token.split(".");
    expect(JSON.parse(Buffer.from(h!, "base64url").toString())).toEqual({
      alg: "HS256",
      typ: "JWT",
      "dd-ver": "DD-JWT-V1",
    });
    const claims = JSON.parse(Buffer.from(p!, "base64url").toString());
    expect(claims).toMatchObject({
      aud: "doordash",
      iss: DD_ENV.DOORDASH_DEVELOPER_ID,
      kid: DD_ENV.DOORDASH_KEY_ID,
    });
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(1800);
    const key = Buffer.from("dd-signing-secret-for-tests-only");
    expect(s).toBe(createHmac("sha256", key).update(`${h}.${p}`).digest("base64url"));
  });

  it("is 'not connected' without credentials and never calls DoorDash", async () => {
    const calls = mockFetch();
    const result = await doorDashProvider.quote(request(), new Date());
    expect(result).toMatchObject({ ok: false, availability: "not_connected" });
    expect(calls).toHaveLength(0);
  });

  it("sends a documented quote body and reads the fee, currency and ETAs", async () => {
    stubEnv(DD_ENV);
    const calls = mockFetch(doorDashQuoteResponder(975, 12));
    const now = new Date();
    const result = await doorDashProvider.quote(request(), now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quote).toMatchObject({ provider: "doordash", feeCents: 975, currency: "CAD" });
    expect(Date.parse(result.quote.expiresAt!) - now.getTime()).toBe(5 * 60_000);
    expect(calls[0]!.headers["authorization"]).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(json(calls[0])).toEqual({
      external_delivery_id: result.quote.quoteId,
      locale: "fr-CA",
      pickup_address: "6280 Av. Somerled, Montréal, QC H3X 2B6, Canada",
      pickup_business_name: "PPP Pizzeria — NDG",
      pickup_phone_number: "+14509994999",
      pickup_instructions: expect.stringContaining("PPP-AB12C"),
      pickup_reference_tag: "PPP-AB12C",
      dropoff_address: "5555 Av. de Monkland, Montréal, QC H4A 1C9, Canada",
      dropoff_phone_number: "+15145550199",
      dropoff_instructions: "App./Apt 4 — Sonnez au 4",
      dropoff_contact_given_name: "Marie",
      dropoff_contact_family_name: "Tremblay",
      order_value: 3448,
    });
    expect(result.quote.quoteId).toMatch(/^PPP-AB12C-[a-z0-9]+$/);
  });

  it("reports DoorDash's refusal (outside coverage) without a price", async () => {
    stubEnv(DD_ENV);
    mockFetch(() => ({
      status: 422,
      body: { code: "unprocessable_entity", message: "Delivery is outside of the coverage area" },
    }));
    const result = await doorDashProvider.quote(request(), new Date());
    expect(result).toMatchObject({ ok: false, availability: "unavailable" });
    if (!result.ok) expect(result.reason).toContain("outside of the coverage area");
  });

  it("accepts the quote with the tip and reads the delivery", async () => {
    stubEnv(DD_ENV);
    const calls = mockFetch((call) =>
      call.url.endsWith("/drive/v2/quotes/PPP-AB12C-abc/accept")
        ? {
            status: 200,
            body: {
              external_delivery_id: "PPP-AB12C-abc",
              delivery_status: "created",
              fee: 975,
              tip: 300,
              currency: "CAD",
              tracking_url: "https://doordash.com/drive/portal/track/abc",
              pickup_time_estimated: "2026-10-31T22:12:00Z",
              dropoff_time_estimated: "2026-10-31T22:32:00Z",
              updated_at: "2026-10-31T22:00:05Z",
            },
          }
        : null,
    );
    const quote: StoredQuote = {
      provider: "doordash",
      quoteId: "PPP-AB12C-abc",
      feeCents: 975,
      currency: "CAD",
      pickupEta: null,
      dropoffEta: null,
      distanceMeters: null,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sandbox: false,
    };
    const result = await doorDashProvider.book({
      request: request(),
      quote,
      tipCents: 300,
      attemptKey: "dsp_1",
    });
    expect(json(calls[0])).toEqual({ tip: 300 });
    expect(result).toMatchObject({
      ok: true,
      update: {
        externalId: "PPP-AB12C-abc",
        status: "requested",
        trackingUrl: "https://doordash.com/drive/portal/track/abc",
        feeCents: 975,
      },
    });
  });

  it("marks a timed-out booking as uncertain (it may exist), not as failed", async () => {
    stubEnv(DD_ENV);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );
    const result = await doorDashProvider.book({
      request: request(),
      quote: {
        provider: "doordash",
        quoteId: "PPP-AB12C-abc",
        feeCents: 975,
        currency: "CAD",
        pickupEta: null,
        dropoffEta: null,
        distanceMeters: null,
        expiresAt: null,
        sandbox: false,
      },
      tipCents: 0,
      attemptKey: "dsp_1",
    });
    expect(result).toMatchObject({ ok: false, uncertain: true, expired: false });
  });

  it("cancels with PUT, and reports 409 as not cancellable and 404 as not found", async () => {
    stubEnv(DD_ENV);
    let answer = 200;
    const calls = mockFetch((call) =>
      call.url.endsWith("/drive/v2/deliveries/PPP-AB12C-abc/cancel") && call.method === "PUT"
        ? {
            status: answer,
            body:
              answer === 200
                ? { external_delivery_id: "PPP-AB12C-abc", delivery_status: "cancelled" }
                : { code: "conflict", message: "cannot cancel" },
          }
        : null,
    );
    expect(await doorDashProvider.cancel("PPP-AB12C-abc")).toMatchObject({
      ok: true,
      update: { status: "cancelled" },
    });
    answer = 409;
    expect(await doorDashProvider.cancel("PPP-AB12C-abc")).toMatchObject({
      ok: false,
      notCancellable: true,
      notFound: false,
    });
    answer = 404;
    expect(await doorDashProvider.cancel("PPP-AB12C-abc")).toMatchObject({
      ok: false,
      notFound: true,
    });
    expect(calls).toHaveLength(3);
  });

  it("maps every documented delivery status and webhook event", () => {
    expect(
      [
        "created",
        "confirmed",
        "enroute_to_pickup",
        "arrived_at_pickup",
        "picked_up",
        "enroute_to_dropoff",
        "arrived_at_dropoff",
        "delivered",
        "cancelled",
      ].map(doorDashStatus),
    ).toEqual([
      "requested",
      "assigned",
      "assigned",
      "at_pickup",
      "picked_up",
      "picked_up",
      "at_dropoff",
      "delivered",
      "cancelled",
    ]);
    expect(doorDashEventStatus("DASHER_CONFIRMED")).toBe("assigned");
    expect(doorDashEventStatus("DASHER_PICKED_UP")).toBe("picked_up");
    expect(doorDashEventStatus("DASHER_DROPPED_OFF")).toBe("delivered");
    expect(doorDashEventStatus("DELIVERY_CANCELLED")).toBe("cancelled");
    expect(doorDashEventStatus("DELIVERY_RETURNED")).toBe("returned");
    expect(doorDashEventStatus("DELIVERY_BATCHED")).toBeNull();
  });
});

describe("Uber Direct", () => {
  it("is 'not connected' without all three credentials", async () => {
    stubEnv({ UBER_DIRECT_CLIENT_ID: "x", UBER_DIRECT_CLIENT_SECRET: "y" });
    const calls = mockFetch();
    expect(await uberProvider.quote(request(), new Date())).toMatchObject({
      ok: false,
      availability: "not_connected",
    });
    expect(calls).toHaveLength(0);
  });

  it("gets a client-credentials token once, then quotes with structured addresses", async () => {
    stubEnv(UBER_ENV);
    const calls = mockFetch(uberTokenResponder(), uberQuoteResponder(850, 8, 30));
    const now = new Date();
    const first = await uberProvider.quote(request(), now);
    await uberProvider.quote(request(), now);
    const tokenCalls = calls.filter((c) => c.url === "https://auth.uber.com/oauth/v2/token");
    expect(tokenCalls).toHaveLength(1);
    const form = new URLSearchParams(tokenCalls[0]!.body ?? "");
    expect(Object.fromEntries(form)).toEqual({
      client_id: "uber-client-id",
      client_secret: "uber-client-secret",
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    });
    const quoteCall = calls.find((c) => c.url.endsWith("/delivery_quotes"))!;
    expect(quoteCall.url).toBe(
      "https://api.uber.com/v1/customers/cus_test_customer/delivery_quotes",
    );
    expect(quoteCall.headers["authorization"]).toBe("Bearer uber-access-token");
    const body = json<Record<string, unknown>>(quoteCall);
    expect(JSON.parse(String(body["dropoff_address"]))).toEqual({
      street_address: ["5555 Av. de Monkland", "App. 4"],
      city: "Montréal",
      state: "QC",
      zip_code: "H4A 1C9",
      country: "CA",
    });
    expect(body).toMatchObject({
      pickup_latitude: RESTAURANT_COORDS.lat,
      pickup_longitude: RESTAURANT_COORDS.lng,
      pickup_phone_number: "+14509994999",
      dropoff_phone_number: "+15145550199",
      manifest_total_value: 3448,
    });
    expect(first).toMatchObject({
      ok: true,
      quote: { provider: "uber", quoteId: "dqt_test_quote", feeCents: 850, currency: "CAD" },
    });
    if (first.ok) {
      expect(Date.parse(first.quote.pickupEta!) - now.getTime()).toBe(8 * 60_000);
      expect(first.quote.expiresAt).not.toBeNull();
    }
  });

  it("shows 'no courier free' on 503 couriers_busy and 'cannot deliver' on address_undeliverable", async () => {
    stubEnv(UBER_ENV);
    let answer: { status: number; body: unknown } = {
      status: 503,
      body: { code: "couriers_busy", message: "All couriers are busy" },
    };
    mockFetch(uberTokenResponder(), (c) => (c.url.endsWith("/delivery_quotes") ? answer : null));
    expect(await uberProvider.quote(request(), new Date())).toMatchObject({
      ok: false,
      availability: "busy",
    });
    answer = { status: 400, body: { code: "address_undeliverable", message: "x" } };
    expect(await uberProvider.quote(request(), new Date())).toMatchObject({
      ok: false,
      availability: "unavailable",
      reason: "Uber cannot deliver to this address.",
    });
  });

  it("creates the delivery from the quote with an idempotency key, tip and manifest", async () => {
    stubEnv(UBER_ENV);
    const calls = mockFetch(uberTokenResponder(), (c) =>
      c.url.endsWith("/deliveries") && c.method === "POST"
        ? {
            status: 200,
            body: {
              id: "del_test",
              quote_id: "dqt_test_quote",
              status: "pending",
              fee: 1150,
              tip: 300,
              currency: "cad",
              tracking_url: "https://www.ubereats.com/orders/abc",
              pickup_eta: "2026-10-31T22:08:00Z",
              dropoff_eta: "2026-10-31T22:30:00Z",
              live_mode: false,
              courier: null,
            },
          }
        : null,
    );
    const result = await uberProvider.book({
      request: request(),
      quote: {
        provider: "uber",
        quoteId: "dqt_test_quote",
        feeCents: 850,
        currency: "CAD",
        pickupEta: null,
        dropoffEta: null,
        distanceMeters: null,
        expiresAt: null,
        sandbox: false,
      },
      tipCents: 300,
      attemptKey: "dsp_0123456789abcdef",
    });
    const body = json<Record<string, unknown>>(calls.find((c) => c.url.endsWith("/deliveries")));
    expect(body).toMatchObject({
      quote_id: "dqt_test_quote",
      pickup_name: "PPP Pizzeria — NDG",
      dropoff_name: "Marie Tremblay",
      dropoff_phone_number: "+15145550199",
      dropoff_notes: "App./Apt 4 — Sonnez au 4",
      external_id: "PPP-AB12C",
      manifest_reference: "PPP-AB12C-abcdef",
      idempotency_key: "dsp_0123456789abcdef",
      tip: 300,
    });
    expect(body["manifest_items"]).toEqual([
      {
        name: "Pizza pepperoni (large)",
        quantity: 2,
        size: "medium",
        must_be_upright: true,
        price: 1599,
      },
      { name: "Pepsi", quantity: 1, size: "small", price: 250 },
    ]);
    // Uber's fee includes the tip; the stored fee does not, so it compares with DoorDash.
    expect(result).toMatchObject({
      ok: true,
      update: { externalId: "del_test", status: "requested", feeCents: 850, sandbox: true },
    });
  });

  it("refuses to cancel a non-cancellable delivery", async () => {
    stubEnv(UBER_ENV);
    mockFetch(uberTokenResponder(), (c) =>
      c.url.endsWith("/deliveries/del_test/cancel")
        ? {
            status: 400,
            body: { code: "noncancelable_delivery", message: "Delivery cannot be cancelled." },
          }
        : null,
    );
    expect(await uberProvider.cancel("del_test")).toMatchObject({
      ok: false,
      notCancellable: true,
    });
  });

  it("maps every documented status and reads the courier", () => {
    expect(
      [
        "pending",
        "pickup",
        "pickup_complete",
        "dropoff",
        "delivered",
        "canceled",
        "returned",
        "x",
      ].map(uberStatus),
    ).toEqual([
      "requested",
      "assigned",
      "picked_up",
      "picked_up",
      "delivered",
      "cancelled",
      "returned",
      null,
    ]);
    expect(
      parseUberDelivery({
        id: "del_1",
        status: "pickup",
        courier: {
          name: "Alex I.",
          phone_number: "+16283337630",
          vehicle_type: "car",
          location: { lat: 45.47, lng: -73.62 },
        },
      }),
    ).toMatchObject({
      driver: { name: "Alex I.", vehicle: "car", location: { lat: 45.47, lng: -73.62 } },
    });
  });
});

describe("own driver and Skip", () => {
  it("parses the saved driver list and skips invalid entries", () => {
    expect(parseSavedDrivers("Ali:514-555-0100; Marc:+1 438 555 0101;bad;Nope:123")).toEqual([
      { name: "Ali", phone: "+15145550100" },
      { name: "Marc", phone: "+14385550101" },
    ]);
  });

  it("texts the driver through Twilio only when configured", async () => {
    const calls = mockFetch((c) =>
      c.url.includes("api.twilio.com") ? { status: 201, body: { sid: "SM1" } } : null,
    );
    expect(await textDriver("+15145550100", "hello")).toMatchObject({ sent: false });
    expect(calls).toHaveLength(0);
    stubEnv({
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "tok",
      TWILIO_FROM_NUMBER: "+15145550000",
    });
    expect(await textDriver("+15145550100", "hello")).toEqual({ sent: true });
    expect(calls[0]!.url).toBe("https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json");
    expect(calls[0]!.headers["authorization"]).toBe(
      `Basic ${Buffer.from("AC123:tok").toString("base64")}`,
    );
    expect(Object.fromEntries(new URLSearchParams(calls[0]!.body ?? ""))).toEqual({
      To: "+15145550100",
      From: "+15145550000",
      Body: "hello",
    });
  });

  it("shows Skip as manual, never with a price", () => {
    expect(skipOption()).toMatchObject({
      availability: "manual",
      feeCents: null,
      manualUrl: "https://restaurants.skipthedishes.com/user/login",
    });
    expect(skipOption("javascript:alert(1)").manualUrl).toBe(
      "https://restaurants.skipthedishes.com/user/login",
    );
  });
});
