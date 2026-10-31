/**
 * Administrator entry points for courier dispatch. SERVER ONLY.
 *
 * Every function calls requireAdmin() FIRST (it throws a 401 error without a valid signed admin session), then
 * checks the untrusted JSON shape: the generic createServerFn input type is not a runtime parser.
 */
import { MAX_COURIER_TIP_CENTS } from "@/config/delivery-dispatch";
import { requireAdmin } from "@/lib/security/admin.server";
import {
  assignOwnDriver,
  bookCourier,
  cancelCourier,
  dispatchBoard,
  findDrivers,
  markDispatchProgress,
  recordSkipBooking,
  refreshCourier,
  type DispatchBoard,
  type DispatchResult,
  type DispatchView,
  type FindDriversResult,
} from "./dispatch-service.server";

const ORDER_ID = /^ord_[A-Za-z0-9_-]{5,80}$/;

function field(input: unknown, key: string): unknown {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)[key]
    : undefined;
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

function orderId(input: unknown): string | null {
  const id = field(input, "orderId");
  return typeof id === "string" && ORDER_ID.test(id) ? id : null;
}

/** Who pressed the button (optional staff name typed on the tablet); "staff" otherwise. */
function staffName(input: unknown): string {
  const name = text(field(input, "staffName"), 60)?.replace(/\s+/g, " ").trim().slice(0, 40);
  return name || "staff";
}

const INVALID = { ok: false as const, error: "Invalid request." };

export async function adminDispatchBoard(): Promise<DispatchBoard> {
  requireAdmin();
  return dispatchBoard();
}

export async function adminFindDrivers(input: unknown): Promise<DispatchResult<FindDriversResult>> {
  requireAdmin();
  const id = orderId(input);
  if (!id) return INVALID;
  return findDrivers(id, staffName(input));
}

export async function adminBookCourier(input: unknown): Promise<DispatchResult<DispatchView>> {
  requireAdmin();
  const id = orderId(input);
  const provider = field(input, "provider");
  const quoteId = text(field(input, "quoteId"), 128);
  const tip = field(input, "tipCents") ?? 0;
  if (
    !id ||
    (provider !== "doordash" && provider !== "uber") ||
    !quoteId?.trim() ||
    typeof tip !== "number" ||
    !Number.isSafeInteger(tip) ||
    tip < 0 ||
    tip > MAX_COURIER_TIP_CENTS
  ) {
    return INVALID;
  }
  return bookCourier({ orderId: id, provider, quoteId, tipCents: tip, by: staffName(input) });
}

export async function adminAssignOwnDriver(input: unknown): Promise<DispatchResult<DispatchView>> {
  requireAdmin();
  const id = orderId(input);
  const name = text(field(input, "name"), 60);
  const phoneValue = field(input, "phone");
  const phone = phoneValue === null || phoneValue === undefined ? null : text(phoneValue, 40);
  const sendText = field(input, "sendText") === true;
  if (!id || name === null || (phoneValue !== null && phoneValue !== undefined && phone === null)) {
    return INVALID;
  }
  return assignOwnDriver({ orderId: id, name, phone, sendText, by: staffName(input) });
}

export async function adminRecordSkip(input: unknown): Promise<DispatchResult<DispatchView>> {
  requireAdmin();
  const id = orderId(input);
  const reference = field(input, "reference") ?? "";
  const ref = text(reference, 80);
  if (!id || ref === null) return INVALID;
  return recordSkipBooking({ orderId: id, reference: ref, by: staffName(input) });
}

export async function adminCancelDispatch(input: unknown): Promise<DispatchResult<DispatchView>> {
  requireAdmin();
  const id = orderId(input);
  const reason = text(field(input, "reason") ?? "", 200);
  if (!id || reason === null) return INVALID;
  return cancelCourier({ orderId: id, reason, by: staffName(input) });
}

export async function adminRefreshDispatch(input: unknown): Promise<DispatchResult<DispatchView>> {
  requireAdmin();
  const id = orderId(input);
  if (!id) return INVALID;
  return refreshCourier(id);
}

export async function adminMarkDispatch(input: unknown): Promise<DispatchResult<DispatchView>> {
  requireAdmin();
  const id = orderId(input);
  const status = field(input, "status");
  if (!id || (status !== "picked_up" && status !== "delivered")) return INVALID;
  return markDispatchProgress({ orderId: id, status, by: staffName(input) });
}
