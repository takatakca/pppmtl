/**
 * Semantic customer events. No analytics destination is wired yet — these are
 * intentionally local so a real pipeline can subscribe later.
 */
export type PPPEvent =
  | "food_search_started"
  | "food_search_submitted"
  | "voice_search_started"
  | "voice_search_completed"
  | "voice_search_failed"
  | "search_category_selected"
  | "search_product_selected"
  | "quick_craving_selected"
  | "location_selected"
  | "order_mode_selected"
  | "order_started"
  | "cart_item_added"
  | "cart_item_removed"
  | "cart_checkout_continued"
  | "external_order_clicked"
  | "social_link_clicked";

export function track(event: PPPEvent, payload: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) {
    console.debug("[ppp:event]", event, payload);
  }
}

/** Marketplace handoff. Never carries personal data. */
export function trackExternalOrder(
  provider: "uber_eats" | "doordash" | "skip",
  locationId: string | null = "loc-ndg-somerled",
  sourcePage = typeof window === "undefined" ? "" : window.location.pathname,
) {
  track("external_order_clicked", { provider, locationId, sourcePage });
}

export function trackSocialLink(
  provider: "instagram" | "facebook" | "tiktok" | "x" | "google",
  sourcePage = typeof window === "undefined" ? "" : window.location.pathname,
) {
  track("social_link_clicked", { provider, sourcePage });
}
