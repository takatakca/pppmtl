/**
 * Provider-agnostic ordering contracts.
 *
 * The PPP frontend must never know whether menu, order and history data come
 * from UrbanPiper, Ordermark, Clover, TAKATAK or the local catalog. Every
 * integration implements these interfaces; screens only ever talk to them.
 *
 * Nothing here calls a network today. Adapters that are not wired report
 * `available: false` so the UI can tell the truth instead of faking success.
 */

import type { MenuCategory, MenuItem, OrderMode } from "@/data/menu";

export type IntegrationProvider = "local" | "urbanpiper" | "ordermark" | "clover" | "takatak";

export interface IntegrationStatus {
  provider: IntegrationProvider;
  /** False until real credentials and endpoints exist for this location. */
  available: boolean;
  /** Short, customer-safe reason shown when a capability is unavailable. */
  reasonEn: string;
  reasonFr: string;
}

/** Catalog snapshot for one location, in provider-neutral shape. */
export interface MenuSnapshot {
  locationId: string;
  categories: MenuCategory[];
  items: MenuItem[];
  /** ISO timestamp of the data used, or null for a static local catalog. */
  syncedAt: string | null;
}

export interface MenuSyncAdapter {
  status(locationId: string): IntegrationStatus;
  /** Full catalog for a location: categories, items, prices, modifiers, images. */
  getMenu(locationId: string): Promise<MenuSnapshot>;
  /** Item-level availability (86'd items) when the provider publishes it. */
  getAvailability(locationId: string): Promise<Record<string, boolean>>;
}

export interface DraftOrderLine {
  itemId: string;
  quantity: number;
  instructions: string;
  /** `{ [modifierGroupId]: choiceId }` — matches the catalog modifier model. */
  selections: Record<string, string>;
}

export interface DraftOrderCustomer {
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  /** Verified phone flag is owned by the identity provider, never by the UI. */
  phoneVerified: boolean;
}

export interface DraftOrder {
  locationId: string;
  mode: OrderMode;
  lines: DraftOrderLine[];
  customer: DraftOrderCustomer;
  deliveryAddress: string | null;
  notes: string;
}

export type OrderStatus = "placed" | "preparing" | "ready" | "out_for_delivery" | "completed";

export interface PlacedOrder {
  id: string;
  locationId: string;
  mode: OrderMode;
  status: OrderStatus;
  placedAt: string;
  total: number | null;
  lines: DraftOrderLine[];
}

export type SubmitOrderResult =
  | { status: "unavailable"; detail: IntegrationStatus }
  | { status: "accepted"; order: PlacedOrder };

export interface OrderAdapter {
  status(locationId: string): IntegrationStatus;
  /** Price the draft server-side (taxes, fees, promos) — never computed in the UI. */
  quote(draft: DraftOrder): Promise<
    | { status: "unavailable"; detail: IntegrationStatus }
    | { status: "quoted"; subtotal: number; taxes: number; fees: number; total: number }
  >;
  submit(draft: DraftOrder): Promise<SubmitOrderResult>;
}

export interface CustomerOrderAdapter {
  status(): IntegrationStatus;
  /** Past and live orders for the signed-in customer. Empty array is a valid answer. */
  listOrders(): Promise<PlacedOrder[]>;
  getOrder(orderId: string): Promise<PlacedOrder | null>;
}

export interface OrderingIntegration {
  menu: MenuSyncAdapter;
  orders: OrderAdapter;
  customerOrders: CustomerOrderAdapter;
}
