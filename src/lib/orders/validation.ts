/**
 * Order validation. Pure — no credentials, no network, fully testable.
 *
 * Validation runs on the server before anything is created, so the browser can
 * never talk a bad order into existence.
 */

import { orderError, type OrderError, type OrderErrorCode } from "./errors";
import { isSupportedOrderType, type OrderDraft } from "./types";

export interface ValidationContext {
  /** True when the store exists in the canonical registry. */
  locationKnown: boolean;
  /** True when a real provider store id exists for this location. */
  locationMapped: boolean;
  /** Optional availability map from the menu layer: productId -> available. */
  availability?: Record<string, boolean>;
  /** Optional open/closed signal. Undefined means "unknown, do not block". */
  locationOpen?: boolean;
}

export interface ValidationReport {
  valid: boolean;
  errors: OrderError[];
}

function push(codes: OrderErrorCode[], code: OrderErrorCode) {
  if (!codes.includes(code)) codes.push(code);
}

export function validateOrderDraft(
  draft: OrderDraft,
  context: ValidationContext,
): ValidationReport {
  const codes: OrderErrorCode[] = [];

  if (!draft.locationId || !context.locationKnown) push(codes, "no_location");
  else if (!context.locationMapped) push(codes, "location_not_mapped");

  if (context.locationOpen === false) push(codes, "location_closed");

  if (draft.items.length === 0) push(codes, "empty_cart");
  if (draft.items.some((i) => !Number.isSafeInteger(i.quantity) || i.quantity < 1 || i.quantity > 50)) {
    push(codes, "menu_changed");
  }

  if (!isSupportedOrderType(draft.orderType)) push(codes, "unsupported_order_type");
  if (draft.orderType === "DELIVERY" && !draft.deliveryAddress?.trim()) {
    push(codes, "missing_address");
  }

  if (!draft.customer.name?.trim()) push(codes, "missing_name");
  if (!draft.customer.phone?.trim()) push(codes, "missing_phone");

  if (context.availability) {
    const unavailable = draft.items.some((i) => context.availability?.[i.productId] === false);
    if (unavailable) push(codes, "item_unavailable");
  }

  return { valid: codes.length === 0, errors: codes.map(orderError) };
}
