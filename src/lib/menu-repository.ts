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