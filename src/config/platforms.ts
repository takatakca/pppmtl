/**
 * One registry for how each external platform is named and drawn.
 *
 * Nothing here decides *whether* PPP is on a platform — that stays in
 * `presence-directory.ts`. This file only answers "what is this platform
 * called, and what mark do we draw for it?" so no route has to keep its own
 * icon map.
 */

export type PlatformId =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "x"
  | "google"
  | "yelp"
  | "tripadvisor"
  | "birdeye"
  | "resto-en-ligne"
  | "trustindex"
  | "too-good-to-go"
  | "order-online"
  | "setmore"
  | "linktree"
  | "uber-eats"
  | "doordash"
  | "skip";

/**
 * `asset` = a real local brand file. `glyph` = an in-house/lucide mark we are
 * allowed to draw. `word` = no legitimate asset, so the platform is set in
 * type instead of an imitation logo.
 */
export type PlatformMark =
  | { kind: "asset"; src: string }
  | { kind: "glyph"; glyph: "facebook" | "instagram" | "tiktok" | "x" | "google" }
  | { kind: "word"; short: string };

export interface PlatformMeta {
  id: PlatformId;
  /** Exact platform name as customers know it. */
  name: string;
  mark: PlatformMark;
}

export const platforms: Record<PlatformId, PlatformMeta> = {
  facebook: { id: "facebook", name: "Facebook", mark: { kind: "glyph", glyph: "facebook" } },
  instagram: { id: "instagram", name: "Instagram", mark: { kind: "glyph", glyph: "instagram" } },
  tiktok: { id: "tiktok", name: "TikTok", mark: { kind: "glyph", glyph: "tiktok" } },
  x: { id: "x", name: "X", mark: { kind: "glyph", glyph: "x" } },
  google: { id: "google", name: "Google", mark: { kind: "glyph", glyph: "google" } },
  yelp: { id: "yelp", name: "Yelp", mark: { kind: "word", short: "Yelp" } },
  tripadvisor: {
    id: "tripadvisor",
    name: "TripAdvisor",
    mark: { kind: "word", short: "Trip" },
  },
  birdeye: { id: "birdeye", name: "Birdeye", mark: { kind: "word", short: "Bird" } },
  "resto-en-ligne": {
    id: "resto-en-ligne",
    name: "RestoEnLigne",
    mark: { kind: "word", short: "Resto" },
  },
  trustindex: { id: "trustindex", name: "Trustindex", mark: { kind: "word", short: "Trust" } },
  "too-good-to-go": {
    id: "too-good-to-go",
    name: "Too Good To Go",
    mark: { kind: "word", short: "TGTG" },
  },
  "order-online": {
    id: "order-online",
    name: "order.online",
    mark: { kind: "word", short: "Order" },
  },
  setmore: { id: "setmore", name: "Setmore", mark: { kind: "word", short: "Set" } },
  linktree: { id: "linktree", name: "Linktree", mark: { kind: "word", short: "Link" } },
  "uber-eats": {
    id: "uber-eats",
    name: "Uber Eats",
    mark: { kind: "asset", src: "/brands/uber-eats.svg" },
  },
  doordash: {
    id: "doordash",
    name: "DoorDash",
    mark: { kind: "asset", src: "/brands/doordash.svg" },
  },
  skip: { id: "skip", name: "SkipTheDishes", mark: { kind: "asset", src: "/brands/skip.svg" } },
};

export function platformMeta(id: string): PlatformMeta | null {
  return platforms[id as PlatformId] ?? null;
}