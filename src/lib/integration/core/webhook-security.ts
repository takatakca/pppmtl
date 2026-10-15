/**
 * Webhook security primitives — pure logic, no env reads, fully testable.
 *
 * Three layers, all required before a payload is trusted:
 *   1. HMAC signature over the raw body (+ timestamp when the provider sends one)
 *   2. timestamp freshness, so an old capture cannot be replayed
 *   3. replay protection on the delivery id / signature
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

export type WebhookRejectReason =
  | "missing_signature"
  | "missing_secret"
  | "invalid_signature"
  | "missing_timestamp"
  | "stale_timestamp"
  | "replayed";

export type WebhookVerification = { ok: true } | { ok: false; reason: WebhookRejectReason };

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** HMAC-SHA256 over `timestamp.body` when a timestamp is present, else `body`. */
export function computeWebhookSignature(
  rawBody: string,
  secret: string,
  timestamp?: string | null,
): string {
  const payload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function isFreshTimestamp(
  timestamp: string,
  now = Date.now(),
  toleranceMs = WEBHOOK_TOLERANCE_MS,
): boolean {
  const numeric = Number(timestamp);
  const ms = Number.isFinite(numeric)
    ? numeric > 1e12
      ? numeric
      : numeric * 1000
    : Date.parse(timestamp);
  if (!Number.isFinite(ms)) return false;
  return Math.abs(now - ms) <= toleranceMs;
}

/* ------------------------------------------------------------ replay ring */

const MAX_SEEN = 500;
const seen = new Map<string, number>();

/** Returns false when this delivery was already processed. */
export function claimWebhookDelivery(key: string, now = Date.now()): boolean {
  if (seen.has(key)) return false;
  seen.set(key, now);
  if (seen.size > MAX_SEEN) {
    const oldest = seen.keys().next().value;
    if (oldest) seen.delete(oldest);
  }
  return true;
}

/** Release a failed transient delivery so Clover can retry after a 503.
 * This process-local helper is NOT durable idempotency; issue #6 requires
 * transactional webhook claims before production charges are enabled.
 */
export function releaseWebhookDelivery(key: string): void {
  seen.delete(key);
}

export function resetWebhookReplayForTests(): void {
  seen.clear();
}

export interface VerifyWebhookInput {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string | undefined;
  /** Stable delivery id; falls back to the signature. */
  deliveryId?: string | null;
  /** When true the provider must send a timestamp header. */
  requireTimestamp?: boolean;
  now?: number;
}

export function verifyWebhookRequest(input: VerifyWebhookInput): WebhookVerification {
  const { rawBody, signature, timestamp, secret, requireTimestamp = false } = input;
  const now = input.now ?? Date.now();

  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!signature) return { ok: false, reason: "missing_signature" };

  if (timestamp) {
    if (!isFreshTimestamp(timestamp, now)) return { ok: false, reason: "stale_timestamp" };
  } else if (requireTimestamp) {
    return { ok: false, reason: "missing_timestamp" };
  }

  const provided = signature.trim().replace(/^sha256=/i, "");
  const expected = computeWebhookSignature(rawBody, secret, timestamp);
  const expectedNoTs = computeWebhookSignature(rawBody, secret);
  if (!safeEqual(provided, expected) && !safeEqual(provided, expectedNoTs)) {
    return { ok: false, reason: "invalid_signature" };
  }

  const deliveryKey = input.deliveryId ?? provided;
  if (!claimWebhookDelivery(deliveryKey, now)) return { ok: false, reason: "replayed" };

  return { ok: true };
}
