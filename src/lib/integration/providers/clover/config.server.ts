/**
 * Clover connection settings. SERVER ONLY: values are read inside functions and never sent to the browser.
 *
 *   CLOVER_MERCHANT_ID        the restaurant's Clover merchant id
 *   CLOVER_ECOMM_PRIVATE_KEY  private key of an Ecommerce API token of type "Hosted Checkout" (payments)
 *   CLOVER_WEBHOOK_SECRET     Hosted Checkout webhook signing secret
 *   CLOVER_API_TOKEN          REST token (live menu, then title + print of paid orders); optional but advised
 *   CLOVER_ENV                "sandbox" for Clover's test environment, else production
 */
import { mappingForLocation } from "@/config/integration-locations";
import { ordersPersistAcrossRestarts } from "@/lib/orders/order-store.server";
import { SITE_URL } from "@/config/site";
import { DEFAULT_BRAND_ID } from "@/config/brands";
import { currentBrandId, currentIsPreview, currentOrigin } from "@/lib/brand/current";
import { optionalCredential } from "@/lib/integration/core/credentials.server";
import { QUEBEC_TAX_RATES, type CloverTaxRate } from "./checkout";

export function cloverEnvironment(): "sandbox" | "production" {
  return /^(sandbox|dev|test)/i.test(optionalCredential("CLOVER_ENV") ?? "")
    ? "sandbox"
    : "production";
}

/** REST API (inventory, orders, payments, print). North America: api.clover.com. */
export function cloverRestBaseUrl(): string {
  return cloverEnvironment() === "sandbox"
    ? "https://sandbox.dev.clover.com"
    : "https://api.clover.com";
}

/** Hosted Checkout service (Clover's docs name apisandbox.dev.clover.com for the sandbox). */
export function cloverCheckoutBaseUrl(): string {
  return cloverEnvironment() === "sandbox"
    ? "https://apisandbox.dev.clover.com"
    : "https://api.clover.com";
}

export function cloverMerchantId(): string | undefined {
  return optionalCredential("CLOVER_MERCHANT_ID");
}

export function cloverRestToken(): string | undefined {
  return optionalCredential("CLOVER_API_TOKEN") ?? optionalCredential("CLOVER_API_KEY");
}

export function cloverCheckoutKey(): string | undefined {
  return optionalCredential("CLOVER_ECOMM_PRIVATE_KEY");
}

export function cloverWebhookSecret(): string | undefined {
  return optionalCredential("CLOVER_WEBHOOK_SECRET");
}

/** True when this store's orders go to Clover (config/integration-locations.ts). */
export function cloverServesLocation(locationId: string): boolean {
  return mappingForLocation(locationId)?.orderingProvider === "clover";
}

/** Online payment through Clover can start: the store uses Clover and the Hosted Checkout key exists. */
export function cloverCheckoutConfigured(locationId: string): boolean {
  // A redirect to real payment cannot be made safe by a signed return URL alone.
  // The current in-memory order store loses payment reconciliation on process restart.
  if (
    process.env["NODE_ENV"] === "production" &&
    cloverEnvironment() === "production" &&
    !ordersPersistAcrossRestarts
  ) {
    return false;
  }
  return (
    cloverServesLocation(locationId) &&
    Boolean(cloverMerchantId() && cloverCheckoutKey() && cloverWebhookSecret())
  );
}

export function siteBaseUrl(): string {
  return (optionalCredential("PUBLIC_SITE_URL") ?? SITE_URL).replace(/\/+$/, "");
}

export function printWebOrders(): boolean {
  return !/^(off|false|0|no)$/i.test(optionalCredential("CLOVER_PRINT_WEB_ORDERS") ?? "");
}

/** CLOVER_TAX_RATES when set and valid; else null (the merchant's own default rates are read, then Québec's). */
export function cloverTaxRatesFromEnv(): CloverTaxRate[] | null {
  const raw = optionalCredential("CLOVER_TAX_RATES");
  if (!raw) return null;
  try {
    const rows = JSON.parse(raw) as unknown;
    if (!Array.isArray(rows)) return null;
    const rates = rows.flatMap((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const name = typeof o["name"] === "string" ? o["name"].trim() : "";
      const rate = Number(o["rate"]);
      return name && Number.isFinite(rate) && rate > 0
        ? [
            {
              name,
              rate: Math.round(rate),
              ...(typeof o["id"] === "string" ? { id: o["id"] } : {}),
            },
          ]
        : [];
    });
    return rates.length ? rates : null;
  } catch {
    return null;
  }
}

export const DEFAULT_TAX_RATES = QUEBEC_TAX_RATES;

/** Non-secret readiness for the internal integrations screen and the docs. */
export function cloverReadiness(locationId: string) {
  return {
    servesLocation: cloverServesLocation(locationId),
    environment: cloverEnvironment(),
    merchantIdSet: Boolean(cloverMerchantId()),
    checkoutKeySet: Boolean(cloverCheckoutKey()),
    webhookSecretSet: Boolean(cloverWebhookSecret()),
    restTokenSet: Boolean(cloverRestToken()),
    durableOrderStore: ordersPersistAcrossRestarts,
    checkoutReady: cloverCheckoutConfigured(locationId),
  };
}
