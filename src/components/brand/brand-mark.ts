import type { Brand, BrandIcon } from "@/config/brands";

/**
 * Text-logo mark of a franchise brand (no artwork exists yet for these brands): a rounded square in the brand
 * colour with a simple food glyph. One SVG string, used for the header/footer logo and as the favicon.
 * PPP keeps its own artwork (public/brand/ppp-pizzeria-logo.png).
 */
const GLYPHS: Record<BrandIcon, (accent: string, primary: string) => string> = {
  egg: (a) =>
    `<path d="M7 5.5c3-3.2 9.4-2.2 11.2 1.8 1.8 3.4.7 7.3-2.4 9.3-3.2 2.6-9 2.6-11-.4-2.4-3-1.6-7.8 2.2-10.7z" fill="#fff"/><circle cx="12" cy="11.2" r="3.5" fill="${a}"/>`,
  burger: (a) =>
    `<path d="M4 11a8 6.2 0 0 1 16 0z" fill="#fff"/><rect x="3.4" y="12.4" width="17.2" height="2.8" rx="1.4" fill="${a}"/><path d="M4 16.6h16v.9a2.6 2.6 0 0 1-2.6 2.6H6.6A2.6 2.6 0 0 1 4 17.5z" fill="#fff"/>`,
  crepe: (a) => `<path d="M3 18.5 12 4l9 14.5z" fill="#fff"/><path d="M6.3 16.4c3.4-2.2 8-2.2 11.4 0" stroke="${a}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  pita: (a) =>
    `<path d="M3 14.5a9 9 0 0 1 18 0z" fill="#fff"/><path d="M6 14c.8-2.2 2-2.6 3-.6s2-2.2 3-.2 2-2.2 3-.2 2-1.6 3 .9" stroke="${a}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  skewer: (a) =>
    `<path d="M4 20 20 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="8.5" cy="15.5" r="2.6" fill="#fff"/><circle cx="12" cy="12" r="2.6" fill="${a}"/><circle cx="15.5" cy="8.5" r="2.6" fill="#fff"/>`,
  shake: (a) =>
    `<path d="M7 9.4h10l-1.4 10.6H8.4z" fill="#fff"/><rect x="5.8" y="7.2" width="12.4" height="2.4" rx="1.1" fill="${a}"/><path d="M12.6 7.2 14.8 3h2.4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  cake: (a) =>
    `<path d="M3.5 18.5 20.5 11v7.5z" fill="#fff"/><path d="M3.5 15.8 20.5 8.3v2.7L3.5 18.5z" fill="${a}"/><circle cx="17.5" cy="6.4" r="1.7" fill="${a}"/>`,
  taco: (a) =>
    `<path d="M2.5 18a9.5 9.5 0 0 1 19 0z" fill="#fff"/><path d="M5.2 12.4c1-1.6 2-1.6 3 0s2 1.6 3 0 2-1.6 3 0 2 1.6 3 0" stroke="${a}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`,
  pizza: (a, p) =>
    `<path d="M12 21 3.6 5.8a17 17 0 0 1 16.8 0z" fill="#fff"/><path d="M3.6 5.8a17 17 0 0 1 16.8 0l-1 1.9a15 15 0 0 0-14.8 0z" fill="${a}"/><circle cx="10" cy="10.5" r="1.5" fill="${p}"/><circle cx="14" cy="12" r="1.3" fill="${p}"/><circle cx="12" cy="15.5" r="1.2" fill="${p}"/>`,
  cone: (a) => `<path d="M8 11.4h8L12 21z" fill="${a}"/><circle cx="12" cy="8.6" r="4.6" fill="#fff"/>`,
  drumstick: (a) =>
    `<path d="M15 3.4a5.8 5.8 0 0 1 3.1 9.6c-1.6 1.6-3.6 1.6-5.2.8l-2.1 2.1a2 2 0 1 1-2.5 2.5 2 2 0 1 1-2.5-2.5 2 2 0 1 1 2.5-2.5l2.1-2.1c-.8-1.6-.8-3.6.8-5.2A5.8 5.8 0 0 1 15 3.4z" fill="#fff"/><circle cx="15.2" cy="8.8" r="1.5" fill="${a}"/>`,
  cup: (a) =>
    `<path d="M4.5 9.2h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="#fff"/><path d="M15.5 10.6H17a2.6 2.6 0 0 1 0 5.2h-1.5" stroke="#fff" stroke-width="1.6" fill="none"/><path d="M8 3.6c1 1-1 2 0 3.2M11.6 3.6c1 1-1 2 0 3.2" stroke="${a}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  flame: (a) =>
    `<path d="M12 2.8c1 4.2 6 6 6 11.2a6 6 0 0 1-12 0c0-3 2-4.2 2-7.2 2 1 3 3 3 5 1-2.1 1-6 1-9z" fill="#fff"/><path d="M12 13c1.2 1.6 2.6 2.6 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.6 1.1-2.2 2.6-4.6z" fill="${a}"/>`,
};

export function brandMarkSvg(brand: Brand, size = 64): string {
  const glyph = GLYPHS[brand.icon](brand.accent || "#ffffff", brand.primary || "#000000");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="${escapeAttr(brand.name)}">` +
    `<rect width="32" height="32" rx="7" fill="${brand.primary}"/>` +
    `<g transform="translate(4 4)">${glyph}</g></svg>`
  );
}

/** The mark as a data: URL (favicon, apple-touch-icon fallback). */
export function brandMarkDataUrl(brand: Brand): string {
  return `data:image/svg+xml,${encodeURIComponent(brandMarkSvg(brand))}`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
