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
  | "order_started";

export function track(event: PPPEvent, payload: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) {
    console.debug("[ppp:event]", event, payload);
  }
}