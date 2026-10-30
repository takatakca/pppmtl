/**
 * Real Clover data on the site's own items. The site keeps its ids, categories, rails, names and wording; each
 * slot gets the price, the options, the availability and the photo of the Clover item named in
 * `src/config/clover-item-map.ts`. Isomorphic (no secrets): the snapshot is the public menu.
 */
import snapshotJson from "./inventory.snapshot.json";
import { cloverPhotoIds } from "./photos.generated";
import { cloverItemMap } from "@/config/clover-item-map";
import type { GeneratedItem, ModifierGroup } from "@/data/catalog-types";
import type {
  CloverInventory,
  CloverItem,
  CloverModifier,
} from "@/lib/integration/providers/clover/catalog";
import { siteGroupsFor } from "@/lib/integration/providers/clover/site-groups";

export const cloverSnapshot = snapshotJson as CloverInventory;

const itemsById = new Map(cloverSnapshot.items.map((i) => [i.id, i]));
const slotBySite = new Map(cloverItemMap.map((s) => [s.site, s]));
const photos = new Set(cloverPhotoIds);

/** The Clover item id a site item is sold as, or undefined when the slot is not mapped. */
export function cloverSlotFor(siteItemId: string): string | undefined {
  return slotBySite.get(siteItemId)?.clover;
}

/** The Clover item behind a site item, or undefined when the slot is not mapped. */
export function cloverItemForSite(siteItemId: string): CloverItem | undefined {
  const id = cloverSlotFor(siteItemId);
  return id ? itemsById.get(id) : undefined;
}

export function cloverPhotoUrl(cloverItemId: string, size: 1200 | 400 = 1200): string | null {
  return photos.has(cloverItemId) ? `/menu/clover/${cloverItemId}-${size}.webp` : null;
}

/** The item's Clover option groups, as the site shows them (see site-groups.ts). */
export function siteModifierGroups(cloverItemId: string): ModifierGroup[] {
  return siteGroupsFor(cloverSnapshot, cloverItemId);
}

const modifiersByGroup = new Map(cloverSnapshot.modifierGroups.map((g) => [g.id, g.modifiers]));

/**
 * The Clover modifier behind a site choice: the site's group id IS the Clover group id and its choice id is the
 * modifier's slug (site-groups.ts). Gives the Clover id and name another engine (Food Hub) re-prices the option by.
 */
export function cloverModifierFor(groupId: string, choiceId: string): CloverModifier | undefined {
  return modifiersByGroup.get(groupId)?.find((m) => m.slug === choiceId);
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
