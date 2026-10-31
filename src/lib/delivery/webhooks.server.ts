/**
 * DoorDash Drive and Uber Direct status webhooks. SERVER ONLY.
 *
 *   https://pppmtl.com/api/public/webhooks/doordash   DoorDash sends the Authorization header value configured
 *       in its Developer Portal (https://developer.doordash.com/en-US/docs/drive/how_to/webhooks); we compare it
 *       with DOORDASH_WEBHOOK_SECRET in constant time. Event fields:
 *       https://developer.doordash.com/en-US/docs/drive/reference/webhooks/ (retried up to 3 times on non-200).
 *   https://pppmtl.com/api/public/webhooks/uber       x-uber-signature (or x-postmates-signature) = HMAC-SHA256
 *       hex of the raw body with UBER_DIRECT_WEBHOOK_SECRET
 *       (https://developer.uber.com/docs/deliveries/guides/webhooks; retried on 5xx / timeout).
 *
 * The body is read with the bounded reader before any check. Answers: 503 when the secret is not configured or
 * the database is down (the provider retries), 401 on a bad signature, 400 on an unreadable body, otherwise 200
 * (also for a delivery this site does not know, so the provider stops retrying).
 */
import { timingSafeEqual } from "node:crypto";
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import {
  readBoundedWebhookBody,
  WebhookBodyTooLargeError,
} from "@/lib/integration/core/webhook-body.server";
import { computeWebhookSignature } from "@/lib/integration/core/webhook-security";
import { doorDashEventStatus, parseDoorDashDelivery } from "./couriers/doordash.server";
import { obj, str, type JsonObject } from "./couriers/http.server";
import type { CourierDeliveryUpdate } from "./couriers/types";
import { parseUberDelivery } from "./couriers/uber.server";

/** Secrets shorter than this are treated as not configured. */
const MIN_SECRET_LENGTH = 16;

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function stripScheme(value: string): string {
  return value.trim().replace(/^(basic|bearer)\s+/i, "");
}

/** DoorDash: the Authorization header must equal the configured value (an auth scheme word is tolerated). */
export function verifyDoorDashAuthorization(
  header: string | null,
  secret: string | undefined,
): boolean {
  const expected = secret?.trim() ?? "";
  if (expected.length < MIN_SECRET_LENGTH || !header) return false;
  return (
    safeEqual(header.trim(), expected) || safeEqual(stripScheme(header), stripScheme(expected))
  );
}

/** Uber: hex HMAC-SHA256 of the exact raw body. */
export function verifyUberSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined,
): boolean {
  const key = secret?.trim() ?? "";
  if (key.length < MIN_SECRET_LENGTH || !signature) return false;
  const provided = signature
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
  return safeEqual(provided, computeWebhookSignature(rawBody, key));
}

function plain(status: number, text: string): Response {
  return new Response(text, { status, headers: { "Cache-Control": "no-store" } });
}

async function readBody(request: Request): Promise<{ raw: string } | Response> {
  let raw: string;
  try {
    raw = await readBoundedWebhookBody(request);
  } catch (error) {
    return error instanceof WebhookBodyTooLargeError
      ? plain(413, "Payload too large")
      : plain(400, "Unreadable body");
  }
  return { raw };
}

