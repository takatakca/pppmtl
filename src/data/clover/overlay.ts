/**
 * Real Clover data on the site's own items. The site keeps its ids, categories, rails, names and wording; each
 * slot gets the price, the options, the availability and the photo of the Clover item named in
 * `src/config/clover-item-map.ts`. Isomorphic (no secrets): the snapshot is the public menu.
 */
import snapshotJson from "./inventory.snapshot.json";
import { cloverPhotoIds } from "./photos.generated";
import { cloverItemMap } from "@/config/clover-item-map";
import type { GeneratedItem, ModifierGroup } from "@/data/catalog-types";
import {
  displayGroupName,
  displayName,
  groupNameEn,
  type CloverInventory,
  type CloverItem,
} from "@/lib/integration/providers/clover/catalog";

export const cloverSnapshot = snapshotJson as CloverInventory;

const itemsById = new Map(cloverSnapshot.items.map((i) => [i.id, i]));
const groupsById = new Map(cloverSnapshot.modifierGroups.map((g) => [g.id, g]));
const slotBySite = new Map(cloverItemMap.map((s) => [s.site, s]));
const photos = new Set(cloverPhotoIds);

/** The Clover item behind a site item, or undefined when the slot is not mapped. */
export function cloverItemForSite(siteItemId: string): CloverItem | undefined {
  const slot = slotBySite.get(siteItemId);
  return slot ? itemsById.get(slot.clover) : undefined;
}

export function cloverPhotoUrl(cloverItemId: string, size: 1200 | 400 = 1200): string | null {
  return photos.has(cloverItemId) ? `/menu/clover/${cloverItemId}-${size}.webp` : null;
}

const SUGGESTED = /sugg[ée]r/i;

/**
 * Clover option groups as the site's modifier groups: required ones first, suggested add-ons last, Clover's order
 * otherwise. Options Clover marks unavailable are left out.
 */
export function siteModifierGroups(cloverItemId: string): ModifierGroup[] {
  const item = itemsById.get(cloverItemId);
  if (!item) return [];
  const groups = item.modifierGroupIds.flatMap((id) => {
    const g = groupsById.get(id);
    if (!g) return [];
    const choices = g.modifiers
      .filter((m) => m.available)
      .map((m) => ({
        id: m.slug,
        labelFr: displayName(m.name),
        labelEn: displayName(m.name),
        priceDelta: m.price / 100,
      }));
    if (!choices.length) return [];
    const labelFr = displayGroupName(g.name);
    const max = Math.min(g.max, choices.length);
    const min = Math.min(g.min, max);
    return [
      { id: g.id, labelFr, labelEn: groupNameEn(labelFr), required: min > 0, min, max, choices },
    ];
  });
  const rank = (g: ModifierGroup) => (g.required ? 0 : SUGGESTED.test(g.labelFr) ? 2 : 1);
  return groups
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i)
    .map(({ g }) => g);
}

/** The old copy promised the kitchen would price the extras; Clover prices them now. */
const PRICED_BY_KITCHEN =
  /\s*(Extras are confirmed and priced by the kitchen\.|Les extras sont confirmés et facturés par la cuisine\.)/g;

export interface CloverMenuFields {
  /** Null = this site slot has no Clover item: it is shown as unavailable and cannot be ordered. */
  cloverItemId: string | null;
  isAvailable: boolean;
}

/** One site item with its Clover price, options, photo and availability. */
export function withClover<T extends GeneratedItem>(item: T): T & CloverMenuFields {
  const clover = cloverItemForSite(item.id);
  if (!clover) return { ...item, cloverItemId: null, isAvailable: false };
  return {
    ...item,
    price: clover.price / 100,
    compareAtPrice: null,
    descriptionFr: clover.description ?? item.descriptionFr.replace(PRICED_BY_KITCHEN, ""),
    descriptionEn: item.descriptionEn.replace(PRICED_BY_KITCHEN, ""),
    image: cloverPhotoUrl(clover.id) ?? item.image,
    modifierGroups: siteModifierGroups(clover.id),
    cloverItemId: clover.id,
    isAvailable: clover.available,
  };
}
