// AUTO-GENERATED from the published PPP NDG storefront (Po Poulet NDG, store 27982486).
// These are merchandising *placements*, not products: every id below also lives in
// exactly one real category in `catalog.generated.ts`.

/** Items the storefront surfaces in its "Most Ordered" rail, in source order. */
export const mostOrderedItemIds: string[] = [
  "3-mcx-frites-sauce-salade-de-chou-pepsi",
  "4-mcx-frites-sauce-salade-de-chou-pepsi",
  "sous-marin-steak",
  "10-mcx-frites-sauce-pepsi",
  "trio-2-cheeseburger-6-ailes-de-poulet-boisson-gazeus",
  "sous-marin-tacos",
  "poutine-classique",
  "trio-5-burger-poulet-6-ailes-de-poulet-boisson-gazeu",
  "assiette-mixte-shish-taouk-shawarma",
  "poutine-shish-taouk",
  "quesadillas-buf",
  "pita-wrap-viande-tacos",
];

/** Items in the storefront's "Featured Items" rail — the NDG store publishes none. */
export const featuredItemIds: string[] = [];

/**
 * Counts declared by the storefront itself, per category header
 * ("Pizza · 13 items"). Used by the reconciliation audit as the source of truth
 * that extraction is complete — never edit to make a total look better.
 */
export const declaredCategoryCounts: Record<string, number> = {
  "cat-fried-chicken": 4,
  "cat-wings-nuggets": 4,
  "cat-trios": 18,
  "cat-family-combos": 3,
  "cat-pizza": 13,
  "cat-double-pizza": 3,
  "cat-promo-pizza": 19,
  "cat-subs": 8,
  "cat-fries-poutine": 13,
  "cat-snack-bar": 16,
  "cat-pita-plates": 16,
  "cat-salads": 8,
  "cat-mexican": 17,
  "cat-pasta": 3,
  "cat-desserts": 15,
  "cat-drinks": 10,
  "cat-extras": 5,
};

/** Storefront identity the catalog was extracted from. Nothing else is merged in. */
export const sourceStorefront = {
  name: "Po Poulet NDG",
  address: "6284 Av Somerled, Montréal, QC",
  storeSlug: "po-poulet-ndg-montréal-27982486",
  url: "https://www.doordash.com/en-CA/store/po-poulet-ndg-montr%C3%A9al-27982486/110185563/",
  note: "A separate 'PPP Pizzeria' storefront is indexed publicly with overlapping products and different prices. No item from it is imported.",
} as const;
