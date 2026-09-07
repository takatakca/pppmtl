/**
 * Pure UrbanPiper <-> universal mapping. No network, no credentials, so this
 * is the unit under test. Shapes follow UrbanPiper's documented Atlas/Hub
 * payloads; anything the payload does not state stays `null`.
 */

import type {
  UniversalCategory,
  UniversalModifierGroup,
  UniversalOrderDraft,
  UniversalOrderStatus,
  UniversalProduct,
} from "@/lib/integration/core/contracts";

export interface UrbanPiperOptionPayload {
  ref_id: string;
  title: string;
  title_fr?: string;
  price?: number | null;
  available?: boolean;
  default?: boolean;
}

export interface UrbanPiperOptionGroupPayload {
  ref_id: string;
  title: string;
  title_fr?: string;
  min_selectable?: number;
  max_selectable?: number;
  options: UrbanPiperOptionPayload[];
}

export interface UrbanPiperItemPayload {
  ref_id: string;
  title: string;
  title_fr?: string;
  description?: string;
  description_fr?: string;
  price?: number | null;
  markup_price?: number | null;
  image_url?: string | null;
  available?: boolean;
  category_ref_id: string;
  option_groups?: UrbanPiperOptionGroupPayload[];
}

export interface UrbanPiperCategoryPayload {
  ref_id: string;
  title: string;
  title_fr?: string;
  description?: string;
  description_fr?: string;
  sort_order?: number;
  active?: boolean;
  image_url?: string | null;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** UrbanPiper publishes prices in dollars; PPP contracts use cents. */
export function toCents(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  return Math.round(amount * 100);
}

export function mapCategory(payload: UrbanPiperCategoryPayload): UniversalCategory {
  return {
    id: payload.ref_id,
    externalId: payload.ref_id,
    slug: slugify(payload.title),
    nameEn: payload.title,
    nameFr: payload.title_fr ?? payload.title,
    descriptionEn: payload.description ?? "",
    descriptionFr: payload.description_fr ?? payload.description ?? "",
    image: {
      url: payload.image_url ?? null,
      altEn: payload.title,
      altFr: payload.title_fr ?? payload.title,
    },
    sortOrder: payload.sort_order ?? 0,
    available: payload.active !== false,
  };
}

export function mapModifierGroup(payload: UrbanPiperOptionGroupPayload): UniversalModifierGroup {
  const min = payload.min_selectable ?? 0;
  const max = payload.max_selectable ?? Math.max(min, 1);
  return {
    id: payload.ref_id,
    externalId: payload.ref_id,
    nameEn: payload.title,
    nameFr: payload.title_fr ?? payload.title,
    required: min > 0,
    minSelections: min,
    maxSelections: Math.max(max, min),
    choices: payload.options.map((o) => ({
      id: o.ref_id,
      externalId: o.ref_id,
      nameEn: o.title,
      nameFr: o.title_fr ?? o.title,
      priceDelta: toCents(o.price ?? null),
      available: o.available !== false,
      isDefault: o.default === true,
    })),
  };
}

export function mapProduct(payload: UrbanPiperItemPayload): UniversalProduct {
  return {
    id: payload.ref_id,
    externalId: payload.ref_id,
    categoryId: payload.category_ref_id,
    nameEn: payload.title,
    nameFr: payload.title_fr ?? payload.title,
    descriptionEn: payload.description ?? "",
    descriptionFr: payload.description_fr ?? payload.description ?? "",
    image: {
      url: payload.image_url ?? null,
      altEn: payload.title,
      altFr: payload.title_fr ?? payload.title,
    },
    price: toCents(payload.price ?? null),
    compareAtPrice: toCents(payload.markup_price ?? null),
    modifierGroups: (payload.option_groups ?? []).map(mapModifierGroup),
    available: payload.available !== false,
  };
}

const STATUS_MAP: Record<string, UniversalOrderStatus> = {
  Placed: "CREATED",
  Acknowledged: "CONFIRMED",
  Confirmed: "CONFIRMED",
  "Food Ready": "READY",
  Ready: "READY",
  Dispatched: "READY",
  Completed: "COMPLETED",
  Cancelled: "CANCELLED",
  "In Kitchen": "PREPARING",
  Preparing: "PREPARING",
};

export function mapOrderStatus(providerStatus: string): UniversalOrderStatus | null {
  return STATUS_MAP[providerStatus] ?? null;
}

/** Universal draft -> UrbanPiper order payload. Pure and fully testable. */
export function mapDraftToUrbanPiperOrder(draft: UniversalOrderDraft, providerLocationId: string) {
  return {
    store_ref_id: providerLocationId,
    order_type: draft.orderType === "DELIVERY" ? "delivery" : "pickup",
    instructions: draft.notes,
    customer: {
      name: draft.customer.preferredName,
      email: draft.customer.email,
      phone: draft.customer.phone,
      external_id: draft.customer.externalCustomerId ?? draft.customer.takatakCustomerId,
    },
    address: draft.deliveryAddress,
    items: draft.lines.map((line) => ({
      ref_id: line.externalProductId ?? line.productId,
      quantity: line.quantity,
      instructions: line.notes,
      options: line.modifiers.map((m) => ({
        group_ref_id: m.groupId,
        ref_id: m.externalChoiceId ?? m.choiceId,
      })),
    })),
  };
}
