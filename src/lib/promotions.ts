import { menuRepository } from "@/lib/menu-repository";
import type { MenuItem } from "@/data/menu";

export interface DiscountedItem {
  item: MenuItem;
  save: number;
  percent: number;
}

/**
 * Real, catalog-derived promotions: an item is only "on sale" when the
 * published catalog carries a compare-at price. Nothing is invented here.
 */
export function getDiscountedItems(locationId: string | null, limit?: number): DiscountedItem[] {
  const rows = menuRepository
    .getItems(locationId)
    .filter((i) => i.price !== null && i.compareAtPrice != null && i.compareAtPrice > i.price)
    .map((item) => {
      const save = (item.compareAtPrice as number) - (item.price as number);
      return {
        item,
        save,
        percent: Math.round((save / (item.compareAtPrice as number)) * 100),
      };
    })
    .sort((a, b) => b.save - a.save);
  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

export function discountCount(locationId: string | null) {
  return getDiscountedItems(locationId).length;
}
