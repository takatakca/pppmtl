/**
 * URBANPIPER MENU SYNCHRONISATION ENGINE — SERVER ONLY
 *
 * Pipeline:
 *   authenticate -> retrieve -> transform -> validate -> store
 *
 * Nothing is connected yet: with no credentials and no provider store id, the
 * engine reports `not_configured` and records a FAILED sync event. It never
 * fabricates a menu and never publishes a partially broken one.
 *
 * The customer website never imports this file. It reads the PPP menu
 * repository, which is why UrbanPiper stays invisible to customers.
 */

import type {
  IntegrationResult,
  UniversalCategory,
  UniversalMenu,
  UniversalProduct,
} from "@/lib/integration/core/contracts";
import { notConfigured } from "@/lib/integration/core/contracts";
import { imageRepository } from "@/lib/integration/core/images";
import {
  completeMenuSync,
  startMenuSync,
  type MenuSyncEvent,
} from "@/lib/integration/core/menu-sync-log";
import { mappingForLocation } from "@/config/integration-locations";
import { pppCategoryForProviderRef, pppProductForProviderRef } from "@/config/integration-menu-map";
import { urbanPiperMenuAdapter, urbanPiperMenuConfigured } from "./menu";

const NOT_CONNECTED_EN =
  "UrbanPiper menu sync is not connected for this store yet. The verified in-house catalog is live.";

/* ------------------------------------------------------------- validation */

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

/**
 * Reject anything that would render a broken menu: missing name, missing or
 * negative price, impossible modifier bounds, duplicate ids, orphan category.
 */
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
    if (product.price === null || product.price < 0) {
      issues.push({ entity: "product", id: product.id, reason: "Missing or invalid price" });
      continue;
    }
    if (!seenCategories.has(product.categoryId)) {
      issues.push({ entity: "product", id: product.id, reason: "Unknown category" });
      continue;
    }

    let modifiersOk = true;
    for (const group of product.modifierGroups) {
      const min = group.minSelections;
      const max = group.maxSelections;
      if (min < 0 || max < min || group.choices.length === 0) {
        issues.push({
          entity: "modifier",
          id: `${product.id}:${group.id}`,
          reason: "Invalid selection rules",
        });
        modifiersOk = false;
        break;
      }
      if (group.required && min < 1) {
        issues.push({
          entity: "modifier",
          id: `${product.id}:${group.id}`,
          reason: "Required group with no minimum",
        });
        modifiersOk = false;
        break;
      }
      if (min > group.choices.filter((c) => c.available).length) {
        issues.push({
          entity: "modifier",
          id: `${product.id}:${group.id}`,
          reason: "Minimum exceeds available options",
        });
        modifiersOk = false;
        break;
      }
    }
    if (!modifiersOk) continue;

    seenProducts.add(product.id);
    products.push(product);
  }

  return { categories, products, issues };
}

/* ------------------------------------------------------------ normalising */

export interface NormalizedProduct extends UniversalProduct {
  /** Permanent PPP id when a mapping exists, otherwise the provider ref. */
  pppProductId: string;
  /** Always retained for future order submission. */
  providerProductId: string;
  pppCategoryId: string;
  displayImageUrl: string;
  displayImageSource: string;
}

export interface NormalizedMenu {
  locationId: string;
  provider: "urbanpiper";
  categories: Array<UniversalCategory & { pppCategoryId: string; providerCategoryId: string }>;
  products: NormalizedProduct[];
  syncedAt: string;
}

/** Provider shapes -> PPP shapes, with stable ids and PPP-controlled images. */
export function normalizeMenu(
  menu: UniversalMenu,
  validated: MenuValidationResult,
  locationId: string,
): NormalizedMenu {
  return {
    locationId,
    provider: "urbanpiper",
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

/* ----------------------------------------------------------------- engine */

export interface MenuSyncOutcome {
  event: MenuSyncEvent;
  menu: NormalizedMenu | null;
}

/**
 * Run one synchronisation for one store. Every store syncs independently:
 * availability, products and pricing can differ per location.
 */
export async function syncLocationMenu(
  locationId: string,
): Promise<IntegrationResult<MenuSyncOutcome>> {
  const event = startMenuSync("urbanpiper", locationId);

  const mapping = mappingForLocation(locationId);
  if (!mapping) {
    completeMenuSync(event, { status: "FAILED", errors: ["Unknown PPP location"] });
    return { ok: false, code: "invalid_request", message: "Unknown PPP location" };
  }

  if (!urbanPiperMenuConfigured(locationId)) {
    completeMenuSync(event, {
      status: "FAILED",
      errors: ["Provider credentials or store id not set"],
    });
    return notConfigured(NOT_CONNECTED_EN);
  }

  const fetched = await urbanPiperMenuAdapter.fetchMenu(locationId);
  if (!fetched.ok) {
    completeMenuSync(event, { status: "FAILED", errors: [fetched.message] });
    return fetched;
  }

  const validated = validateProviderMenu(fetched.data);
  const normalized = normalizeMenu(fetched.data, validated, locationId);

  completeMenuSync(event, {
    status: "SUCCESS",
    categoriesReceived: fetched.data.categories.length,
    productsReceived: fetched.data.products.length,
    itemsUpdated: normalized.products.length,
    itemsRejected: validated.issues.filter((i) => i.entity === "product").length,
    errors: validated.issues.map((i) => `${i.entity} ${i.id}: ${i.reason}`).slice(0, 20),
  });

  return { ok: true, data: { event, menu: normalized } };
}

/** Sync every mapped store; unmapped stores fail fast and stay on the local catalog. */
export async function syncAllLocationMenus(locationIds: string[]) {
  const results = [];
  for (const id of locationIds) {
    results.push({ locationId: id, result: await syncLocationMenu(id) });
  }
  return results;
}
