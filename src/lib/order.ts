import { track } from "@/lib/analytics";
import type { OrderMode } from "@/data/menu";

export interface StartOrderInput {
  locationId: string | null;
  mode: OrderMode;
  itemId?: string;
  categoryId?: string;
  offerId?: string;
  channel?: string;
}

export type StartOrderResult =
  { status: "needs-location" } | { status: "ready"; input: StartOrderInput };

/**
 * Single entry point for every order CTA in the UI. Production can replace the
 * body with the real ordering handoff without touching components.
 */
export function startOrder(input: StartOrderInput): StartOrderResult {
  if (!input.locationId) return { status: "needs-location" };
  track("order_started", { ...input });
  return { status: "ready", input };
}
