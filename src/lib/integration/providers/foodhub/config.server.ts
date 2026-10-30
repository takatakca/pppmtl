/**
 * TAKATAK Food Hub connection settings. SERVER ONLY: read inside functions, never sent to the browser.
 *
 *   FOODHUB_URL                   base URL of the owner's Food Hub (e.g. https://foodhub.on2go.ca)
 *   FOODHUB_WEBSITE_ORDER_SECRET  shared server-to-server secret (Authorization: Bearer …)
 *   FOODHUB_TENANT                tenant sent on customer calls (default "pppmtl")
 *   FOODHUB_BRAND                 brand name as Food Hub's catalog spells it (default "PPP Pizzeria")
 *   FOODHUB_LOCATION_CODES        optional JSON { "<ppp slug>": "<FOOD HUB CODE>" } overriding the defaults below
 *   FOODHUB_INTERAC_ENABLED       "true" once Food Hub's Interac e-Transfer branch is deployed (fail-closed default)
 *   FOODHUB_INTERAC_FEE           Interac fee in dollars, must equal Food Hub's setting (default 5.00)
 *   FOODHUB_INTERAC_FEE_TAXABLE   "false" if Food Hub does not tax the fee (default true: GST + QST on it)
 *   FOODHUB_DELIVERY_FEE          delivery fee in dollars for Interac delivery orders; unset = pickup only
 */
import { restaurantLocations } from "@/config/locations";
import { optionalCredential } from "@/lib/integration/core/credentials.server";

export const FOODHUB_TENANT_DEFAULT = "pppmtl";
export const FOODHUB_BRAND_DEFAULT = "PPP Pizzeria";
export const INTERAC_FEE_DEFAULT_CENTS = 500;

/**
 * PPP slug -> Food Hub location code. Verified against the Food Hub catalog (foodhubca
 * data/actual/locations.json, 2026-10-29) by street address, never guessed from the slug:
 *   NDG_MAIN = 6280 Av Somerled · SAINT_LEONARD = 5839 Rue Jean-Talon E · HOCHELAGA = 3583 Rue Sainte-Catherine E.
 * Any other PPP location has no Food Hub code until the owner adds it (FOODHUB_LOCATION_CODES).
 */
export const FOODHUB_LOCATION_CODES_DEFAULT: Readonly<Record<string, string>> = {
  ndg: "NDG_MAIN",
  "saint-leonard": "SAINT_LEONARD",
  "sainte-catherine": "HOCHELAGA",
};

const CODE_SHAPE = /^[A-Z0-9_]{2,30}$/;

export function foodhubBaseUrl(): string | undefined {
  const raw = optionalCredential("FOODHUB_URL")?.trim().replace(/\/+$/, "");
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

export function foodhubSecret(): string | undefined {
  const value = optionalCredential("FOODHUB_WEBSITE_ORDER_SECRET")?.trim();
  return value && value.length >= 16 ? value : undefined;
}

/** Both the base URL and the server secret exist. Nothing else is inferred from this. */
export function foodhubConfigured(): boolean {
  return Boolean(foodhubBaseUrl() && foodhubSecret());
}

export function foodhubTenant(): string {
  return optionalCredential("FOODHUB_TENANT")?.trim() || FOODHUB_TENANT_DEFAULT;
}

export function foodhubBrandName(): string {
  return optionalCredential("FOODHUB_BRAND")?.trim() || FOODHUB_BRAND_DEFAULT;
}

/** The hostname only (for the internal screen); never the secret. */
export function foodhubHost(): string | null {
  const base = foodhubBaseUrl();
  if (!base) return null;
  try {
    return new URL(base).host;
  } catch {
    return null;
  }
}

export function foodhubLocationCodes(): Record<string, string> {
  const codes: Record<string, string> = { ...FOODHUB_LOCATION_CODES_DEFAULT };
  const raw = optionalCredential("FOODHUB_LOCATION_CODES");
  if (!raw) return codes;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [slug, code] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof code === "string" && CODE_SHAPE.test(code.trim())) codes[slug] = code.trim();
      }
    }
  } catch {
    // A malformed override never silently remaps a store: the defaults stay.
  }
  return codes;
}

/** Food Hub location code for a PPP location id (or slug), or null when none is verified. */
export function foodhubLocationCode(locationIdOrSlug: string): string | null {
  const location = restaurantLocations.find(
    (l) => l.id === locationIdOrSlug || l.slug === locationIdOrSlug,
  );
  if (!location) return null;
  return foodhubLocationCodes()[location.slug] ?? null;
}

function dollarsToCents(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = Number(raw.trim().replace(",", ".").replace(/\s|\$/g, ""));
  if (!Number.isFinite(value) || value < 0 || value > 1000) return null;
  return Math.round(value * 100);
}

/** The Interac e-Transfer fee shown to the customer (cents). Food Hub refuses the order if it differs from its own setting. */
export function interacFeeCents(): number {
  return dollarsToCents(optionalCredential("FOODHUB_INTERAC_FEE")) ?? INTERAC_FEE_DEFAULT_CENTS;
}

export function interacFeeTaxable(): boolean {
  return !/^(false|0|no|off)$/i.test(
    optionalCredential("FOODHUB_INTERAC_FEE_TAXABLE")?.trim() ?? "",
  );
}

/** Owner switch: Interac orders are POSTed only once Food Hub's Interac branch is live. */
export function interacEnabled(): boolean {
  return /^(true|1|yes|on)$/i.test(optionalCredential("FOODHUB_INTERAC_ENABLED")?.trim() ?? "");
}

/** Delivery fee for Interac delivery orders (cents), or null when the owner has not set one. */
export function foodhubDeliveryFeeCents(): number | null {
  return dollarsToCents(optionalCredential("FOODHUB_DELIVERY_FEE"));
}

export type InteracUnavailableReason =
  "not_configured" | "not_enabled" | "location_not_mapped" | "delivery_fee_unknown";

export interface InteracAvailability {
  available: boolean;
  reason: InteracUnavailableReason | null;
  locationCode: string | null;
  feeCents: number;
  feeTaxable: boolean;
  deliveryFeeCents: number | null;
}

/** Truthful answer for one store and fulfilment: why Interac is (not) offered, and the figures it would use. */
export function interacAvailability(
  locationId: string,
  orderType: "PICKUP" | "DELIVERY" | string,
): InteracAvailability {
  const base = {
    locationCode: foodhubLocationCode(locationId),
    feeCents: interacFeeCents(),
    feeTaxable: interacFeeTaxable(),
    deliveryFeeCents: foodhubDeliveryFeeCents(),
  };
  if (!foodhubConfigured()) return { ...base, available: false, reason: "not_configured" };
  if (!interacEnabled()) return { ...base, available: false, reason: "not_enabled" };
  if (!base.locationCode) return { ...base, available: false, reason: "location_not_mapped" };
  if (orderType === "DELIVERY" && base.deliveryFeeCents === null) {
    return { ...base, available: false, reason: "delivery_fee_unknown" };
  }
  return { ...base, available: true, reason: null };
}
