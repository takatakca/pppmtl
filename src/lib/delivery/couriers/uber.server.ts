/**
 * Uber Direct (on-demand courier). SERVER ONLY. Nothing here throws to the caller.
 *
 * Official sources used (read 2026-10-31):
 *   Auth:      https://developer.uber.com/docs/deliveries/guides/authentication — POST https://auth.uber.com/oauth/v2/token
 *              (form: client_id, client_secret, grant_type=client_credentials, scope=eats.deliveries). Tokens last
 *              30 days and token requests are limited to 100 per hour, so the token is cached.
 *   API:       Uber's Direct API OpenAPI spec, published by Uber with its SDK
 *              (https://github.com/uber/uber-direct-sdk, src/deliveries/openapi.yaml; reference rendered at
 *              https://developer.uber.com/docs/deliveries/api-reference/daas), base https://api.uber.com/v1:
 *              POST /customers/{customer_id}/delivery_quotes · POST /customers/{customer_id}/deliveries
 *              GET /customers/{customer_id}/deliveries/{delivery_id} · POST …/deliveries/{delivery_id}/cancel
 *              Addresses are JSON strings {street_address[], city, state, zip_code, country}; money is integer
 *              cents; phones match ^\+[0-9]+$; quote errors 503 couriers_busy, 400 address_undeliverable…;
 *              the Create Delivery fee INCLUDES the tip.
 *   Guide:     https://developer.uber.com/docs/deliveries/get-started (quote → delivery with quote_id)
 *   Webhooks:  https://developer.uber.com/docs/deliveries/guides/webhooks — header x-uber-signature
 *              (x-postmates-signature also accepted): HMAC-SHA256 hex of the raw body with the webhook signing key.
 *              https://developer.uber.com/docs/deliveries/daas/references/api/webhooks/delivery-status-webhook
 *              https://developer.uber.com/docs/deliveries/daas/references/api/webhooks/courier-update-webhook
 */
import { dropoffNote, truncate } from "./address";
import {
  courierFetch,
  int,
  isoOrNull,
  num,
  obj,
  refusalDetail,
  str,
  type JsonObject,
} from "./http.server";
import type {
  CourierDeliveryUpdate,
  CourierDriver,
  CourierProvider,
  CourierRequest,
  DispatchAddress,
  DispatchStatus,
} from "./types";

const AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const API_URL = "https://api.uber.com/v1";

interface UberKeys {
  clientId: string;
  clientSecret: string;
  customerId: string;
}

function keys(): UberKeys | null {
  const clientId = process.env["UBER_DIRECT_CLIENT_ID"]?.trim() ?? "";
  const clientSecret = process.env["UBER_DIRECT_CLIENT_SECRET"]?.trim() ?? "";
  const customerId = process.env["UBER_DIRECT_CUSTOMER_ID"]?.trim() ?? "";
  if (!clientId || !clientSecret || !customerId) return null;
  return { clientId, clientSecret, customerId };
}

function uberSandbox(): boolean {
  return (process.env["UBER_DIRECT_ENV"]?.trim().toLowerCase() ?? "") === "test";
}

let tokenCache: { clientId: string; token: string; until: number } | null = null;
let tokenFailureUntil = 0;

export function resetUberTokenForTests(): void {
  tokenCache = null;
  tokenFailureUntil = 0;
}

async function accessToken(k: UberKeys, now = Date.now()): Promise<string | null> {
  if (tokenCache && tokenCache.clientId === k.clientId && tokenCache.until > now) {
    return tokenCache.token;
  }
  // Uber limits token requests to 100/hour: after a refusal, wait a minute before asking again.
  if (tokenFailureUntil > now) return null;
  const res = await courierFetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: k.clientId,
      client_secret: k.clientSecret,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }).toString(),
  });
  const token = str(res.json?.["access_token"]);
  if (res.status !== 200 || !token) {
    tokenFailureUntil = now + 60_000;
    return null;
  }
  const expiresIn = int(res.json?.["expires_in"]) ?? 3600;
  // Renew a day early (tokens last 30 days), and at most cache for the lifetime Uber gave.
  const lifetimeMs = Math.max(60, expiresIn - Math.min(86_400, expiresIn / 10)) * 1000;
  tokenCache = { clientId: k.clientId, token, until: now + lifetimeMs };
  return token;
}

