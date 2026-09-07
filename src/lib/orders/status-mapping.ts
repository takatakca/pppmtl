/**
 * Provider status / webhook event -> universal PPP order status.
 * Pure: this is the unit under test for every provider we ever add.
 */

import type { OrderStatus } from "./types";

/** Canonical webhook event names PPP understands. */
export type ProviderOrderEvent =
  | "ORDER_ACCEPTED"
  | "ORDER_PREPARING"
  | "ORDER_READY"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "ORDER_FAILED";

const EVENT_MAP: Record<ProviderOrderEvent, OrderStatus> = {
  ORDER_ACCEPTED: "ACCEPTED",
  ORDER_PREPARING: "PREPARING",
  ORDER_READY: "READY",
  ORDER_COMPLETED: "COMPLETED",
  ORDER_CANCELLED: "CANCELLED",
  ORDER_FAILED: "FAILED",
};

/** Accepts `order.accepted`, `ORDER_ACCEPTED`, `order_accepted`, etc. */
export function normalizeEventName(raw: string): ProviderOrderEvent | null {
  const key = raw.trim().toUpperCase().replace(/[.\-\s]/g, "_");
  return key in EVENT_MAP ? (key as ProviderOrderEvent) : null;
}

export function statusForEvent(raw: string): OrderStatus | null {
  const event = normalizeEventName(raw);
  return event ? EVENT_MAP[event] : null;
}

/** UrbanPiper's own status vocabulary, mapped into ours. */
const PROVIDER_STATUS_MAP: Record<string, OrderStatus> = {
  placed: "SUBMITTED",
  acknowledged: "ACCEPTED",
  confirmed: "ACCEPTED",
  accepted: "ACCEPTED",
  "in kitchen": "PREPARING",
  preparing: "PREPARING",
  "food ready": "READY",
  ready: "READY",
  dispatched: "READY",
  "out for delivery": "READY",
  completed: "COMPLETED",
  delivered: "COMPLETED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  rejected: "FAILED",
  failed: "FAILED",
};

export function statusForProviderStatus(raw: string): OrderStatus | null {
  return PROVIDER_STATUS_MAP[raw.trim().toLowerCase()] ?? null;
}

/** Customer-facing wording per status. Never technical. */
export function statusLabel(status: OrderStatus, lang: "en" | "fr" | "es"): string {
  const table: Record<OrderStatus, [string, string, string]> = {
    CREATED: ["Not sent yet", "Pas encore envoyée", "Aún no enviado"],
    SUBMITTED: ["Sent to the kitchen", "Envoyée à la cuisine", "Enviado a la cocina"],
    ACCEPTED: ["Confirmed", "Confirmée", "Confirmado"],
    PREPARING: ["Preparing", "En préparation", "En preparación"],
    READY: ["Ready", "Prête", "Listo"],
    COMPLETED: ["Completed", "Terminée", "Completado"],
    CANCELLED: ["Cancelled", "Annulée", "Cancelado"],
    FAILED: ["Not completed", "Non complétée", "No completado"],
  };
  const [en, fr, es] = table[status];
  return lang === "fr" ? fr : lang === "es" ? es : en;
}
