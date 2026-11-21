/**
 * MontrealHub phone app API (`/api/mobile/v1/*`, mobile/ in this repository).
 *
 * The app is a real native app (React Native), not the website in a box, so it reads the menu as JSON and places
 * orders through the SAME order service as the checkout page: the server prices every line again from Clover, the
 * phone only sends ids, quantities, options and the tip. Nothing here grants more than the website does:
 *
 * - The phone has no browser cookie. Each placed order returns a receipt token: the same HMAC-signed grant as the
 *   website's `ppp_order_access` cookie (order-access.server.ts), for that one order. The app keeps it in the phone's
 *   secure storage and sends it back to read or cancel that order. No token, no order.
 * - The checkout dedup scope (the website's `ppp_checkout_nonce` cookie) is a random id the app makes once per
 *   install (`X-MontrealHub-Device`), so two phones placing the same cart never share an order.
 * - Payment by card happens on Clover's own page, opened in the phone's browser; it returns to the app
 *   (public/app-return.html → montrealhub://order/<id>).
 */
import { menuRepository } from "@/lib/menu-repository";
import {
  BRANDS,
  GROUP_PHONE,
  KITCHENS,
  PLATFORM_NAMES,
  brandPhone,
  liveLinks,
  orderLinkUrl,
  type Brand,
} from "@/config/brands";
import { itemForClover, kitchenAddress } from "@/lib/brand/facts";
import { brandMarkSvg } from "@/components/brand/brand-mark";
import {
  DELIVERY_FEE_CENTS,
  DELIVERY_FSAS,
  DELIVERY_LOCATION_SLUGS,
  RESTAURANT_COORDS,
  websiteDeliveryAt,
} from "@/config/delivery";
import { DEFAULT_TIP_PERCENT, MAX_TIP_CENTS, QUEBEC_TAX_RATES, TIP_PERCENTS } from "@/lib/pricing";
import { restaurantLocations } from "@/config/locations";
import type { MenuItem } from "@/data/menu";
import type { OrderError } from "@/lib/orders/errors";
import type { InternalOrder } from "@/lib/orders/types";

export const MOBILE_API_VERSION = 1;
const ORDER_ID = /^ord_[A-Za-z0-9_-]{5,80}$/;
const DEVICE_ID = /^[a-f0-9]{64}$/;
const MAX_TOKENS_PER_CALL = 30;

function abs(origin: string, path: string): string {
  if (!path) return "";
  return /^https?:\/\//.test(path) ? path : `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** The 400 px photo for lists; the 1200 px one stays for the dish page. */
function thumbOf(src: string): string {
  return src.replace(/-1200\.webp$/, "-400.webp");
}

export interface MobileItem {
  id: string;
  categoryId: string;
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  /** CAD dollars, as on the website menu (the server prices the order again from Clover). */
  price: number | null;
  compareAtPrice: number | null;
  image: string;
  thumb: string;
  badges: MenuItem["badges"];
  /** False when the item has no Clover item behind it: it cannot be added to the cart. */
  orderable: boolean;
  modifierGroups: NonNullable<MenuItem["modifierGroups"]>;
  search: string;
}

function toMobileItem(item: MenuItem, origin: string): MobileItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: { en: item.nameEn, fr: item.nameFr },
    description: { en: item.descriptionEn, fr: item.descriptionFr },
    price: item.price,
    compareAtPrice: item.compareAtPrice ?? null,
    image: abs(origin, item.image),
    thumb: abs(origin, thumbOf(item.image)),
    badges: item.badges,
    orderable: item.isAvailable && item.price !== null && item.cloverItemId !== null,
    modifierGroups: item.modifierGroups ?? [],
    search: [item.nameEn, item.nameFr, ...item.aliasesEn, ...item.aliasesFr]
      .join(" ")
      .toLowerCase(),
  };
}

