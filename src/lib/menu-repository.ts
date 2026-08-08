import {
  categories as staticCategories,
  locations as staticLocations,
  menuItems as staticItems,
  offers as staticOffers,
  type Lang,
  type Location,
  type MenuCategory,
  type MenuItem,
  type Offer,
  type OrderMode,
} from "@/data/menu";
import { searchMenu, type SearchResults } from "@/lib/search";
import { featuredItemIds, mostOrderedItemIds } from "@/data/collections.generated";
import type { ModifierGroup } from "@/data/catalog-types";

export interface MenuCollection {
  id: string;
  labelEn: string;
  labelFr: string;
  itemIds: string[];
}

export interface FindMenuItemsInput {
  query: string;
  language: Lang;
  locationId: string | null;
  orderMode?: OrderMode;
}

/**
 * The single contract every customer surface reads from: web menu, search,
 * voice search and (later) the AI assistant and AI phone ordering.
 *
 * `StaticMenuRepository` is the only implementation today. A provider-backed
 * implementation can replace it without touching any component.
 */
export interface MenuRepository {
  getCategories(locationId: string | null): MenuCategory[];
  getItems(locationId: string | null): MenuItem[];
  getItemsInCategory(categoryId: string, locationId: string | null): MenuItem[];
  getItem(itemId: string): MenuItem | null;
  getModifierGroups(itemId: string): ModifierGroup[];
  getCollections(): MenuCollection[];
  getPopularItems(locationId: string | null, limit?: number): MenuItem[];
  getRelatedItems(itemId: string, locationId: string | null, limit?: number): MenuItem[];
  getOffers(locationId: string | null, mode?: OrderMode): Offer[];
  getLocations(): Location[];
  getLocation(locationId: string | null): Location | null;
  search(input: FindMenuItemsInput): SearchResults;
  findMenuItems(input: FindMenuItemsInput): MenuItem[];
}

function availableItems(locationId: string | null) {
  return staticItems.filter(
    (i) => i.isAvailable && (!locationId || i.locationIds.includes(locationId)),
  );
}

/** Deterministic "complete your order" pairings, by category. Real catalog only. */
const CROSS_SELL: Record<string, string[]> = {
  "cat-pizza": ["cat-fries-poutine", "cat-drinks", "cat-desserts"],
  "cat-promo-pizza": ["cat-drinks", "cat-desserts"],
  "cat-double-pizza": ["cat-fries-poutine", "cat-drinks"],
  "cat-fried-chicken": ["cat-fries-poutine", "cat-drinks"],
  "cat-wings-nuggets": ["cat-fries-poutine", "cat-drinks"],
  "cat-trios": ["cat-desserts", "cat-fries-poutine"],
  "cat-family-combos": ["cat-drinks", "cat-desserts"],
  "cat-subs": ["cat-fries-poutine", "cat-drinks"],
  "cat-fries-poutine": ["cat-drinks", "cat-snack-bar"],
  "cat-snack-bar": ["cat-fries-poutine", "cat-drinks"],
  "cat-pita-plates": ["cat-salads", "cat-drinks"],
  "cat-salads": ["cat-drinks", "cat-pita-plates"],
  "cat-mexican": ["cat-drinks", "cat-fries-poutine"],
  "cat-pasta": ["cat-salads", "cat-drinks"],
  "cat-desserts": ["cat-drinks"],
  "cat-drinks": ["cat-desserts"],
  "cat-extras": ["cat-fries-poutine"],
};

export const staticMenuRepository: MenuRepository = {
  getCategories: (locationId) => {
    const items = availableItems(locationId);
    return [...staticCategories]
      .filter((c) => items.some((i) => i.categoryId === c.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
  getItems: (locationId) => availableItems(locationId),
  getItemsInCategory: (categoryId, locationId) =>
    availableItems(locationId).filter((i) => i.categoryId === categoryId),
  getItem: (itemId) => staticItems.find((i) => i.id === itemId) ?? null,
  getModifierGroups: (itemId) => staticItems.find((i) => i.id === itemId)?.modifierGroups ?? [],
  getCollections: () => [
    {
      id: "most-ordered",
      labelEn: "Most ordered",
      labelFr: "Les plus commandés",
      itemIds: mostOrderedItemIds,
    },
    ...(featuredItemIds.length > 0
      ? [
          {
            id: "featured",
            labelEn: "Featured",
            labelFr: "En vedette",
            itemIds: featuredItemIds,
          },
        ]
      : []),
  ],
  getPopularItems: (locationId, limit = 8) => {
    const available = availableItems(locationId);
    return mostOrderedItemIds
      .map((id) => available.find((i) => i.id === id))
      .filter((i): i is MenuItem => Boolean(i))
      .slice(0, limit);
  },
  getRelatedItems: (itemId, locationId, limit = 6) => {
    const source = staticItems.find((i) => i.id === itemId);
    if (!source) return [];
    const available = availableItems(locationId);
    const wanted = CROSS_SELL[source.categoryId] ?? ["cat-drinks"];
    const out: MenuItem[] = [];
    for (const catId of wanted) {
      for (const item of available) {
        if (item.categoryId !== catId || item.id === itemId) continue;
        out.push(item);
        if (out.length >= limit) return out;
        break;
      }
    }
    for (const item of available) {
      if (out.length >= limit) break;
      if (wanted.includes(item.categoryId) && !out.includes(item) && item.id !== itemId) {
        out.push(item);
      }
    }
    return out.slice(0, limit);
  },
  getOffers: (locationId, mode) =>
    staticOffers.filter(
      (o) =>
        (!locationId || o.locationIds.includes(locationId)) && (!mode || o.modes.includes(mode)),
    ),
  getLocations: () => staticLocations,
  getLocation: (locationId) => staticLocations.find((l) => l.id === locationId) ?? null,
  search: ({ query, language, locationId }) => searchMenu(query, { lang: language, locationId }),
  findMenuItems: (input) => staticMenuRepository.search(input).items,
};

/** Components import this, never the static data module. */
export const menuRepository: MenuRepository = staticMenuRepository;
