/**
 * Clover menu adapter. SERVER ONLY.
 *
 * The universal menu straight from Clover: categories in Clover's order, every item with its price, description
 * and option groups nested (minimum, maximum, required, option prices), staff-only and archived categories left
 * out (catalog.ts). Live inventory with a REST token, else the committed snapshot. Site items keep their own ids
 * (the map file); other Clover items get the site's slug rule.
 */
import type { MenuAdapter } from "@/lib/integration/core/adapter";
import type {
  CapabilityStatus,
  IntegrationResult,
  UniversalMenu,
  UniversalProduct,
} from "@/lib/integration/core/contracts";
import { cloverItemMap } from "@/config/clover-item-map";
import { cloverPhotoUrl, cloverSnapshot } from "@/data/clover/overlay";
import { siteSlug, slugify, type CloverInventory } from "./catalog";
import { siteGroupsFor } from "./site-groups";
import { cloverServesLocation } from "./config.server";
import { fetchLiveInventory } from "./api.server";

/** Pure: Clover inventory -> universal menu. */
export function cloverInventoryToUniversalMenu(
  inventory: CloverInventory,
  locationId: string,
  siteIdFor: (cloverItemId: string) => string | undefined,
): UniversalMenu {
  const categories = [...inventory.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryOrder = new Map(categories.map((c, i) => [c.id, i]));
  const products: UniversalProduct[] = inventory.items
    .map((item) => {
      const name = item.name;
      const photo = cloverPhotoUrl(item.id);
      return {
        id: siteIdFor(item.id) ?? siteSlug(name),
        externalId: item.id,
        categoryId: item.categoryIds[0] ?? "",
        nameEn: name,
        nameFr: name,
        descriptionEn: item.description ?? "",
        descriptionFr: item.description ?? "",
        image: { url: photo, altEn: name, altFr: name },
        price: item.price,
        compareAtPrice: null,
        available: item.available,
        modifierGroups: siteGroupsFor(inventory, item.id).map((g) => ({
          id: g.id,
          externalId: g.id,
          nameEn: g.labelEn,
          nameFr: g.labelFr,
          required: g.required,
          minSelections: g.min ?? (g.required ? 1 : 0),
          maxSelections: g.max ?? 1,
          choices: g.choices.map((c) => ({
            id: c.id,
            externalId: null,
            nameEn: c.labelEn,
            nameFr: c.labelFr,
            priceDelta: c.priceDelta === null ? null : Math.round(c.priceDelta * 100),
            available: true,
            isDefault: false,
          })),
        })),
      };
    })
    .sort(
      (a, b) => (categoryOrder.get(a.categoryId) ?? 999) - (categoryOrder.get(b.categoryId) ?? 999),
    );
  return {
    locationId,
    provider: "clover",
    categories: categories.map((c) => ({
      id: c.id,
      externalId: c.id,
      slug: slugify(c.name),
      nameEn: c.name,
      nameFr: c.name,
      descriptionEn: "",
      descriptionFr: "",
      image: { url: null, altEn: c.name, altFr: c.name },
      sortOrder: c.sortOrder,
      available: true,
    })),
    products,
    syncedAt: inventory.generatedAt,
  };
}

const siteIdByClover = new Map(cloverItemMap.map((s) => [s.clover, s.site]));

function statusFor(locationId: string): CapabilityStatus {
  return {
    provider: "clover",
    capability: "menu",
    available: cloverServesLocation(locationId),
    reasonEn: "The menu is the restaurant's Clover menu.",
    reasonFr: "Le menu est celui de la caisse Clover du restaurant.",
  };
}

export const cloverMenuAdapter: MenuAdapter = {
  provider: "clover",
  status: statusFor,
  async fetchMenu(locationId): Promise<IntegrationResult<UniversalMenu>> {
    if (!cloverServesLocation(locationId)) {
      return { ok: false, code: "not_configured", message: "This store does not use Clover." };
    }
    const inventory = (await fetchLiveInventory()) ?? cloverSnapshot;
    return {
      ok: true,
      data: cloverInventoryToUniversalMenu(inventory, locationId, (id) => siteIdByClover.get(id)),
    };
  },
  async fetchAvailability(locationId) {
    const menu = await cloverMenuAdapter.fetchMenu(locationId);
    if (!menu.ok) return menu;
    return {
      ok: true,
      data: Object.fromEntries(menu.data.products.map((p) => [p.id, p.available])),
    };
  },
};
