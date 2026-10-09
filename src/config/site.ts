import { currentOrigin } from "@/lib/brand/current";

/** PPP's own address (the default brand). Other brands: `src/config/brands.ts`. */
export const SITE_URL = "https://pppmtl.com";

/**
 * Absolute URL on the site the visitor is on: the brand picked by the domain (`src/config/brands.ts`), e.g.
 * "/menu" -> "https://pppmtl.com/menu" on pppmtl.com, "https://ooeuf.ca/menu" on ooeuf.ca.
 */
export function canonicalUrl(path: string): string {
  const origin = currentOrigin();
  if (path === "/" || path === "") return `${origin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}
