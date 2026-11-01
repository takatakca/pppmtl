/**
 * BMO Push Notifications (spec "Push Notifications" 1.1.0): BMO POSTs pain.002 status updates to
 *   https://pppmtl.com/api/public/webhooks/bmo
 * Register that URL with BMO at onboarding and subscribe to the request-money statuses. BMO retries 3 times at once,
 * then hourly for 24 h on 5xx; a 4xx is not retried (BMO support investigates). SERVER ONLY.
 */
import { timingSafeEqual } from "node:crypto";
import { bmoSettings } from "./config.server";
import { decryptFromBmo } from "./crypto";
import { readPaymentStatus } from "./messages";
import { applyBmoStatus } from "./requests.server";

const MAX_BODY = 512 * 1024;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** BMO_PUSH_SECRET in x-api-key, or as the Authorization value (with or without "Bearer "). */
export function pushAuthorized(headers: Headers, secret: string): boolean {
  const candidates = [
    headers.get("x-api-key"),
    headers.get("authorization"),
    headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
  ].filter((v): v is string => Boolean(v));
  return candidates.some((v) => same(v.trim(), secret));
}

export async function handleBmoPush(request: Request): Promise<Response> {
  const s = bmoSettings();
  if (!s.pushSecret) return json(503, { error: "BMO push notifications are not configured." });
  if (!pushAuthorized(request.headers, s.pushSecret)) return json(401, { error: "Unauthorized." });
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { error: "Too large." });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: "Invalid JSON." });
  }
  const opened = decryptFromBmo(
    body,
    request.headers.get("x-crypto-key"),
    s.privateKey,
    s.oaepHash,
  );
  if (!opened.ok) {
    console.error("[bmo] push not readable:", opened.error);
    return json(400, { error: "Payload not readable." });
  }
  const statuses = readPaymentStatus(opened.message);
  if (!statuses.length) return json(400, { error: "No payment status in the message." });
  try {
    const results = [];
    for (const st of statuses) results.push(await applyBmoStatus(st));
    return json(200, { received: statuses.length, results });
  } catch (error) {
    console.error("[bmo] push not applied:", error instanceof Error ? error.message : error);
    return json(500, { error: "Not stored, retry." });
  }
}
