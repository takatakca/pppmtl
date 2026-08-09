/** Production site configuration — single source of truth for absolute URLs. */
export const SITE_URL = "https://pppmtl.com";

/** Builds an absolute URL for a given site-relative path, e.g. "/menu" -> "https://pppmtl.com/menu". */
export function canonicalUrl(path: string): string {
  if (path === "/" || path === "") return `${SITE_URL}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
