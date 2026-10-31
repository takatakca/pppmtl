/**
 * CHEAPEST / FASTEST / CLOSEST badges for the "Find a driver" cards. Pure.
 *
 * Only bookable on-demand quotes compete (DoorDash, Uber). The restaurant's own driver costs nothing and
 * Skip has no live quote, so badging them would make the comparison useless.
 *   CHEAPEST  lowest fee (same currency).
 *   FASTEST   earliest courier arrival at the restaurant; ties broken by the earliest drop-off.
 *   CLOSEST   shortest courier distance, only when a provider gives one. Neither DoorDash's nor Uber's
 *             quote includes a courier distance, so this badge appears only if a provider adds one.
 * Ties share the badge.
 */
import type { CourierBadge, CourierOption } from "./types";

function time(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function bookable(option: CourierOption, now: number): boolean {
  if (option.availability !== "available") return false;
  if (option.provider !== "doordash" && option.provider !== "uber") return false;
  const expires = time(option.expiresAt);
  return expires === null || expires > now;
}

function award(
  options: CourierOption[],
  badge: CourierBadge,
  score: (o: CourierOption) => number | null,
  tieBreak?: (o: CourierOption) => number | null,
): void {
  const scored = options
    .map((o) => ({ o, s: score(o), t: tieBreak?.(o) ?? null }))
    .filter((x): x is { o: CourierOption; s: number; t: number | null } => x.s !== null);
  // A single comparable quote is not "the cheapest" of anything.
  if (scored.length < 2) return;
  const best = Math.min(...scored.map((x) => x.s));
  let winners = scored.filter((x) => x.s === best);
  if (winners.length > 1 && tieBreak) {
    const ties = winners.filter((x) => x.t !== null);
    if (ties.length) {
      const bestTie = Math.min(...ties.map((x) => x.t as number));
      winners = ties.filter((x) => x.t === bestTie);
    }
  }
  for (const w of winners) w.o.badges.push(badge);
}

/** Returns new option objects with badges set; input order is kept. */
export function rankCourierOptions(options: CourierOption[], now = Date.now()): CourierOption[] {
  const out = options.map((o) => ({ ...o, badges: [] as CourierBadge[] }));
  const candidates = out.filter((o) => bookable(o, now));
  const currencies = new Set(candidates.map((o) => o.currency ?? ""));
  if (currencies.size === 1) award(candidates, "cheapest", (o) => o.feeCents);
  // Compare like with like: courier arrival at the restaurant when two quotes give it, else drop-off.
  const withPickup = candidates.filter((o) => time(o.pickupEta) !== null).length;
  if (withPickup >= 2) {
    award(
      candidates,
      "fastest",
      (o) => time(o.pickupEta),
      (o) => time(o.dropoffEta),
    );
  } else {
    award(candidates, "fastest", (o) => time(o.dropoffEta));
  }
  award(candidates, "closest", (o) => o.distanceMeters);
  return out;
}
