import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  DEFAULT_BRAND_ID,
  KITCHENS,
  getBrand,
  liveLinks,
  orderLinkUrl,
  PLATFORM_NAMES,
  type Brand,
  type BrandId,
  type BrandRail,
  type Kitchen,
  type OrderLink,
} from "@/config/brands";
import { itemForClover } from "@/lib/brand/facts";
import type { MenuItem } from "@/data/menu";

export { itemForClover };
import { orderingChannels, type OrderingChannelConfig } from "@/config/external-presence";

const BrandContext = createContext<Brand>(getBrand(DEFAULT_BRAND_ID));

/** The brand picked by the domain (root route `beforeLoad`), for every component below. */
export function BrandProvider({ brandId, children }: { brandId: BrandId; children: ReactNode }) {
  const brand = useMemo(() => getBrand(brandId), [brandId]);
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): Brand {
  return useContext(BrandContext);
}

/** PPP keeps its own home page and links; every other brand uses the franchise front. */
export function useIsPPP(): boolean {
  return useBrand().id === DEFAULT_BRAND_ID;
}

export function railItems(rail: BrandRail): MenuItem[] {
  return rail.items.map(itemForClover).filter((i): i is MenuItem => i !== null);
}

/** The brand's own dishes, rail by rail. */
export function useBrandRails(): Array<{ rail: BrandRail; items: MenuItem[] }> {
  const brand = useBrand();
  return useMemo(() => brand.menu.map((rail) => ({ rail, items: railItems(rail) })), [brand]);
}

export interface BrandKitchenView {
  kitchen: Kitchen;
  links: Array<{ link: OrderLink; name: string; url: string }>;
}

/** The brand's kitchens with their live store links in the visitor's language. */
export function brandKitchens(brand: Brand, lang: "en" | "fr" | "es"): BrandKitchenView[] {
  return brand.kitchens.map(({ kitchen }) => ({
    kitchen: KITCHENS[kitchen],
    links: liveLinks(brand, kitchen).map((link) => ({
      link,
      name: PLATFORM_NAMES[link.platform],
      url: orderLinkUrl(link, lang),
    })),
  }));
}

const PLATFORM_TO_CHANNEL = { ubereats: "uber_eats", doordash: "doordash", skip: "skip" } as const;

/**
 * Delivery-app buttons for the order sheet and the mobile menu: PPP's own channels on PPP, the brand's live
 * store pages elsewhere (first kitchen that has one per app).
 */
export function useOrderingChannels(lang: "en" | "fr" | "es"): OrderingChannelConfig[] {
  const brand = useBrand();
  return useMemo(() => {
    if (brand.id === DEFAULT_BRAND_ID) return orderingChannels;
    const seen = new Set<string>();
    const out: OrderingChannelConfig[] = [];
    for (const { kitchen } of brand.kitchens) {
      for (const link of liveLinks(brand, kitchen)) {
        const id = PLATFORM_TO_CHANNEL[link.platform];
        if (seen.has(id)) continue;
        seen.add(id);
        const base = orderingChannels.find((c) => c.id === id);
        out.push({
          id,
          name: PLATFORM_NAMES[link.platform],
          orderingUrl: orderLinkUrl(link, lang),
          supportUrl: base?.supportUrl ?? "",
          trackingUrl: base?.trackingUrl ?? "",
          logo: base?.logo ?? null,
          labelEn: `Order on ${PLATFORM_NAMES[link.platform]}`,
          labelFr: `Commander sur ${PLATFORM_NAMES[link.platform]}`,
        });
      }
    }
    return out;
  }, [brand, lang]);
}
