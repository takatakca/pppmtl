import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  brandOrigin,
  getBrand,
  isPreviewHost,
  resolveBrandId,
  type Brand,
  type BrandId,
} from "@/config/brands";

/**
 * The host the visitor typed: on the server from the request (a proxy such as Coolify's sends X-Forwarded-Host),
 * in the browser from the address bar. Same answer on both sides, so the page hydrates without a mismatch.
 */
export const currentHost = createIsomorphicFn()
  .server((): string => {
    try {
      const forwarded = getRequestHeader("x-forwarded-host")?.split(",")[0]?.trim();
      return forwarded || getRequestHeader("host") || "";
    } catch {
      // Outside a request (build, tests): the default brand.
      return "";
    }
  })
  .client((): string => window.location.host);

export function currentBrandId(): BrandId {
  return resolveBrandId(currentHost());
}

export function currentBrand(): Brand {
  return getBrand(currentBrandId());
}

/**
 * Absolute origin for canonical links, the sitemap and payment return links. Always the brand's own domain
 * (never the raw Host header), except on preview hosts, where links must stay on the preview.
 */
export function currentOrigin(): string {
  const host = currentHost();
  const brand = getBrand(resolveBrandId(host));
  if (isPreviewHost(host) && host) {
    // preview.<domain> has a certificate; sslip.io and localhost previews are plain http.
    return `${host.startsWith("preview.") ? "https" : "http"}://${host}`;
  }
  return brandOrigin(brand);
}

export function currentIsPreview(): boolean {
  return isPreviewHost(currentHost());
}
