/**
 * PROVIDER <-> PPP MENU MAPPING TABLES
 *
 * Provider ids can change; PPP ids are permanent because they appear in
 * customer links, favourites, order history and SEO. So we never let a
 * provider id become the customer-facing id: we map it.
 *
 * `providerCategoryRef` / `providerProductRef` are null until a real sync has
 * supplied them. Nothing here is invented.
 */

export interface CategoryMapping {
  /** Permanent PPP category id, e.g. "cat-pizza". */
  pppCategoryId: string;
  /** Provider category ref_id. Null = not mapped yet. */
  providerCategoryRef: string | null;
  /** Provider wording, kept for operators only — never shown to customers. */
  providerLabel: string | null;
}

export interface ProductMapping {
  /** Permanent PPP product id (slug used in customer URLs). */
  pppProductId: string;
  /** Provider product ref_id. Null = not mapped yet. */
  providerProductRef: string | null;
  /** Store this mapping belongs to; null = applies to every store. */
  locationId: string | null;
}

export interface ModifierMapping {
  pppModifierId: string;
  providerModifierRef: string | null;
  /** Modifier group this option belongs to, PPP-side. */
  pppGroupId: string | null;
}

/**
 * PPP category registry with room for the provider's own naming.
 * Example: Food Hub "Fast Food" -> PPP "Combos". Operators edit the
 * provider side; the customer side never moves.
 */
export const categoryMappings: CategoryMapping[] = [
  "cat-fried-chicken",
  "cat-wings-nuggets",
  "cat-trios",
  "cat-family-combos",
  "cat-pizza",
  "cat-double-pizza",
  "cat-promo-pizza",
  "cat-subs",
  "cat-fries-poutine",
  "cat-snack-bar",
  "cat-pita-plates",
  "cat-salads",
  "cat-mexican",
  "cat-pasta",
  "cat-desserts",
  "cat-drinks",
  "cat-extras",
].map((id) => ({ pppCategoryId: id, providerCategoryRef: null, providerLabel: null }));

export const productMappings: ProductMapping[] = [];

export const modifierMappings: ModifierMapping[] = [];

/* --------------------------------------------------------------- lookups */

export function pppCategoryForProviderRef(ref: string): string | null {
  return categoryMappings.find((m) => m.providerCategoryRef === ref)?.pppCategoryId ?? null;
}

export function providerRefForPppCategory(pppCategoryId: string): string | null {
  return (
    categoryMappings.find((m) => m.pppCategoryId === pppCategoryId)?.providerCategoryRef ?? null
  );
}

export function pppProductForProviderRef(ref: string, locationId: string | null): string | null {
  const scoped = productMappings.find(
    (m) => m.providerProductRef === ref && m.locationId === locationId,
  );
  const global = productMappings.find((m) => m.providerProductRef === ref && m.locationId === null);
  return scoped?.pppProductId ?? global?.pppProductId ?? null;
}

export function providerRefForPppProduct(
  pppProductId: string,
  locationId: string | null,
): string | null {
  const scoped = productMappings.find(
    (m) => m.pppProductId === pppProductId && m.locationId === locationId,
  );
  const global = productMappings.find(
    (m) => m.pppProductId === pppProductId && m.locationId === null,
  );
  return scoped?.providerProductRef ?? global?.providerProductRef ?? null;
}

export function pppModifierForProviderRef(ref: string): string | null {
  return modifierMappings.find((m) => m.providerModifierRef === ref)?.pppModifierId ?? null;
}

export interface MappingCoverage {
  categoriesMapped: number;
  categoriesTotal: number;
  productsMapped: number;
  modifiersMapped: number;
}

export function mappingCoverage(): MappingCoverage {
  return {
    categoriesMapped: categoryMappings.filter((m) => m.providerCategoryRef).length,
    categoriesTotal: categoryMappings.length,
    productsMapped: productMappings.filter((m) => m.providerProductRef).length,
    modifiersMapped: modifierMappings.filter((m) => m.providerModifierRef).length,
  };
}
