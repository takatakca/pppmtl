/**
 * DoorDash Drive v2 (on-demand courier). SERVER ONLY. Nothing here throws to the caller.
 *
 * Official docs used (read 2026-10-31):
 *   JWT:        https://developer.doordash.com/en-US/docs/drive/reference/JWTs/
 *               header { alg: HS256, typ: JWT, "dd-ver": "DD-JWT-V1" }, claims aud "doordash", iss developer_id,
 *               kid key_id, iat, exp ≤ iat + 1800 s; the signing secret is base64-decoded before HMAC
 *               (https://developer.doordash.com/en-US/docs/drive/tutorials/get_started).
 *   API:        https://developer.doordash.com/en-US/api/drive/ — base https://openapi.doordash.com
 *               POST /drive/v2/quotes · POST /drive/v2/quotes/{external_delivery_id}/accept (body { tip })
 *               GET /drive/v2/deliveries/{external_delivery_id} · PUT /drive/v2/deliveries/{id}/cancel
 *               Money is integer cents (order_value, tip, fee); phone numbers E.164.
 *   Quotes:     https://developer.doordash.com/en-US/docs/drive/how_to/quote_deliveries — accept within 5 minutes.
 *   Statuses:   https://developer.doordash.com/en-US/docs/drive/reference/delivery_statuses
 *   Webhooks:   https://developer.doordash.com/en-US/docs/drive/reference/webhooks/ (event_name values) and
 *               https://developer.doordash.com/en-US/docs/drive/how_to/webhooks (DoorDash sends the
 *               Authorization header value configured in the Developer Portal; sandbox and production each
 *               have one endpoint). Errors: https://developer.doordash.com/en-US/docs/drive/reference/errors
 * Sandbox and production use the same base URL; the access key decides (sandbox keys never dispatch a Dasher).
 */
import { createHmac } from "node:crypto";
import { dispatchLocale, DOORDASH_QUOTE_TTL_MS } from "@/config/delivery-dispatch";
import { addressOneLine, dropoffNote, splitName, truncate } from "./address";
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
  DispatchStatus,
} from "./types";

const BASE_URL = "https://openapi.doordash.com";
/** Five minutes, well under DoorDash's 30-minute maximum. */
const JWT_LIFETIME_S = 300;

interface DoorDashKeys {
  developerId: string;
  keyId: string;
  signingSecret: string;
}

function keys(): DoorDashKeys | null {
  const developerId = process.env["DOORDASH_DEVELOPER_ID"]?.trim() ?? "";
  const keyId = process.env["DOORDASH_KEY_ID"]?.trim() ?? "";
  const signingSecret = process.env["DOORDASH_SIGNING_SECRET"]?.trim() ?? "";
  if (!developerId || !keyId || !signingSecret) return null;
  return { developerId, keyId, signingSecret };
}

function doorDashSandbox(): boolean {
  return (process.env["DOORDASH_ENV"]?.trim().toLowerCase() ?? "") === "sandbox";
}

function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

