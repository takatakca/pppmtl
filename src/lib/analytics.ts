/**
 * Semantic customer events. No analytics destination is wired yet — these are
 * intentionally local so a real pipeline can subscribe later.
 */
export type PPPEvent =
  | "language_changed"
  | "acquisition_popup_shown"
  | "acquisition_language_selected"
  | "acquisition_email_started"
  | "acquisition_signin_clicked"
  | "acquisition_guest_clicked"
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
  | "checkout_started"
  | "checkout_finish_attempted"
  | "checkout_payment_redirect"
  | "external_order_clicked"
  | "social_link_clicked"
  | "external_presence_clicked"
  | "track_provider_selected"
  | "support_route_selected"
  | "callback_requested"
  | "favourite_added"
  | "favourite_removed"
  | "saved_address_added"
  | "saved_address_removed"
  | "reorder_added";

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
  provider: string,
  sourcePage = typeof window === "undefined" ? "" : window.location.pathname,
) {
  track("social_link_clicked", { provider, sourcePage });
}

/**
 * Any outbound click to an external PPP profile, listing or storefront.
 * Carries the real provider — never a hardcoded one — plus the category and
 * the location the record belongs to. No personal data, ever.
 */
export function trackExternalPresenceClick(
  payload: {
    provider: string;
    category: string;
    locationId: string | null;
  },
  sourcePage = typeof window === "undefined" ? "" : window.location.pathname,
) {
  track("external_presence_clicked", { ...payload, sourcePage });
}

/** Order tracking provider chosen on /track. */
export function trackProviderSelected(
  provider: "ppp_direct" | "phone" | "uber_eats" | "doordash" | "skip",
  sourcePage = typeof window === "undefined" ? "" : window.location.pathname,
) {
  track("track_provider_selected", { provider, sourcePage });
}

/** Support routing choice (which contact path a visitor picked). */
export function trackSupportRouted(
  route: "location" | "general" | "phone_order" | "track_order" | "callback",
  sourcePage = typeof window === "undefined" ? "" : window.location.pathname,
) {
  track("support_route_selected", { route, sourcePage });
}

/** Callback request submitted from the CallbackSheet, before/without a live provider. */
export function trackCallbackRequested(
  payload: { locationId: string | null; reason: string },
  sourcePage = typeof window === "undefined" ? "" : window.location.pathname,
) {
  track("callback_requested", { ...payload, sourcePage });
}
