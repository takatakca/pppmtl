/**
 * Courier dispatch record kept on the order (`order_document.dispatch`). Pure: no I/O, fully testable.
 *
 * One order has at most ONE live dispatch (`active` and not terminal). A cancelled or failed one moves to
 * `history` when staff dispatch again, so a second tablet can never book a second courier by accident.
 * Provider updates (booking answer, status read, webhook) only move a live record forward; a late,
 * out-of-order webhook (older providerUpdatedAt) is ignored.
 */
import {
  isTerminalDispatchStatus,
  type CourierDeliveryUpdate,
  type CourierDriver,
  type CourierProviderId,
  type DispatchStatus,
  type StoredQuote,
} from "./couriers/types";

export interface DispatchEvent {
  at: string;
  status: DispatchStatus;
  source: "staff" | "api" | "webhook";
  detail: string | null;
}

export interface DispatchRecord {
  /** dsp_… — also the idempotency key sent to the provider. */
  id: string;
  provider: CourierProviderId;
  status: DispatchStatus;
  providerStatus: string | null;
  /** DoorDash external_delivery_id / Uber delivery id (del_…). */
  externalId: string | null;
  quoteId: string | null;
  /** Courier fee charged to the restaurant, without tip (cents). Null for Skip (unknown) — 0 for own driver. */
  feeCents: number | null;
  tipCents: number;
  currency: string | null;
  trackingUrl: string | null;
  pickupEta: string | null;
  dropoffEta: string | null;
  driver: CourierDriver | null;
  sandbox: boolean;
  chosenAt: string;
  chosenBy: string;
  updatedAt: string;
  providerUpdatedAt: string | null;
  /** Last staff-readable note: why it failed, text sent to the driver… */
  note: string | null;
  events: DispatchEvent[];
}

export interface DispatchQuoteRound {
  requestedAt: string;
  requestedBy: string;
  quotes: StoredQuote[];
}

export interface DispatchState {
  revision: number;
  quotes: DispatchQuoteRound | null;
  active: DispatchRecord | null;
  history: DispatchRecord[];
}

export type DispatchChange = { ok: true; state: DispatchState } | { ok: false; error: string };

const MAX_HISTORY = 10;
const MAX_EVENTS = 40;

export function emptyDispatch(): DispatchState {
  return { revision: 0, quotes: null, active: null, history: [] };
}

/** The stored value, defensively: anything malformed reads as "no dispatch". */
export function readDispatch(value: unknown): DispatchState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyDispatch();
  const v = value as Partial<DispatchState>;
  const isRecord = (r: unknown): r is DispatchRecord =>
    Boolean(r) &&
    typeof r === "object" &&
    typeof (r as DispatchRecord).id === "string" &&
    typeof (r as DispatchRecord).provider === "string" &&
    typeof (r as DispatchRecord).status === "string";
  return {
    revision: typeof v.revision === "number" && Number.isSafeInteger(v.revision) ? v.revision : 0,
    quotes:
      v.quotes && typeof v.quotes === "object" && Array.isArray(v.quotes.quotes) ? v.quotes : null,
    active: isRecord(v.active) ? { ...v.active, events: v.active.events ?? [] } : null,
    history: Array.isArray(v.history) ? v.history.filter(isRecord) : [],
  };
}

export function isLive(record: DispatchRecord | null): record is DispatchRecord {
  return Boolean(record && !isTerminalDispatchStatus(record.status));
}

function bump(state: DispatchState, patch: Partial<DispatchState>): DispatchState {
  return { ...state, ...patch, revision: state.revision + 1 };
}

function withEvent(
  record: DispatchRecord,
  status: DispatchStatus,
  source: DispatchEvent["source"],
  at: string,
  detail: string | null = null,
): DispatchRecord {
  return {
    ...record,
    events: [...record.events, { at, status, source, detail }].slice(-MAX_EVENTS),
  };
}

