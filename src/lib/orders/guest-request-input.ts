/** Runtime guards for public, signed-guest order server functions.
 *
 * TanStack's generic inputValidator is a TypeScript identity function, not
 * runtime validation. Reject malformed JSON before reading nested fields,
 * iterating signed receipt IDs or calling downstream provider adapters.
 * These checks do NOT authorize an order; signed guest grants still do that.
 */

export interface GuestOrderIdInput {
  orderId: string;
}

export interface GuestCancelInput extends GuestOrderIdInput {
  reason: string;
}

export interface GuestOrderListInput {
  customerId: string | null;
  phone: string | null;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}

/** Matches the format accepted in signed HttpOnly guest receipt grants. */
export function isGuestOrderId(value: unknown): value is string {
  return typeof value === "string" && /^ord_[a-z0-9_-]{5,80}$/i.test(value);
}

export function isGuestOrderReadInput(input: unknown): input is GuestOrderIdInput {
  return isRecord(input) && isGuestOrderId(input["orderId"]);
}

export function isGuestOrderCancelInput(input: unknown): input is GuestCancelInput {
  return (
    isGuestOrderReadInput(input) &&
    typeof input.reason === "string" &&
    input.reason.length <= 240
  );
}

export function isGuestOrderListInput(input: unknown): input is GuestOrderListInput {
  return (
    isRecord(input) &&
    (input["customerId"] === null ||
      (typeof input["customerId"] === "string" && input["customerId"].length <= 128)) &&
    (input["phone"] === null ||
      (typeof input["phone"] === "string" && input["phone"].length <= 40))
  );
}