async function call(
  method: "GET" | "POST",
  path: string,
  body?: JsonObject,
): Promise<{ status: number; json: JsonObject | null }> {
  const k = keys();
  if (!k) return { status: -1, json: null };
  const token = await accessToken(k);
  if (!token)
    return {
      status: 401,
      json: { code: "token_refused", message: "Uber refused the client credentials" },
    };
  const res = await courierFetch(
    `${API_URL}/customers/${encodeURIComponent(k.customerId)}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  // A token Uber stopped accepting: drop it so the next call asks for a fresh one.
  if (res.status === 401) tokenCache = null;
  return res;
}

/** Uber's structured address, sent as a JSON string. The unit is the second street line. */
export function uberAddress(address: DispatchAddress): string {
  return JSON.stringify({
    street_address: address.unit ? [address.street, `App. ${address.unit}`] : [address.street],
    city: address.city,
    state: address.province,
    zip_code: address.postalCode,
    country: address.country,
  });
}

export function uberStatus(value: string | null): DispatchStatus | null {
  switch (value) {
    case "pending":
      return "requested";
    case "pickup":
      return "assigned";
    case "pickup_complete":
    case "dropoff":
      return "picked_up";
    case "delivered":
      return "delivered";
    case "canceled":
      return "cancelled";
    case "returned":
      return "returned";
    default:
      return null;
  }
}

function driverFrom(courier: JsonObject | null): CourierDriver | null {
  if (!courier) return null;
  const loc = obj(courier["location"]);
  const lat = num(loc?.["lat"]);
  const lng = num(loc?.["lng"]);
  const driver: CourierDriver = {
    name: str(courier["name"]),
    phone: str(courier["phone_number"]),
    vehicle: str(courier["vehicle_type"]),
    location: lat !== null && lng !== null ? { lat, lng } : null,
  };
  return driver.name || driver.phone || driver.vehicle || driver.location ? driver : null;
}

/**
 * An Uber delivery object (create / get / cancel answer, or a webhook's `data`) → update.
 * The fee stored is the delivery fee WITHOUT the tip (Uber's fee includes it), so it compares with DoorDash.
 */
export function parseUberDelivery(json: JsonObject): CourierDeliveryUpdate | null {
  const externalId = str(json["id"]);
  if (!externalId) return null;
  const providerStatus = str(json["status"]) ?? "unknown";
  const fee = int(json["fee"]);
  const tip = int(json["tip"]);
  const liveMode = json["live_mode"];
  return {
    externalId,
    status: uberStatus(providerStatus),
    providerStatus,
    trackingUrl: str(json["tracking_url"]),
    feeCents: fee === null ? null : tip !== null && tip > 0 && tip <= fee ? fee - tip : fee,
    currency: str(json["currency"])?.toUpperCase() ?? null,
    pickupEta: isoOrNull(json["pickup_eta"]),
    dropoffEta: isoOrNull(json["dropoff_eta"]),
    driver: driverFrom(obj(json["courier"])),
    providerUpdatedAt: isoOrNull(json["updated"]) ?? isoOrNull(json["created"]),
    sandbox: typeof liveMode === "boolean" ? !liveMode : null,
    cancelReason: str(json["undeliverable_reason"]),
  };
}

function quoteBody(request: CourierRequest): JsonObject {
  const { pickup, dropoff } = request;
  return {
    pickup_address: uberAddress(pickup.address),
    dropoff_address: uberAddress(dropoff.address),
    ...(pickup.latitude !== null && pickup.longitude !== null
      ? { pickup_latitude: pickup.latitude, pickup_longitude: pickup.longitude }
      : {}),
    pickup_phone_number: pickup.phoneE164,
    dropoff_phone_number: dropoff.phoneE164,
    manifest_total_value: Math.max(0, Math.round(request.orderValueCents)),
  };
}

/** The Create Delivery body (exported for tests). Only documented fields. */
export function uberDeliveryBody(
  request: CourierRequest,
  quoteId: string,
  tipCents: number,
  attemptKey: string,
): JsonObject {
  const note = dropoffNote(request.dropoff.address);
  return {
    ...quoteBody(request),
    quote_id: quoteId,
    pickup_name: request.pickup.businessName,
    pickup_business_name: request.pickup.businessName,
    pickup_notes: truncate(`${request.orderNumber} — ${request.pickup.instructions}`, 280),
    dropoff_name: request.dropoff.contactName,
    ...(note ? { dropoff_notes: truncate(note, 280) } : {}),
    manifest_items: request.items.slice(0, 50).map((item) => {
      const pizza = /pizza/i.test(item.name);
      return {
        name: truncate(item.name, 120),
        quantity: Math.max(1, Math.round(item.quantity)),
        size: pizza ? "medium" : "small",
        ...(pizza ? { must_be_upright: true } : {}),
        ...(item.unitPriceCents !== null ? { price: item.unitPriceCents } : {}),
      };
    }),
    // manifest_reference + external_id must be unique per delivery: the attempt suffix allows re-booking.
    manifest_reference: `${request.orderNumber}-${attemptKey.slice(-6)}`,
    external_id: request.orderNumber,
    idempotency_key: attemptKey,
    ...(tipCents > 0 ? { tip: tipCents } : {}),
  };
}

function quoteRefusal(
  status: number,
  json: JsonObject | null,
): {
  availability: "busy" | "unavailable";
  reason: string;
} {
  const code = str(json?.["code"]) ?? "";
  if (status === 503 || code === "couriers_busy") {
    return { availability: "busy", reason: "Uber has no courier free right now." };
  }
  if (status === 401) {
    return {
      availability: "unavailable",
      reason: `Uber refused the credentials (${refusalDetail(status, json)}). Check the client id, secret and customer id.`,
    };
  }
  if (status === 402 || status === 403) {
    return {
      availability: "unavailable",
      reason: `Uber account blocked or suspended (${refusalDetail(status, json)})`,
    };
  }
  if (code.startsWith("address_undeliverable")) {
    return { availability: "unavailable", reason: "Uber cannot deliver to this address." };
  }
  return {
    availability: "unavailable",
    reason: `Uber did not quote (${refusalDetail(status, json)})`,
  };
}

export const uberProvider: CourierProvider = {
  id: "uber",
  label: "Uber",
  configured: () => keys() !== null,
  sandbox: uberSandbox,

  async quote(request, now) {
    if (!keys()) {
      return { ok: false, availability: "not_connected", reason: "Uber Direct is not connected." };
    }
    const res = await call("POST", "/delivery_quotes", quoteBody(request));
    const id = str(res.json?.["id"]);
    const fee = int(res.json?.["fee"]);
    if (res.status !== 200 || !res.json || !id || fee === null) {
      return { ok: false, ...quoteRefusal(res.status, res.json) };
    }
    const minutes = (key: string) => {
      const m = int(res.json?.[key]);
      return m === null ? null : new Date(now.getTime() + m * 60_000).toISOString();
    };
    return {
      ok: true,
      quote: {
        provider: "uber",
        quoteId: id,
        feeCents: fee,
        currency: (
          str(res.json["currency_type"]) ??
          str(res.json["currency"]) ??
          "CAD"
        ).toUpperCase(),
        pickupEta: minutes("pickup_duration"),
        dropoffEta: isoOrNull(res.json["dropoff_eta"]) ?? minutes("duration"),
        distanceMeters: null,
        expiresAt: isoOrNull(res.json["expires"]),
        sandbox: uberSandbox(),
      },
    };
  },

  async book({ request, quote, tipCents, attemptKey }) {
    const res = await call(
      "POST",
      "/deliveries",
      uberDeliveryBody(request, quote.quoteId, tipCents, attemptKey),
    );
    const update = res.status === 200 && res.json ? parseUberDelivery(res.json) : null;
    if (update)
      return { ok: true, update: { ...update, sandbox: update.sandbox ?? uberSandbox() } };
    const detail = refusalDetail(res.status, res.json);
    const uncertain = res.status === 0 || res.status >= 500;
    return {
      ok: false,
      expired: !uncertain && /expire|quote/i.test(str(res.json?.["code"]) ?? ""),
      uncertain,
      reason: uncertain
        ? `Uber did not confirm (${detail}). The delivery may exist: check Uber's dashboard, then release it here.`
        : `Uber refused the booking (${detail})`,
    };
  },

  async cancel(externalId) {
    const res = await call("POST", `/deliveries/${encodeURIComponent(externalId)}/cancel`);
    if (res.status === 200) {
      const parsed = res.json ? parseUberDelivery(res.json) : null;
      return { ok: true, update: parsed ? { ...parsed, status: "cancelled" } : null };
    }
    const code = str(res.json?.["code"]) ?? "";
    return {
      ok: false,
      notFound: res.status === 404 && code !== "customer_not_found",
      notCancellable: code === "noncancelable_delivery",
      reason:
        code === "noncancelable_delivery"
          ? "Uber says this delivery can no longer be cancelled. Use Uber's dashboard or support."
          : `Uber did not cancel (${refusalDetail(res.status, res.json)})`,
    };
  },

  async status(externalId) {
    const res = await call("GET", `/deliveries/${encodeURIComponent(externalId)}`);
    const update = res.status === 200 && res.json ? parseUberDelivery(res.json) : null;
    if (update) return { ok: true, update };
    return {
      ok: false,
      notFound: res.status === 404,
      reason: `Uber status unavailable (${refusalDetail(res.status, res.json)})`,
    };
  },
};
