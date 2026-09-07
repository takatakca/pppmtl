/**
 * INTERNAL PPP ORDER MODEL
 *
 * PPP owns the order. Providers (UrbanPiper today, others later) are a
 * downstream destination, never the source of truth for the customer record.
 *
 * All money is stored in CENTS to avoid floating point drift. `null` means
 * "not published / not confirmed" — never zero, never invented.
 *
 * This module is pure data: no I/O, no credentials, safe to import anywhere.
 */

import type { IntegrationProviderId } from "@/lib/integration/core/contracts";

/** PICKUP and DELIVERY ship today; DINE_IN and KIOSK are reserved. */
export type OrderType = "PICKUP" | "DELIVERY" | "DINE_IN" | "KIOSK";

export const SUPPORTED_ORDER_TYPES: OrderType[] = ["PICKUP", "DELIVERY"];

export function isSupportedOrderType(type: OrderType): boolean {
  return SUPPORTED_ORDER_TYPES.includes(type);
}

/** Universal order lifecycle. Every provider status maps into one of these. */
export type OrderStatus =
  | "CREATED"
  | "SUBMITTED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "CREATED",
  "SUBMITTED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
];

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED" || status === "FAILED";
}

/** Only forward moves along the flow, plus the two terminal exits. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  if (isTerminalOrderStatus(from)) return false;
  if (to === "CANCELLED" || to === "FAILED") return true;
  const a = ORDER_STATUS_FLOW.indexOf(from);
  const b = ORDER_STATUS_FLOW.indexOf(to);
  return a >= 0 && b > a;
}

export type OrderPaymentStatus =
  "UNPAID" | "AUTHORIZED" | "PAID" | "REFUNDED" | "FAILED" | "PAY_AT_RESTAURANT";

export interface OrderItemModifier {
  groupId: string;
  choiceId: string;
  /** Provider-side option id. Null until menu mapping supplies one. */
  providerModifierId: string | null;
  label: string;
  /** Cents. Null when no price adjustment is published. */
  priceDelta: number | null;
}

export interface OrderItem {
  lineId: string;
  productId: string;
  /** Provider-side product id. Null until menu mapping supplies one. */
  providerProductId: string | null;
  name: string;
  quantity: number;
  /** Cents. Null when the menu publishes no price for this item. */
  unitPrice: number | null;
  modifiers: OrderItemModifier[];
  notes: string;
}

/**
 * The customer projection an order may hold. TAKATAK stays the identity
 * authority; PPP keeps a reference plus what fulfilment truly needs.
 */
export interface OrderCustomer {
  customerId: string | null;
  takatakCustomerId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  isGuest: boolean;
}

/** What checkout submits. The service — never the browser — prices it. */
export interface OrderDraft {
  locationId: string;
  orderType: OrderType;
  items: OrderItem[];
  customer: OrderCustomer;
  deliveryAddress: string | null;
  notes: string;
}

export interface InternalOrder {
  id: string;
  /** Human-facing number. Null until a provider or PPP issues a real one. */
  orderNumber: string | null;
  customerId: string | null;
  locationId: string;
  /** Provider store id. Null means the store is not connected. */
  providerLocationId: string | null;
  provider: IntegrationProviderId;
  orderType: OrderType;
  items: OrderItem[];
  /** Cents. */
  subtotal: number;
  /** Cents. Null until the restaurant/provider confirms tax. */
  tax: number | null;
  /** Cents. Null until a provider quote exists. */
  total: number | null;
  paymentStatus: OrderPaymentStatus;
  status: OrderStatus;
  /** Raw provider status string, kept for support and debugging. */
  providerStatus: string | null;
  providerOrderId: string | null;
  idempotencyKey: string;
  customer: OrderCustomer;
  deliveryAddress: string | null;
  notes: string;
  /** Set when the order ends in FAILED, so support can explain it. */
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Number of unpriced lines — the UI must never invent a total. */
export function unpricedLineCount(items: OrderItem[]): number {
  return items.filter((i) => i.unitPrice === null).length;
}

/** Subtotal in cents from published prices only. */
export function computeSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    if (item.unitPrice === null) return sum;
    const modifiers = item.modifiers.reduce((m, mod) => m + (mod.priceDelta ?? 0), 0);
    return sum + (item.unitPrice + modifiers) * item.quantity;
  }, 0);
}
