/**
 * PPP-owned provider-neutral menu validation and normalization.
 * Food Hub can reuse these rules without adopting a third-party schema.
 * No credentials, web requests, or changes to the published Clover catalog.
 */
import type {
  IntegrationProviderId,
  UniversalCategory,
  UniversalMenu,
  UniversalProduct,
} from "./contracts";
import { imageRepository } from "./images";
import { pppCategoryForProviderRef, pppProductForProviderRef } from "@/config/integration-menu-map";

export interface MenuValidationIssue {
  entity: "category" | "product" | "modifier";
  id: string;
  reason: string;
}

export interface MenuValidationResult {
  categories: UniversalCategory[];
  products: UniversalProduct[];
  issues: MenuValidationIssue[];
}

/** Never publish orphaned, duplicate, unavailable-to-price or invalid menu lines. */
export function validateProviderMenu(menu: UniversalMenu): MenuValidationResult {
  const issues: MenuValidationIssue[] = [];
  const categories: UniversalCategory[] = [];
  const seenCategories = new Set<string>();

  for (const category of menu.categories) {
    if (!category.id) {
      issues.push({ entity: "category", id: "(missing id)", reason: "Missing id" });
      continue;
    }
    if (!category.nameEn.trim()) {
      issues.push({ entity: "category", id: category.id, reason: "Missing name" });
      continue;
    }
    if (seenCategories.has(category.id)) {
      issues.push({ entity: "category", id: category.id, reason: "Duplicate category" });
      continue;
    }
    seenCategories.add(category.id);
    categories.push(category);
  }

  const products: UniversalProduct[] = [];
  const seenProducts = new Set<string>();
  for (const product of menu.products) {
    if (!product.id) {
      issues.push({ entity: "product", id: "(missing id)", reason: "Missing id" });
      continue;
    }
    if (seenProducts.has(product.id)) {
      issues.push({ entity: "product", id: product.id, reason: "Duplicate product" });
      continue;
    }
    if (!product.nameEn.trim()) {
      issues.push({ entity: "product", id: product.id, reason: "Missing name" });
      continue;
    }
    if (!Number.isSafeInteger(product.price) || product.price === null || product.price < 0) {
      issues.push({ entity: "product", id: product.id, reason: "Missing or invalid price" });
      continue;
    }
    if (!seenCategories.has(product.categoryId)) {
      issues.push({ entity: "product", id: product.id, reason: "Unknown category" });
      continue;
    }

    let validModifiers = true;
    for (const group of product.modifierGroups) {
      const min = group.minSelections;
      const max = group.maxSelections;
      if (
        !Number.isSafeInteger(min) ||
        !Number.isSafeInteger(max) ||
        min < 0 ||
        max < min ||
        group.choices.length === 0
      ) {
        issues.push({
          entity: "modifier",
          id: `${product.id}:${group.id}`,
          reason: "Invalid selection rules",
        });
        validModifiers = false;
        break;
      }
      if (group.required && min < 1) {
        issues.push({
          entity: "modifier",
          id: `${product.id}:${group.id}`,
          reason: "Required group with no minimum",
        });
        validModifiers = false;
        break;
      }
      if (min > group.choices.filter((choice) => choice.available).length) {
        issues.push({
          entity: "modifier",
          id: `${product.id}:${group.id}`,
          reason: "Minimum exceeds available options",
        });
        validModifiers = false;
        break;
      }
    }

    if (!validModifiers) continue;
    seenProducts.add(product.id);
    products.push(product);
  }
  return { categories, products, issues };
}

export interface NormalizedProduct extends UniversalProduct {
  pppProductId: string;
  providerProductId: string;
  pppCategoryId: string;
  displayImageUrl: string;
  displayImageSource: string;
}

export interface NormalizedMenu {
  locationId: string;
  provider: IntegrationProviderId;
  categories: Array<UniversalCategory & {
    pppCategoryId: string;
    providerCategoryId: string;
  }>;
  products: NormalizedProduct[];
  syncedAt: string;
}

/** Stable PPP IDs and approved-first imagery; no untrusted CDN hotlinking. */
export function normalizeMenu(
  menu: UniversalMenu,
  validated: MenuValidationResult,
  locationId: string,
): NormalizedMenu {
  return {
    locationId,
    provider: menu.provider,
    categories: validated.categories.map((c) => ({
      ...c,
      pppCategoryId: pppCategoryForProviderRef(c.externalId ?? c.id) ?? c.id,
      providerCategoryId: c.externalId ?? c.id,
    })),
    products: validated.products.map((p) => {
      const providerProductId = p.externalId ?? p.id;
      const image = imageRepository.resolve({
        providerUrl: p.image.url,
        altEn: p.image.altEn,
        altFr: p.image.altFr,
      });
      return {
        ...p,
        pppProductId: pppProductForProviderRef(providerProductId, locationId) ?? p.id,
        providerProductId,
        pppCategoryId: pppCategoryForProviderRef(p.categoryId) ?? p.categoryId,
        displayImageUrl: image.url,
        displayImageSource: image.source,
      };
    }),
    syncedAt: menu.syncedAt ?? new Date().toISOString(),
  };
}