/** The DoorDash Drive JWT (exported for tests). */
export function doorDashJwt(k: DoorDashKeys, nowMs = Date.now()): string {
  const iat = Math.floor(nowMs / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", "dd-ver": "DD-JWT-V1" }));
  const payload = b64url(
    JSON.stringify({
      aud: "doordash",
      iss: k.developerId,
      kid: k.keyId,
      iat,
      exp: iat + JWT_LIFETIME_S,
    }),
  );
  // Node's base64 decoder also accepts the URL-safe alphabet DoorDash secrets may use.
  const secret = Buffer.from(k.signingSecret, "base64");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function call(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: JsonObject,
): Promise<{ status: number; json: JsonObject | null }> {
  const k = keys();
  if (!k) return { status: -1, json: null };
  return courierFetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${doorDashJwt(k)}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

/** Delivery status (Get Delivery / accept answer) → PPP lifecycle. Unknown values stay "requested". */
export function doorDashStatus(value: string | null): DispatchStatus {
  switch (value) {
    case "quote":
    case "created":
      return "requested";
    case "confirmed":
    case "enroute_to_pickup":
      return "assigned";
    case "arrived_at_pickup":
      return "at_pickup";
    case "picked_up":
    case "enroute_to_dropoff":
      return "picked_up";
    case "arrived_at_dropoff":
      return "at_dropoff";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "enroute_to_return":
    case "arrived_at_return":
      return "returning";
    case "returned":
      return "returned";
    default:
      return "requested";
  }
}

/** Webhook event_name → PPP lifecycle; null for events that do not change the status. */
export function doorDashEventStatus(eventName: string | null): DispatchStatus | null {
  switch (eventName) {
    case "DASHER_CONFIRMED":
    case "dasher_enroute_to_pickup":
      return "assigned";
    case "DASHER_CONFIRMED_PICKUP_ARRIVAL":
      return "at_pickup";
    case "DASHER_PICKED_UP":
    case "dasher_enroute_to_dropoff":
      return "picked_up";
    case "DASHER_CONFIRMED_DROPOFF_ARRIVAL":
      return "at_dropoff";
    case "DASHER_DROPPED_OFF":
      return "delivered";
    case "DELIVERY_CANCELLED":
      return "cancelled";
    case "DELIVERY_RETURN_INITIALIZED":
    case "DASHER_CONFIRMED_RETURN_ARRIVAL":
    case "dasher_enroute_to_return":
      return "returning";
    case "DELIVERY_RETURNED":
      return "returned";
    default:
      return null;
  }
}

function driverFrom(json: JsonObject): CourierDriver | null {
  const name = str(json["dasher_name"]);
  const phone = str(json["dasher_pickup_phone_number"]) ?? str(json["dasher_dropoff_phone_number"]);
  const vehicle =
    [str(json["dasher_vehicle_make"]), str(json["dasher_vehicle_model"])]
      .filter(Boolean)
      .join(" ") || null;
  const loc = obj(json["dasher_location"]);
  const lat = num(loc?.["lat"]);
  const lng = num(loc?.["lng"]);
  const location = lat !== null && lng !== null ? { lat, lng } : null;
  if (!name && !phone && !vehicle && !location) return null;
  return { name, phone, vehicle, location };
}

/**
 * A DoorDash delivery object (accept / get / cancel answer, or webhook body) → update.
 * `statusOverride` null = this event does not change the status (webhooks carry event_name, not delivery_status).
 */
export function parseDoorDashDelivery(
  json: JsonObject,
  statusOverride?: DispatchStatus | null,
): CourierDeliveryUpdate | null {
  const externalId = str(json["external_delivery_id"]);
  if (!externalId) return null;
  const providerStatus = str(json["event_name"]) ?? str(json["delivery_status"]) ?? "unknown";
  return {
    externalId,
    status:
      statusOverride === undefined ? doorDashStatus(str(json["delivery_status"])) : statusOverride,
    providerStatus,
    trackingUrl: str(json["tracking_url"]),
    feeCents: int(json["fee"]),
    currency: str(json["currency"])?.toUpperCase() ?? null,
    pickupEta: isoOrNull(json["pickup_time_estimated"]),
    dropoffEta: isoOrNull(json["dropoff_time_estimated"]),
    driver: driverFrom(json),
    providerUpdatedAt: isoOrNull(json["updated_at"]) ?? isoOrNull(json["created_at"]),
    sandbox: null,
    cancelReason: str(json["cancellation_reason"]) ?? str(json["reason"]),
  };
}

/** DoorDash's external_delivery_id: our order number plus a random suffix, one per quote round. */
export function doorDashExternalId(orderNumber: string, random: string): string {
  const base = orderNumber.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40) || "PPP";
  return `${base}-${random.replace(/[^A-Za-z0-9]/g, "").slice(0, 10)}`;
}

/** The Create Quote body (exported for tests). Only documented fields. */
export function doorDashQuoteBody(request: CourierRequest, externalDeliveryId: string): JsonObject {
  const { given, family } = splitName(request.dropoff.contactName);
  const note = dropoffNote(request.dropoff.address);
  return {
    external_delivery_id: externalDeliveryId,
    locale: dispatchLocale,
    pickup_address: addressOneLine(request.pickup.address),
    pickup_business_name: request.pickup.businessName,
    pickup_phone_number: request.pickup.phoneE164,
    pickup_instructions: truncate(`${request.orderNumber} — ${request.pickup.instructions}`, 280),
    pickup_reference_tag: request.orderNumber,
    dropoff_address: addressOneLine(request.dropoff.address),
    dropoff_phone_number: request.dropoff.phoneE164,
    ...(note ? { dropoff_instructions: truncate(note, 280) } : {}),
    ...(given ? { dropoff_contact_given_name: given } : {}),
    ...(family ? { dropoff_contact_family_name: family } : {}),
    order_value: Math.max(0, Math.round(request.orderValueCents)),
  };
}

function unavailableReason(status: number, json: JsonObject | null): string {
  if (status === 401 || status === 403) {
    return `DoorDash refused the access key (${refusalDetail(status, json)}). Check the keys, or ask DoorDash for production access.`;
  }
  if (status === 422) return `DoorDash cannot deliver this order (${refusalDetail(status, json)})`;
  if (status === 429) return "DoorDash is rate limiting requests — try again in a minute.";
  return `DoorDash did not quote (${refusalDetail(status, json)})`;
}

export const doorDashProvider: CourierProvider = {
  id: "doordash",
  label: "DoorDash",
  configured: () => keys() !== null,
  sandbox: doorDashSandbox,

  async quote(request, now) {
    if (!keys()) {
      return {
        ok: false,
        availability: "not_connected",
        reason: "DoorDash Drive is not connected.",
      };
    }
    const externalId = doorDashExternalId(
      request.orderNumber,
      Math.random().toString(36).slice(2, 8),
    );
    const res = await call("POST", "/drive/v2/quotes", doorDashQuoteBody(request, externalId));
    const fee = int(res.json?.["fee"]);
    if (res.status !== 200 || !res.json || fee === null) {
      return {
        ok: false,
        availability: "unavailable",
        reason: unavailableReason(res.status, res.json),
      };
    }
    return {
      ok: true,
      quote: {
        provider: "doordash",
        quoteId: str(res.json["external_delivery_id"]) ?? externalId,
        feeCents: fee,
        currency: str(res.json["currency"])?.toUpperCase() ?? "CAD",
        pickupEta: isoOrNull(res.json["pickup_time_estimated"]),
        dropoffEta: isoOrNull(res.json["dropoff_time_estimated"]),
        distanceMeters: null,
        expiresAt: new Date(now.getTime() + DOORDASH_QUOTE_TTL_MS).toISOString(),
        sandbox: doorDashSandbox(),
      },
    };
  },

  async book({ quote, tipCents }) {
    const res = await call(
      "POST",
      `/drive/v2/quotes/${encodeURIComponent(quote.quoteId)}/accept`,
      tipCents > 0 ? { tip: tipCents } : {},
    );
    const update = res.status === 200 && res.json ? parseDoorDashDelivery(res.json) : null;
    if (update) return { ok: true, update: { ...update, sandbox: doorDashSandbox() } };
    const detail = refusalDetail(res.status, res.json);
    const expired =
      /expir/i.test(detail) ||
      (quote.expiresAt !== null && Date.parse(quote.expiresAt) <= Date.now());
    const uncertain = res.status === 0 || res.status >= 500;
    return {
      ok: false,
      expired: expired && !uncertain,
      uncertain,
      reason: uncertain
        ? `DoorDash did not confirm (${detail}). The delivery may exist: press Refresh before booking again.`
        : `DoorDash refused the booking (${detail})`,
    };
  },

  async cancel(externalId) {
    const res = await call("PUT", `/drive/v2/deliveries/${encodeURIComponent(externalId)}/cancel`);
    if (res.status === 200) {
      const parsed = res.json ? parseDoorDashDelivery(res.json, "cancelled") : null;
      return { ok: true, update: parsed };
    }
    return {
      ok: false,
      notFound: res.status === 404,
      notCancellable: res.status === 409,
      reason:
        res.status === 409
          ? "DoorDash says this delivery can no longer be cancelled (the Dasher may already have the food). Call DoorDash support."
          : `DoorDash did not cancel (${refusalDetail(res.status, res.json)})`,
    };
  },

  async status(externalId) {
    const res = await call("GET", `/drive/v2/deliveries/${encodeURIComponent(externalId)}`);
    const update = res.status === 200 && res.json ? parseDoorDashDelivery(res.json) : null;
    if (update) return { ok: true, update };
    return {
      ok: false,
      notFound: res.status === 404,
      reason: `DoorDash status unavailable (${refusalDetail(res.status, res.json)})`,
    };
  },
};
