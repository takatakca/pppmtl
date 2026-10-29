/**
 * Idempotency.
 *
 * Every submission to a provider carries a key derived from the order content.
 * Sending the same order twice (double tap, retry, flaky network) must never
 * produce two kitchen tickets or two charges.
 *
 * The derivation is pure and deterministic; the registry is in memory until a
 * real order store exists.
 */

import type { OrderDraft } from "./types";

/** Stable, order-insensitive signature of a draft. */
function draftSignature(draft: OrderDraft): string {
  const lines = draft.items
    .map((item) => {
      const mods = item.modifiers
        .map((m) => `${m.groupId}=${m.choiceId}`)
        .sort()
        .join(",");
      return `${item.productId}|${item.quantity}|${mods}|${item.notes.trim()}`;
    })
    .sort()
    .join(";");

  return [
    draft.locationId,
    draft.orderType,
    draft.customer.phone ?? "",
    draft.customer.customerId ?? draft.customer.takatakCustomerId ?? "guest",
    draft.deliveryAddress ?? "",
    draft.notes.trim(),
    lines,
  ].join("::");
}

/** FNV-1a — deterministic across server restarts, no crypto import needed. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * `windowMs` buckets the key in time so a genuine repeat order an hour later
 * is allowed, while a double submit inside the window is not.
 */
export function deriveIdempotencyKey(
  draft: OrderDraft,
  now: number = Date.now(),
  windowMs = 5 * 60 * 1000,
): string {
  const bucket = Math.floor(now / windowMs);
  const signature = draftSignature(draft);
  return `ppp_${hash(signature)}_${hash(`${signature}#${bucket}`)}`;
}

interface Claim {
  orderId: string;
  claimedAt: number;
}

const claims = new Map<string, Claim>();
const MAX_CLAIMS = 500;

/**
 * First caller wins and gets `{ fresh: true }`. Any repeat gets the order id
 * created the first time, so the customer sees their real order, not an error.
 */
export function claimOrderKey(
  key: string,
  orderId: string,
  now: number = Date.now(),
): { fresh: boolean; orderId: string } {
  const existing = claims.get(key);
  if (existing) return { fresh: false, orderId: existing.orderId };
  claims.set(key, { orderId, claimedAt: now });
  if (claims.size > MAX_CLAIMS) {
    const oldest = claims.keys().next().value;
    if (oldest) claims.delete(oldest);
  }
  return { fresh: true, orderId };
}

/** An order that failed before any payment page was shown frees its key: the retry is a new order. */
export function releaseOrderKey(key: string): void {
  claims.delete(key);
}

export function findClaim(key: string): string | null {
  return claims.get(key)?.orderId ?? null;
}

export function resetIdempotencyForTests(): void {
  claims.clear();
}
