import { beforeEach, describe, expect, it } from "vitest";
import {
  normalizeMenu,
  syncLocationMenu,
  validateProviderMenu,
} from "@/lib/integration/providers/urbanpiper/menu-sync";
import {
  imageRepository,
  isAllowedProviderImage,
  DEFAULT_FALLBACK_IMAGE,
} from "@/lib/integration/core/images";
import {
  lastMenuSyncFor,
  recentMenuSyncEvents,
  resetMenuSyncLogForTests,
} from "@/lib/integration/core/menu-sync-log";
import {
  mappingCoverage,
  pppCategoryForProviderRef,
  pppProductForProviderRef,
  categoryMappings,
} from "@/config/integration-menu-map";
import { restaurantLocations } from "@/config/locations";
import type { UniversalMenu, UniversalProduct } from "@/lib/integration/core/contracts";

const category = (id: string, name = "Pizza") => ({
  id,
  externalId: id,
  slug: id,
  nameEn: name,
  nameFr: name,
  descriptionEn: "",
  descriptionFr: "",
  image: { url: null, altEn: name, altFr: name },
  sortOrder: 0,
  available: true,
});

const product = (over: Partial<UniversalProduct> = {}): UniversalProduct => ({
  id: "itm-1",
  externalId: "itm-1",
  categoryId: "cat-1",
  nameEn: "Large Pepperoni",
  nameFr: "Grande pepperoni",
  descriptionEn: "",
  descriptionFr: "",
  image: { url: null, altEn: "Large Pepperoni", altFr: "Grande pepperoni" },
  price: 1899,
  compareAtPrice: null,
  modifierGroups: [],
  available: true,
  ...over,
});

const menuOf = (products: UniversalProduct[]): UniversalMenu => ({
  locationId: "loc",
  provider: "urbanpiper",
  categories: [category("cat-1")],
  products,
  syncedAt: "2026-01-01T00:00:00.000Z",
});

describe("menu validation", () => {
  it("accepts a clean product", () => {
    const r = validateProviderMenu(menuOf([product()]));
    expect(r.products).toHaveLength(1);
    expect(r.issues).toHaveLength(0);
  });

  it("rejects a product with no price", () => {
    const r = validateProviderMenu(menuOf([product({ price: null })]));
    expect(r.products).toHaveLength(0);
    expect(r.issues[0]?.reason).toMatch(/price/i);
  });

  it("rejects a product with no name", () => {
    const r = validateProviderMenu(menuOf([product({ nameEn: "  " })]));
    expect(r.products).toHaveLength(0);
    expect(r.issues[0]?.reason).toBe("Missing name");
  });

  it("rejects duplicate products", () => {
    const r = validateProviderMenu(menuOf([product(), product()]));
    expect(r.products).toHaveLength(1);
    expect(r.issues[0]?.reason).toBe("Duplicate product");
  });

  it("rejects an orphan product whose category was not received", () => {
    const r = validateProviderMenu(menuOf([product({ categoryId: "cat-missing" })]));
    expect(r.issues[0]?.reason).toBe("Unknown category");
  });

  it("rejects impossible modifier rules", () => {
    const r = validateProviderMenu(
      menuOf([
        product({
          modifierGroups: [
            {
              id: "g1",
              externalId: "g1",
              nameEn: "Size",
              nameFr: "Format",
              required: true,
              minSelections: 2,
              maxSelections: 1,
              choices: [
                {
                  id: "o1",
                  externalId: "o1",
                  nameEn: "Large",
                  nameFr: "Grande",
                  priceDelta: 0,
                  available: true,
                  isDefault: true,
                },
              ],
            },
          ],
        }),
      ]),
    );
    expect(r.products).toHaveLength(0);
    expect(r.issues[0]?.entity).toBe("modifier");
  });

  it("keeps a valid required modifier group", () => {
    const r = validateProviderMenu(
      menuOf([
        product({
          modifierGroups: [
            {
              id: "g1",
              externalId: "g1",
              nameEn: "Crust",
              nameFr: "Croûte",
              required: true,
              minSelections: 1,
              maxSelections: 1,
              choices: [
                {
                  id: "o1",
                  externalId: "o1",
                  nameEn: "Thin",
                  nameFr: "Mince",
                  priceDelta: 100,
                  available: true,
                  isDefault: true,
                },
              ],
            },
          ],
        }),
      ]),
    );
    expect(r.products).toHaveLength(1);
  });
});

describe("normalisation and mapping", () => {
  it("retains the provider product id for future order submission", () => {
    const menu = menuOf([product()]);
    const n = normalizeMenu(menu, validateProviderMenu(menu), "ppp-ndg");
    expect(n.products[0]?.providerProductId).toBe("itm-1");
    expect(n.products[0]?.pppProductId).toBe("itm-1");
  });

  it("falls back to the provider ref when no PPP mapping exists", () => {
    expect(pppCategoryForProviderRef("fast-food")).toBeNull();
    expect(pppProductForProviderRef("itm-1", "ppp-ndg")).toBeNull();
  });

  it("starts with every PPP category unmapped and none invented", () => {
    const coverage = mappingCoverage();
    expect(coverage.categoriesTotal).toBe(categoryMappings.length);
    expect(coverage.categoriesMapped).toBe(0);
    expect(coverage.productsMapped).toBe(0);
  });
});

describe("image strategy", () => {
  it("never hotlinks an unknown provider host", () => {
    expect(isAllowedProviderImage("https://cdn.example.com/a.jpg")).toBe(false);
    expect(isAllowedProviderImage("http://cdn.example.com/a.jpg")).toBe(false);
    expect(isAllowedProviderImage(null)).toBe(false);
  });

  it("prefers PPP art direction, then cache, then fallback", () => {
    expect(
      imageRepository.resolve({ pppUrl: "/ppp.jpg", cachedUrl: "/c.jpg", altEn: "a", altFr: "a" })
        .source,
    ).toBe("ppp");
    expect(imageRepository.resolve({ cachedUrl: "/c.jpg", altEn: "a", altFr: "a" }).source).toBe(
      "cached",
    );
    const fallback = imageRepository.resolve({
      providerUrl: "https://cdn.example.com/a.jpg",
      altEn: "a",
      altFr: "a",
    });
    expect(fallback.source).toBe("fallback");
    expect(fallback.url).toBe(DEFAULT_FALLBACK_IMAGE);
  });
});

describe("location sync", () => {
  beforeEach(() => resetMenuSyncLogForTests());

  it("records a FAILED event and reports not connected for every store", async () => {
    const id = restaurantLocations[0]!.id;
    const result = await syncLocationMenu(id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
    expect(lastMenuSyncFor(id)?.status).toBe("FAILED");
  });

  it("rejects an unknown location", async () => {
    const result = await syncLocationMenu("not-a-store");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_request");
  });

  it("logs one event per sync attempt, per location", async () => {
    await syncLocationMenu(restaurantLocations[0]!.id);
    await syncLocationMenu(restaurantLocations[1]!.id);
    expect(recentMenuSyncEvents().length).toBe(2);
  });
});
