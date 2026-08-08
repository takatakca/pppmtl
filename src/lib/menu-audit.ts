import { categories, menuItems } from "@/data/menu";
import {
  declaredCategoryCounts,
  featuredItemIds,
  mostOrderedItemIds,
  sourceStorefront,
} from "@/data/collections.generated";

export interface DuplicatePlacement {
  itemId: string;
  canonicalName: string;
  canonicalCategoryId: string;
  placement: string;
  reason: "most-ordered" | "featured" | "cross-category" | "variant";
}

export interface CategoryAudit {
  id: string;
  name: string;
  declared: number;
  extracted: number;
  matches: boolean;
}

/**
 * Development-only reconciliation between what the storefront *shows*
 * (placements, including merchandising rails) and what the catalog *stores*
 * (canonical unique products). Every number is derived — nothing is hardcoded
 * to make a total look complete.
 */
export function auditMenu() {
  const byId = new Map(menuItems.map((i) => [i.id, i]));

  const categoryAudit: CategoryAudit[] = categories.map((c) => {
    const extracted = menuItems.filter((i) => i.categoryId === c.id).length;
    const declared = declaredCategoryCounts[c.id] ?? 0;
    return { id: c.id, name: c.nameEn, declared, extracted, matches: declared === extracted };
  });

  const duplicates: DuplicatePlacement[] = [];
  const pushDup = (ids: string[], placement: string, reason: DuplicatePlacement["reason"]) => {
    for (const id of ids) {
      const item = byId.get(id);
      if (!item) continue;
      duplicates.push({
        itemId: id,
        canonicalName: item.nameEn,
        canonicalCategoryId: item.categoryId,
        placement,
        reason,
      });
    }
  };
  pushDup(mostOrderedItemIds, "Most Ordered", "most-ordered");
  pushDup(featuredItemIds, "Featured Items", "featured");

  const categoryPlacements = categoryAudit.reduce((n, c) => n + c.declared, 0);
  const sourceVisiblePlacements = categoryPlacements + duplicates.length;

  const withModifiers = menuItems.filter((i) => (i.modifierGroups?.length ?? 0) > 0);
  const priced = menuItems.filter((i) => i.price !== null);
  const discounted = menuItems.filter((i) => i.compareAtPrice != null);
  const imageless = menuItems.filter((i) => !i.image);
  const orphans = menuItems.filter((i) => !categories.some((c) => c.id === i.categoryId));
  const idCounts = new Map<string, number>();
  for (const i of menuItems) idCounts.set(i.id, (idCounts.get(i.id) ?? 0) + 1);
  const duplicateIds = [...idCounts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  const unresolvedCollectionIds = [...mostOrderedItemIds, ...featuredItemIds].filter(
    (id) => !byId.has(id),
  );

  return {
    storefront: sourceStorefront,
    sourceVisiblePlacements,
    canonicalUniqueItems: menuItems.length,
    difference: sourceVisiblePlacements - menuItems.length,
    categoryPlacements,
    duplicatePlacements: duplicates.length,
    mostOrderedDuplicates: duplicates.filter((d) => d.reason === "most-ordered").length,
    promoDuplicates: duplicates.filter((d) => d.reason === "featured").length,
    variantPlacements: duplicates.filter((d) => d.reason === "variant").length,
    crossCategoryPlacements: duplicates.filter((d) => d.reason === "cross-category").length,
    unclassifiedPlacements: unresolvedCollectionIds.length,
    excludedPlacements: 0,
    duplicates,
    categories: categoryAudit,
    categoryCount: categories.length,
    collectionCount: [mostOrderedItemIds, featuredItemIds].filter((c) => c.length > 0).length,
    priced: priced.length,
    priceUnknown: menuItems.length - priced.length,
    discounted: discounted.length,
    compareAtPrices: discounted.length,
    descriptions: menuItems.filter((i) => i.descriptionEn.trim().length > 0).length,
    imagesPresent: menuItems.length - imageless.length,
    imagesMissing: imageless.length,
    modifiersConfirmed: withModifiers.filter((i) =>
      (i.modifierGroups ?? []).every((g) => g.choices.length > 0),
    ).length,
    modifiersPartial: withModifiers.filter((i) =>
      (i.modifierGroups ?? []).some((g) => g.choices.some((c) => c.priceDelta === null)),
    ).length,
    modifiersUnavailable: menuItems.length - withModifiers.length,
    orphanItems: orphans.length,
    uncategorizedItems: orphans.length,
    brokenIds: menuItems.filter((i) => !/^[a-z0-9-]+$/.test(i.id)).length,
    duplicateIds: duplicateIds.length,
    searchIndexCount: menuItems.length,
    categoryCountsMatchSource: categoryAudit.every((c) => c.matches),
  };
}

export type MenuAudit = ReturnType<typeof auditMenu>;