function brandView(brand: Brand, origin: string) {
  const phone = brandPhone(brand);
  return {
    id: brand.id,
    name: brand.name,
    domain: brand.domain,
    url: `https://${brand.domain}`,
    icon: brand.icon,
    // PPP keeps its own artwork; the other brands use their text-logo mark (the same SVG the website shows).
    logo: brand.id === "ppp" ? abs(origin, "/brand/ppp-pizzeria-logo.png") : null,
    markSvg: brand.id === "ppp" ? null : brandMarkSvg(brand),
    colors: {
      primary: brand.primary || "#d61f1f",
      accent: brand.accent || "#ffc93c",
      accent2: brand.accent2 || "#ff7a1a",
    },
    cuisine: brand.cuisine,
    hook: brand.hook,
    description: brand.description,
    phone,
    heroItemIds: brand.heroItems
      .map((id) => itemForClover(id)?.id)
      .filter((id): id is string => Boolean(id)),
    rails: brand.menu.map((rail) => ({
      title: rail.title,
      itemIds: rail.items
        .map((id) => itemForClover(id)?.id)
        .filter((id): id is string => Boolean(id)),
      // Dishes not in Clover yet: shown with their real price, ordered by phone or on the delivery apps.
      extras: (rail.extras ?? []).map((x) => ({
        id: x.id,
        name: { en: x.nameEn, fr: x.nameFr },
        sizes: x.sizes.map((s) => ({ label: { en: s.labelEn, fr: s.labelFr }, price: s.price })),
      })),
    })),
    kitchens: brand.kitchens.map((k) => ({
      kitchen: k.kitchen,
      links: liveLinks(brand, k.kitchen).map((link) => ({
        platform: link.platform,
        name: PLATFORM_NAMES[link.platform],
        url: { en: orderLinkUrl(link, "en"), fr: orderLinkUrl(link, "fr") },
      })),
      mapsUrl: k.googleCid ? `https://www.google.com/maps?cid=${k.googleCid}` : null,
    })),
  };
}