/** Keep the latest successful quotes; booking must name one of them. */
export function withQuotes(
  state: DispatchState,
  quotes: StoredQuote[],
  by: string,
  now: Date,
): DispatchState {
  return bump(state, { quotes: { requestedAt: now.toISOString(), requestedBy: by, quotes } });
}

export function findQuote(
  state: DispatchState,
  provider: string,
  quoteId: string,
  now: Date,
): { ok: true; quote: StoredQuote } | { ok: false; error: string; expired: boolean } {
  const quote = state.quotes?.quotes.find((q) => q.provider === provider && q.quoteId === quoteId);
  if (!quote) {
    return {
      ok: false,
      expired: true,
      error: "This quote is no longer on file. Press Find a driver again.",
    };
  }
  if (quote.expiresAt && Date.parse(quote.expiresAt) <= now.getTime()) {
    return { ok: false, expired: true, error: "This quote expired. Press Find a driver again." };
  }
  return { ok: true, quote };
}

function retire(state: DispatchState): DispatchRecord[] {
  return state.active ? [state.active, ...state.history].slice(0, MAX_HISTORY) : state.history;
}

export interface NewDispatch {
  id: string;
  provider: CourierProviderId;
  status: DispatchStatus;
  by: string;
  now: Date;
  quote?: StoredQuote | null;
  /** Known before the provider answers (DoorDash's external_delivery_id = the quote id). */
  externalId?: string | null;
  tipCents?: number;
  feeCents?: number | null;
  driver?: CourierDriver | null;
  note?: string | null;
}

/** Start a dispatch. Refused while another one is live, whoever started it. */
export function startDispatch(state: DispatchState, input: NewDispatch): DispatchChange {
  if (isLive(state.active)) {
    return {
      ok: false,
      error: `A courier is already ${state.active.status === "booking" ? "being booked" : "booked"} for this order (${state.active.provider}). Cancel it first.`,
    };
  }
  const at = input.now.toISOString();
  const quote = input.quote ?? null;
  const record: DispatchRecord = withEvent(
    {
      id: input.id,
      provider: input.provider,
      status: input.status,
      providerStatus: null,
      externalId: input.externalId ?? null,
      quoteId: quote?.quoteId ?? null,
      feeCents: input.feeCents !== undefined ? input.feeCents : (quote?.feeCents ?? null),
      tipCents: input.tipCents ?? 0,
      currency: quote?.currency ?? (input.provider === "own_driver" ? "CAD" : null),
      trackingUrl: null,
      pickupEta: quote?.pickupEta ?? null,
      dropoffEta: quote?.dropoffEta ?? null,
      driver: input.driver ?? null,
      sandbox: quote?.sandbox ?? false,
      chosenAt: at,
      chosenBy: input.by,
      updatedAt: at,
      providerUpdatedAt: null,
      note: input.note ?? null,
      events: [],
    },
    input.status,
    "staff",
    at,
    `Chosen by ${input.by}`,
  );
  return { ok: true, state: bump(state, { active: record, history: retire(state) }) };
}

function mergeDriver(
  current: CourierDriver | null,
  next: CourierDriver | null,
): CourierDriver | null {
  if (!next) return current;
  if (!current) return next;
  return {
    name: next.name ?? current.name,
    phone: next.phone ?? current.phone,
    vehicle: next.vehicle ?? current.vehicle,
    location: next.location ?? current.location,
  };
}

/**
 * Apply what a provider said about the active delivery. Matches by external id, or by dispatch id while
 * booking. Returns `changed: false` when the update is for another delivery, stale, or not allowed.
 */
