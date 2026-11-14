/**
 * UNIVERSAL INTEGRATION CONTRACTS
 *
 * Provider-neutral models. Nothing in here knows about UrbanPiper, Clover,
 * Ordermark or any marketplace: every provider adapter maps its own payloads
 * into these shapes, and the PPP frontend only ever sees these shapes.
 *
 * Nothing here performs I/O, so these models are safe to import anywhere and
 * are the unit under test for mapping.
 */

export type IntegrationProviderId =
  | "local"
  | "urbanpiper"
  | "ordermark"
  | "clover"
  | "takatak"
  | "uber_eats"
  | "doordash"
  | "skip"
  /** Uber Direct courier API (not the Uber Eats marketplace). */
  | "uber_direct";

export type IntegrationCapability =
  "menu" | "orders" | "customers" | "locations" | "payments" | "webhooks";

/** Why a capability is not usable yet, in customer-safe wording. */
export interface CapabilityStatus {
  provider: IntegrationProviderId;
  capability: IntegrationCapability;
  /** True only when real credentials AND a provider location mapping exist. */
  available: boolean;
  reasonEn: string;
  reasonFr: string;
  reasonEs?: string;
}

/* ------------------------------------------------------------------ menu */

export interface UniversalImage {
  url: string | null;
  altEn: string;
  altFr: string;
}

export interface UniversalCategory {
  id: string;
  externalId: string | null;
  slug: string;
  nameEn: string;
  nameFr: string;
  nameEs?: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs?: string;
  image: UniversalImage;
  sortOrder: number;
  available: boolean;
}

export interface UniversalModifierChoice {
  id: string;
  externalId: string | null;
  nameEn: string;
  nameFr: string;
  nameEs?: string;
  /** Price adjustment in cents. `null` = the provider did not publish one. */
  priceDelta: number | null;
  available: boolean;
  isDefault: boolean;
}

export interface UniversalModifierGroup {
  id: string;
  externalId: string | null;
  nameEn: string;
  nameFr: string;
  nameEs?: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  choices: UniversalModifierChoice[];
}

export interface UniversalProduct {
  id: string;
  externalId: string | null;
  categoryId: string;
  nameEn: string;
  nameFr: string;
  nameEs?: string;
  descriptionEn: string;
  descriptionFr: string;
  descriptionEs?: string;
  image: UniversalImage;
  /** Base price in cents. `null` = price only confirmed by the restaurant. */
  price: number | null;
  compareAtPrice: number | null;
  modifierGroups: UniversalModifierGroup[];
  available: boolean;
}

export interface UniversalMenu {
  locationId: string;
  provider: IntegrationProviderId;
  categories: UniversalCategory[];
  products: UniversalProduct[];
  /** ISO timestamp of the provider sync, or null for a static local catalog. */
  syncedAt: string | null;
}

/* ----------------------------------------------------------------- order */

export type UniversalOrderStatus =
  "CREATED" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

export type UniversalPaymentStatus =
  "UNPAID" | "AUTHORIZED" | "PAID" | "REFUNDED" | "FAILED" | "PAY_AT_RESTAURANT";

export type UniversalOrderType = "PICKUP" | "DELIVERY";

export interface UniversalOrderLineModifier {
  groupId: string;
  choiceId: string;
  externalChoiceId: string | null;
  priceDelta: number | null;
}

export interface UniversalOrderLine {
  productId: string;
  externalProductId: string | null;
  quantity: number;
  unitPrice: number | null;
  modifiers: UniversalOrderLineModifier[];
  notes: string;
}

/**
 * The customer projection PPP is allowed to hold. TAKATAK owns master
 * identity; PPP stores a reference, never a competing customer record.
 */
export interface UniversalCustomerRef {
  /** TAKATAK master identity id — the authority. */
  takatakCustomerId: string | null;
  /** Provider-side customer id (UrbanPiper/Clover), when one exists. */
  externalCustomerId: string | null;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
}

export interface UniversalOrderDraft {
  locationId: string;
  orderType: UniversalOrderType;
  lines: UniversalOrderLine[];
  customer: UniversalCustomerRef;
  deliveryAddress: string | null;
  notes: string;
  /** Cents: the customer's tip and the website delivery fee, when the order has them. */
  tip?: number;
  deliveryFee?: number;
}

export interface UniversalOrder {
  id: string;
  externalOrderId: string | null;
  orderNumber: string | null;
  locationId: string;
  provider: IntegrationProviderId;
  orderType: UniversalOrderType;
  status: UniversalOrderStatus;
  paymentStatus: UniversalPaymentStatus;
  placedAt: string;
  updatedAt: string;
  estimatedReadyAt: string | null;
  lines: UniversalOrderLine[];
  subtotal: number | null;
  taxes: number | null;
  fees: number | null;
  total: number | null;
  customer: UniversalCustomerRef;
}

/** Lifecycle order used by tracking UI; providers may skip intermediate steps. */
export const ORDER_STATUS_SEQUENCE: UniversalOrderStatus[] = [
  "CREATED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
];

export function isTerminalStatus(status: UniversalOrderStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

/* ---------------------------------------------------------------- result */

export type IntegrationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "not_configured" | "provider_error" | "invalid_request"; message: string };

export function notConfigured<T>(message: string): IntegrationResult<T> {
  return { ok: false, code: "not_configured", message };
}