/** Everything the app shows: menu, restaurants, kitchens and checkout rules. Public data only. */
export function mobileCatalog(
  origin: string,
  flags: { onlineOrdering: boolean; interac: boolean },
) {
  const items = menuRepository
    .getItems(null)
    .filter((i) => i.isAvailable)
    .map((i) => toMobileItem(i, origin));
  const known = new Set(items.map((i) => i.id));
  const categories = menuRepository
    .getCategories(null)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: { en: c.nameEn, fr: c.nameFr },
      description: { en: c.descriptionEn, fr: c.descriptionFr },
      image: abs(origin, c.image),
      sortOrder: c.sortOrder,
      count: items.filter((i) => i.categoryId === c.id).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const locations = menuRepository.getLocations().map((l) => {
    const config = restaurantLocations.find((r) => r.id === l.id);
    return {
      id: l.id,
      slug: l.slug,
      kitchen: "ndg" as const,
      name: l.name,
      address: `${l.address}, ${l.city}, ${l.province} ${l.postalCode ?? ""}`.trim(),
      phone: l.phone,
      delivery: websiteDeliveryAt(l.id),
      // The kitchen's map point (only NDG is mapped today); null elsewhere.
      coords: websiteDeliveryAt(l.id) ? RESTAURANT_COORDS : null,
      mapsUrl: config?.google?.directionsUrl ?? config?.google?.listingUrl ?? null,
      rating: config?.google?.rating ?? null,
      marketplaces: [
        { id: "ubereats", name: "Uber Eats", url: l.links.uberEatsUrl },
        { id: "doordash", name: "DoorDash", url: l.links.doorDashUrl },
        { id: "skip", name: "SkipTheDishes", url: l.links.skipUrl },
      ].filter((m): m is { id: string; name: string; url: string } => Boolean(m.url)),
    };
  });
  return {
    version: MOBILE_API_VERSION,
    generatedAt: new Date().toISOString(),
    site: origin,
    phone: GROUP_PHONE,
    categories,
    items,
    popularItemIds: menuRepository
      .getPopularItems(null, 12)
      .map((i) => i.id)
      .filter((id) => known.has(id)),
    offers: menuRepository.getOffers(null).map((o) => ({
      id: o.id,
      title: { en: o.titleEn, fr: o.titleFr },
      description: { en: o.descriptionEn, fr: o.descriptionFr },
      image: abs(origin, o.image),
      price: o.price,
      compareAtPrice: o.compareAtPrice ?? null,
    })),
    locations,
    kitchens: Object.values(KITCHENS).map((k) => ({
      id: k.id,
      label: { en: k.labelEn, fr: k.labelFr },
      area: k.area,
      address: kitchenAddress(k),
      hours: k.hours,
    })),
    brands: [...BRANDS]
      .sort((a, b) =>
        a.id === "ppp" ? -1 : b.id === "ppp" ? 1 : a.name.localeCompare(b.name, "fr"),
      )
      .map((b) => brandView(b, origin))
      .map((b) => ({
        ...b,
        heroItemIds: b.heroItemIds.filter((id) => known.has(id)),
        // A dish that is sold out or hidden on the website is hidden in the app too.
        rails: b.rails.map((r) => ({ ...r, itemIds: r.itemIds.filter((id) => known.has(id)) })),
      })),
    checkout: {
      onlineOrdering: flags.onlineOrdering,
      card: flags.onlineOrdering,
      interac: flags.onlineOrdering && flags.interac,
      deliveryFeeCents: DELIVERY_FEE_CENTS,
      deliveryLocationSlugs: DELIVERY_LOCATION_SLUGS,
      deliveryAreas: DELIVERY_FSAS,
      taxRates: QUEBEC_TAX_RATES,
      tipPercents: [...TIP_PERCENTS],
      defaultTipPercent: DEFAULT_TIP_PERCENT,
      maxTipCents: MAX_TIP_CENTS,
    },
    legal: {
      privacy: abs(origin, "/privacy.html"),
      dataDeletion: abs(origin, "/data-deletion.html"),
      help: abs(origin, "/help"),
    },
  };
}

/** One random id per app install, used like the website's checkout cookie. */
export function deviceScope(header: string | null): string | null {
  const value = (header ?? "").trim().toLowerCase();
  return DEVICE_ID.test(value) ? `app:${value}` : null;
}

export interface ReceiptRef {
  id: string;
  token: string;
}

/** `[{ id, token }]` from untrusted JSON: well-formed ids and bounded tokens only. */
export function parseReceipts(input: unknown): ReceiptRef[] {
  const list =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as { orders?: unknown }).orders
      : null;
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_TOKENS_PER_CALL)
    .filter(
      (r): r is ReceiptRef =>
        !!r &&
        typeof r === "object" &&
        typeof (r as ReceiptRef).id === "string" &&
        ORDER_ID.test((r as ReceiptRef).id) &&
        typeof (r as ReceiptRef).token === "string" &&
        (r as ReceiptRef).token.length <= 4096,
    );
}

/** True when this receipt token (signed grant) covers this order id. */
export function receiptAllows(
  ref: ReceiptRef,
  key: string | null,
  verify: (token: string, key: string) => string[],
): boolean {
  return Boolean(key) && verify(ref.token, key as string).includes(ref.id);
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function errorBody(error: OrderError | null) {
  return { ok: false as const, order: null, token: null, error };
}

/** The public origin of this request (the brand domain the app talks to). */
export function requestOrigin(request: Request): string {
  try {
    const url = new URL(request.url);
    const host = request.headers.get("x-forwarded-host") ?? url.host;
    const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    return `${proto === "http" && !/^(localhost|127\.)/.test(host) ? "https" : proto}://${host}`;
  } catch {
    return "https://pppmtl.com";
  }
}

export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const text = await request.text().catch(() => "");
  if (!text || text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export type { InternalOrder };