function parse(raw: string): JsonObject | null {
  try {
    return obj(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function apply(
  provider: "doordash" | "uber",
  update: CourierDeliveryUpdate,
  orderNumberHint: string | null,
  eventName: string,
): Promise<Response> {
  const logProvider = provider === "doordash" ? "doordash" : "uber_direct";
  try {
    const { applyCourierWebhook } = await import("./dispatch-service.server");
    const result = await applyCourierWebhook(provider, update, orderNumberHint);
    logIntegrationEvent({
      provider: logProvider,
      eventType: `courier.webhook.${eventName}`,
      status: result.applied ? "processed" : "received",
      payloadReference: result.orderId ?? update.externalId,
      detail: result.orderId ? (update.status ?? "location") : "unknown delivery",
    });
    return Response.json({ received: true, applied: result.applied });
  } catch (error) {
    logIntegrationEvent({
      provider: logProvider,
      eventType: "courier.webhook.store_failed",
      status: "error",
      payloadReference: update.externalId,
      detail: error instanceof Error ? error.message : "store failed",
    });
    return plain(503, "Temporarily unavailable");
  }
}

export async function handleDoorDashWebhook(request: Request): Promise<Response> {
  const secret = process.env["DOORDASH_WEBHOOK_SECRET"];
  if ((secret?.trim().length ?? 0) < MIN_SECRET_LENGTH) {
    logIntegrationEvent({
      provider: "doordash",
      eventType: "courier.webhook.rejected",
      status: "rejected",
      payloadReference: "no-secret",
      detail: "DOORDASH_WEBHOOK_SECRET not configured",
    });
    return plain(503, "Webhook not configured");
  }
  const body = await readBody(request);
  if (body instanceof Response) return body;
  if (!verifyDoorDashAuthorization(request.headers.get("authorization"), secret)) {
    logIntegrationEvent({
      provider: "doordash",
      eventType: "courier.webhook.invalid_authorization",
      status: "rejected",
      payloadReference: "authorization",
    });
    return plain(401, "Rejected");
  }
  const json = parse(body.raw);
  const eventName = str(json?.["event_name"]);
  const update = json ? parseDoorDashDelivery(json, doorDashEventStatus(eventName)) : null;
  if (!update) return plain(400, "Invalid payload");
  return apply("doordash", update, null, eventName ?? "unknown");
}

export async function handleUberWebhook(request: Request): Promise<Response> {
  const secret = process.env["UBER_DIRECT_WEBHOOK_SECRET"];
  if ((secret?.trim().length ?? 0) < MIN_SECRET_LENGTH) {
    logIntegrationEvent({
      provider: "uber_direct",
      eventType: "courier.webhook.rejected",
      status: "rejected",
      payloadReference: "no-secret",
      detail: "UBER_DIRECT_WEBHOOK_SECRET not configured",
    });
    return plain(503, "Webhook not configured");
  }
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const signature =
    request.headers.get("x-uber-signature") ?? request.headers.get("x-postmates-signature");
  if (!verifyUberSignature(body.raw, signature, secret)) {
    logIntegrationEvent({
      provider: "uber_direct",
      eventType: "courier.webhook.invalid_signature",
      status: "rejected",
      payloadReference: "signature",
    });
    return plain(401, "Rejected");
  }
  const json = parse(body.raw);
  if (!json) return plain(400, "Invalid payload");
  const kind = str(json["kind"]) ?? "";
  const deliveryId = str(json["delivery_id"]);
  const data = obj(json["data"]) ?? {};
  const merged: JsonObject = { ...data, id: str(data["id"]) ?? deliveryId };

  let update: CourierDeliveryUpdate | null;
  if (kind === "event.delivery_status") {
    // The top-level status is the event's status; data is the delivery right now.
    update = parseUberDelivery({ ...merged, status: str(json["status"]) ?? data["status"] });
  } else if (kind === "event.courier_update") {
    // Every ~20 s while a courier is assigned: location and ETAs only, no status change.
    const parsed = parseUberDelivery(merged);
    const loc = obj(json["location"]);
    const lat = typeof loc?.["lat"] === "number" ? loc["lat"] : null;
    const lng = typeof loc?.["lng"] === "number" ? loc["lng"] : null;
    update = parsed && {
      ...parsed,
      status: null,
      providerStatus: "",
      providerUpdatedAt: null,
      driver: {
        name: parsed.driver?.name ?? null,
        phone: parsed.driver?.phone ?? null,
        vehicle: parsed.driver?.vehicle ?? null,
        location: lat !== null && lng !== null ? { lat, lng } : (parsed.driver?.location ?? null),
      },
    };
  } else {
    return Response.json({ received: true, applied: false });
  }
  if (!update) return plain(400, "Invalid payload");
  return apply("uber", update, str(data["external_id"]), kind.replace(/^event\./, ""));
}
