/**
 * IMAGE REPOSITORY
 *
 * Provider image URLs are never rendered directly by customer screens. PPP
 * decides what a customer sees, in this order:
 *
 *   1. PPP-owned image (our photography / art direction)   -> "ppp"
 *   2. cached provider image (once caching is wired)        -> "cached"
 *   3. provider image, only if the host is allow-listed     -> "provider"
 *   4. category fallback                                    -> "fallback"
 *
 * Nothing here performs I/O; it is a pure resolution policy so it can be
 * tested and reused on both server and client.
 */

export type ImageSource = "ppp" | "cached" | "provider" | "fallback";

export interface ResolvedImage {
  url: string;
  source: ImageSource;
  altEn: string;
  altFr: string;
}

export interface ImageResolutionInput {
  /** Image PPP owns for this product/category, if any. */
  pppUrl?: string | null;
  /** Locally cached copy of the provider image, if any. */
  cachedUrl?: string | null;
  /** Raw provider URL, treated as untrusted. */
  providerUrl?: string | null;
  altEn: string;
  altFr: string;
  /** Fallback used when nothing else is usable. */
  fallbackUrl?: string;
}

export const DEFAULT_FALLBACK_IMAGE = "/images/menu/fallback.jpg";

/** Hosts we are willing to hotlink from. Empty means: never hotlink. */
export const ALLOWED_PROVIDER_IMAGE_HOSTS: string[] = [];

export function isAllowedProviderImage(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_PROVIDER_IMAGE_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export interface ImageRepository {
  resolve(input: ImageResolutionInput): ResolvedImage;
}

export const imageRepository: ImageRepository = {
  resolve(input) {
    const alt = { altEn: input.altEn, altFr: input.altFr };
    if (input.pppUrl) return { url: input.pppUrl, source: "ppp", ...alt };
    if (input.cachedUrl) return { url: input.cachedUrl, source: "cached", ...alt };
    if (isAllowedProviderImage(input.providerUrl))
      return { url: input.providerUrl as string, source: "provider", ...alt };
    return { url: input.fallbackUrl ?? DEFAULT_FALLBACK_IMAGE, source: "fallback", ...alt };
  },
};