export function applyProviderUpdate(
  state: DispatchState,
  update: CourierDeliveryUpdate,
  source: "api" | "webhook",
  now: Date,
  match: { dispatchId?: string } = {},
): { state: DispatchState; changed: boolean } {
  const active = state.active;
  if (!active || (active.provider !== "doordash" && active.provider !== "uber")) {
    return { state, changed: false };
  }
  const sameDelivery =
    (active.externalId !== null && active.externalId === update.externalId) ||
    (match.dispatchId !== undefined && match.dispatchId === active.id);
  if (!sameDelivery) return { state, changed: false };

  // Ignore a late webhook older than what we already applied.
  if (
    update.providerUpdatedAt &&
    active.providerUpdatedAt &&
    Date.parse(update.providerUpdatedAt) < Date.parse(active.providerUpdatedAt)
  ) {
    return { state, changed: false };
  }

  let status = update.status ?? active.status;
  if (active.status === "booking" && update.status === null) status = "requested";
  // A terminal record only moves cancelled → returned. A provider update for a "failed" booking proves the
  // delivery exists after all (e.g. the booking answer timed out), so it revives it.
  if (isTerminalDispatchStatus(active.status) && active.status !== "failed") {
    if (!(active.status === "cancelled" && status === "returned")) status = active.status;
  }

  const at = now.toISOString();
  let next: DispatchRecord = {
    ...active,
    status,
    providerStatus: update.providerStatus || active.providerStatus,
    externalId: active.externalId ?? update.externalId,
    trackingUrl: update.trackingUrl ?? active.trackingUrl,
    feeCents: update.feeCents ?? active.feeCents,
    currency: update.currency ?? active.currency,
    pickupEta: update.pickupEta ?? active.pickupEta,
    dropoffEta: update.dropoffEta ?? active.dropoffEta,
    driver: mergeDriver(active.driver, update.driver),
    sandbox: update.sandbox ?? active.sandbox,
    providerUpdatedAt: update.providerUpdatedAt ?? active.providerUpdatedAt,
    note: status === "cancelled" && update.cancelReason ? update.cancelReason : active.note,
    updatedAt: at,
  };
  if (status !== active.status) next = withEvent(next, status, source, at, update.providerStatus);
  return { state: bump(state, { active: next }), changed: true };
}

/** The provider refused or did not confirm the booking. */
export function failBooking(
  state: DispatchState,
  dispatchId: string,
  reason: string,
  now: Date,
): DispatchState {
  const active = state.active;
  if (!active || active.id !== dispatchId || active.status !== "booking") return state;
  const at = now.toISOString();
  return bump(state, {
    active: withEvent(
      { ...active, status: "failed", note: reason, updatedAt: at },
      "failed",
      "api",
      at,
      reason,
    ),
  });
}

/** Staff ended the dispatch (after the provider confirmed the cancel, or for a manual one). */
export function cancelDispatch(
  state: DispatchState,
  by: string,
  reason: string,
  now: Date,
  status: "cancelled" | "failed" = "cancelled",
): DispatchChange {
  const active = state.active;
  if (!isLive(active)) return { ok: false, error: "There is no courier to cancel on this order." };
  const at = now.toISOString();
  const note = reason ? `${reason} (${by})` : `Cancelled by ${by}`;
  return {
    ok: true,
    state: bump(state, {
      active: withEvent({ ...active, status, note, updatedAt: at }, status, "staff", at, note),
    }),
  };
}

/** Staff progress for a dispatch no API reports on (own driver, Skip). */
export function staffProgress(
  state: DispatchState,
  status: "picked_up" | "delivered",
  by: string,
  now: Date,
): DispatchChange {
  const active = state.active;
  if (!isLive(active)) return { ok: false, error: "There is no courier on this order." };
  if (active.provider !== "own_driver" && active.provider !== "skip") {
    return { ok: false, error: `${active.provider} reports this delivery's progress itself.` };
  }
  const at = now.toISOString();
  return {
    ok: true,
    state: bump(state, {
      active: withEvent(
        { ...active, status, updatedAt: at },
        status,
        "staff",
        at,
        `Marked by ${by}`,
      ),
    }),
  };
}

export function setNote(state: DispatchState, dispatchId: string, note: string): DispatchState {
  if (!state.active || state.active.id !== dispatchId) return state;
  return bump(state, { active: { ...state.active, note } });
}
