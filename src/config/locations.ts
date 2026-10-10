/**
 * Multi-location registry for the PPP Pizzeria platform.
 *
 * Rules enforced here:
 * - `lifecycleStatus` (store lifecycle) is NOT the same as "open right now".
 *   Live open/closed is only derived when `hours.weekly` is configured.
 * - Every external destination is per-location. Global brand accounts live in
 *   `brandSocial`; a location falls back to them only when it has none.
 * - `null` means "not confirmed yet" and must render as a truthful fallback.
 *   Never invent a phone, hour, price or storefront link.
 */

import { pppBusiness } from "@/config/business";
import { externalPresence } from "@/config/external-presence";

export type LocationLifecycle = "open" | "coming_soon" | "closed" | "temporarily_closed";

export interface LocationOrdering {
  /** PPP Direct in-app ordering is available for this store. */
  direct: boolean;
  uberEats: string | null;
  doorDash: string | null;
  skip: string | null;
  tooGoodToGo: string | null;
  clover: string | null;
}

export interface LocationSocial {
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  x: string | null;
}

export interface LocationGoogle {
  listingUrl: string | null;
  reviewsUrl: string | null;
  directionsUrl: string | null;
  embedUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  lastSyncedAt: string | null;
}

export interface LocationSupport {
  /** Who the customer must contact for an order placed on each channel. */
  directPhone: string | null;
  directPhoneDisplay: string | null;
  email: string | null;
  marketplaceNote: boolean;
}

export interface RestaurantLocation {
  id: string;
  slug: string;
  displayName: string;
  neighborhood: string;
  address: string;
  city: string;
  province: string;
  postalCode: string | null;
  phone: { display: string; e164: string } | null;
  lifecycleStatus: LocationLifecycle;
  /** Short truthful note when hours are not configured. */
  statusNote: string | null;
  openingHours: Record<string, { opens: string; closes: string }[]> | null;
  specialHours: Array<{ date: string; label: string }> | null;
  google: LocationGoogle;
  social: LocationSocial;
  ordering: LocationOrdering;
  discovery: { birdeye: string | null; restoEnLigne: string | null };
  legacy: Record<string, string>;
  support: LocationSupport;
  /** "verified" = this store's menu/prices have been confirmed for display. */
  menuScope: "verified" | "not-published";
  seo: { titleEn: string; titleFr: string; descriptionEn: string; descriptionFr: string };
  storyEn: string | null;
  storyFr: string | null;
}

/** Accounts that belong to the brand, not to one storefront. */
export const brandSocial = {
  facebook: externalPresence.social.facebook,
  instagram: externalPresence.social.instagram,
  tiktok: externalPresence.social.tiktok,
  x: externalPresence.social.x,
};

function mapsFor(query: string) {
  const q = encodeURIComponent(query);
  return {
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    embedUrl: `https://www.google.com/maps?q=${q}&output=embed`,
  };
}

const emptyOrdering: LocationOrdering = {
  direct: false,
  uberEats: null,
  doorDash: null,
  skip: null,
  tooGoodToGo: null,
  clover: null,
};

const emptySocial: LocationSocial = { facebook: null, instagram: null, tiktok: null, x: null };

export const NDG_LOCATION_ID = "loc-ndg-somerled";

export const restaurantLocations: RestaurantLocation[] = [
  {
    id: NDG_LOCATION_ID,
    slug: "ndg",
    displayName: "PPP Pizzeria — Notre-Dame-de-Grâce",
    neighborhood: "Notre-Dame-de-Grâce",
    address: pppBusiness.address.line1,
    city: pppBusiness.address.city,
    province: pppBusiness.address.province,
    postalCode: pppBusiness.address.postalCode,
    phone: { display: pppBusiness.phone.display, e164: pppBusiness.phone.e164 },
    lifecycleStatus: "open",
    statusNote: pppBusiness.hours.currentStatusNote,
    openingHours: null,
    specialHours: null,
    google: {
      listingUrl: pppBusiness.google.listingUrl,
      reviewsUrl: pppBusiness.google.reviewsUrl,
      directionsUrl: pppBusiness.google.directionsUrl,
      embedUrl: pppBusiness.google.embedUrl,
      rating: pppBusiness.googleProfile.rating,
      reviewCount: pppBusiness.googleProfile.reviewCount,
      lastSyncedAt: pppBusiness.googleProfile.lastSyncedAt,
    },
    social: {
      facebook: externalPresence.social.facebookNdg,
      instagram: brandSocial.instagram,
      tiktok: brandSocial.tiktok,
      x: brandSocial.x,
    },
    ordering: {
      direct: true,
      uberEats: externalPresence.ordering.uberEats,
      doorDash: externalPresence.ordering.doorDash,
      skip: externalPresence.ordering.skip,
      tooGoodToGo: null,
      clover: null,
    },
    discovery: {
      birdeye: externalPresence.discovery.birdeye,
      restoEnLigne: externalPresence.discovery.restoEnLigne,
    },
    legacy: {},
    support: {
      directPhone: pppBusiness.phone.e164,
      directPhoneDisplay: pppBusiness.phone.display,
      email: null,
      marketplaceNote: true,
    },
    menuScope: "verified",
    seo: {
      titleEn: "PPP Pizzeria NDG — 6280 Av. Somerled, Montréal",
      titleFr: "PPP Pizzeria NDG — 6280 av. Somerled, Montréal",
      descriptionEn:
        "Order pizza, rotisserie and fried chicken, poutine and subs for pickup or delivery from PPP Pizzeria in Notre-Dame-de-Grâce.",
      descriptionFr:
        "Commandez pizza, poulet rôti et frit, poutine et sous-marins pour emporter ou en livraison chez PPP Pizzeria à Notre-Dame-de-Grâce.",
    },
    storyEn: "The flagship PPP kitchen and the store the whole menu is built around.",
    storyFr: "La cuisine phare de PPP, celle autour de laquelle tout le menu est bâti.",
  },
  {
    id: "loc-sainte-catherine-e",
    slug: "sainte-catherine",
    displayName: "PPP Pizzeria — Sainte-Catherine E",
    neighborhood: "Hochelaga",
    address: "3583 Rue Sainte-Catherine E",
    city: "Montréal",
    province: "QC",
    postalCode: "H1W 2E6",
    phone: null,
    lifecycleStatus: "open",
    statusNote: null,
    openingHours: null,
    specialHours: null,
    google: {
      listingUrl: null,
      reviewsUrl: null,
      ...mapsFor("PPP Pizzeria, 3583 Rue Sainte-Catherine E, Montréal, QC H1W 2E6"),
      rating: null,
      reviewCount: null,
      lastSyncedAt: null,
    },
    social: emptySocial,
    ordering: emptyOrdering,
    discovery: { birdeye: null, restoEnLigne: null },
    legacy: { orderOnlineHochelaga: externalPresence.legacy.orderOnlineHochelaga },
    support: {
      directPhone: null,
      directPhoneDisplay: null,
      email: null,
      marketplaceNote: false,
    },
    menuScope: "not-published",
    seo: {
      titleEn: "PPP Pizzeria Sainte-Catherine E — Montréal",
      titleFr: "PPP Pizzeria Sainte-Catherine E — Montréal",
      descriptionEn:
        "PPP Pizzeria on Rue Sainte-Catherine E in Montréal. Store details, directions and how to order.",
      descriptionFr:
        "PPP Pizzeria rue Sainte-Catherine E à Montréal. Coordonnées, itinéraire et façons de commander.",
    },
    storyEn: "PPP's second operating kitchen, east of downtown on Sainte-Catherine.",
    storyFr: "La deuxième cuisine de PPP, à l'est du centre-ville sur Sainte-Catherine.",
  },
  {
    id: "loc-montreal-nord",
    slug: "montreal-nord",
    displayName: "PPP Pizzeria — Montréal-Nord",
    neighborhood: "Montréal-Nord",
    address: "6241 Rue Léger",
    city: "Montréal",
    province: "QC",
    postalCode: null,
    phone: null,
    lifecycleStatus: "closed",
    statusNote: null,
    openingHours: null,
    specialHours: null,
    google: {
      listingUrl: null,
      reviewsUrl: null,
      directionsUrl: null,
      embedUrl: null,
      rating: null,
      reviewCount: null,
      lastSyncedAt: null,
    },
    social: emptySocial,
    ordering: emptyOrdering,
    discovery: { birdeye: null, restoEnLigne: null },
    legacy: {
      yelp: externalPresence.legacy.yelpMontrealNord,
      trustindex: externalPresence.legacy.trustindexMontrealNord,
      tripadvisor: externalPresence.legacy.tripadvisorLegacy,
      tooGoodToGo: externalPresence.legacy.tooGoodToGoMontrealNord,
      setmore: externalPresence.legacy.setmoreMontrealNord,
      linktree: pppBusiness.legacyExternalMenuUrl,
    },
    support: { directPhone: null, directPhoneDisplay: null, email: null, marketplaceNote: false },
    menuScope: "not-published",
    seo: {
      titleEn: "PPP Pizzeria Montréal-Nord — Closed Location",
      titleFr: "PPP Pizzeria Montréal-Nord — Emplacement fermé",
      descriptionEn:
        "The original PPP Pizzeria in Montréal-Nord is closed. Find the PPP kitchens serving Montréal today.",
      descriptionFr:
        "Le PPP Pizzeria d'origine à Montréal-Nord est fermé. Trouvez les cuisines PPP qui servent Montréal aujourd'hui.",
    },
    storyEn: "Where PPP started. This kitchen is closed, but the recipes moved with us.",
    storyFr: "Là où PPP a commencé. Cette cuisine est fermée, mais les recettes nous ont suivis.",
  },
  {
    id: "loc-saint-leonard",
    slug: "saint-leonard",
    displayName: "PPP Pizzeria — Saint-Léonard",
    neighborhood: "Saint-Léonard",
    address: "5839 Rue Jean-Talon E",
    city: "Saint-Léonard",
    province: "QC",
    postalCode: "H1S 1M4",
    phone: null,
    lifecycleStatus: "coming_soon",
    statusNote: null,
    openingHours: null,
    specialHours: null,
    google: {
      listingUrl: null,
      reviewsUrl: null,
      ...mapsFor("5839 Rue Jean-Talon E, Saint-Léonard, QC H1S 1M4"),
      rating: null,
      reviewCount: null,
      lastSyncedAt: null,
    },
    social: emptySocial,
    ordering: emptyOrdering,
    discovery: { birdeye: null, restoEnLigne: null },
    legacy: {},
    support: { directPhone: null, directPhoneDisplay: null, email: null, marketplaceNote: false },
    menuScope: "not-published",
    seo: {
      titleEn: "PPP Pizzeria Saint-Léonard — Coming Soon",
      titleFr: "PPP Pizzeria Saint-Léonard — Bientôt ouvert",
      descriptionEn:
        "PPP Pizzeria is coming to Jean-Talon E in Saint-Léonard. Get opening updates.",
      descriptionFr:
        "PPP Pizzeria arrive sur Jean-Talon E à Saint-Léonard. Recevez les nouvelles d'ouverture.",
    },
    storyEn: null,
    storyFr: null,
  },
  {
    id: "loc-chambly",
    slug: "chambly",
    displayName: "PPP Pizzeria — Chambly",
    neighborhood: "Chambly",
    address: "616 Rue Saint-Pierre",
    city: "Chambly",
    province: "QC",
    postalCode: "J3L 1L9",
    phone: null,
    lifecycleStatus: "coming_soon",
    statusNote: null,
    openingHours: null,
    specialHours: null,
    google: {
      listingUrl: null,
      reviewsUrl: null,
      ...mapsFor("616 Rue Saint-Pierre, Chambly, QC J3L 1L9"),
      rating: null,
      reviewCount: null,
      lastSyncedAt: null,
    },
    social: emptySocial,
    ordering: emptyOrdering,
    discovery: { birdeye: null, restoEnLigne: null },
    legacy: {},
    support: { directPhone: null, directPhoneDisplay: null, email: null, marketplaceNote: false },
    menuScope: "not-published",
    seo: {
      titleEn: "PPP Pizzeria Chambly — Coming Soon",
      titleFr: "PPP Pizzeria Chambly — Bientôt ouvert",
      descriptionEn: "PPP Pizzeria is coming to Rue Saint-Pierre in Chambly. Get opening updates.",
      descriptionFr:
        "PPP Pizzeria arrive rue Saint-Pierre à Chambly. Recevez les nouvelles d'ouverture.",
    },
    storyEn: null,
    storyFr: null,
  },
  {
    id: "loc-brossard",
    slug: "brossard",
    displayName: "PPP Pizzeria — Brossard",
    neighborhood: "Brossard",
    address: "Bd Taschereau",
    city: "Brossard",
    province: "QC",
    postalCode: "J4Y 1A4",
    phone: null,
    lifecycleStatus: "coming_soon",
    statusNote: null,
    openingHours: null,
    specialHours: null,
    google: {
      listingUrl: null,
      reviewsUrl: null,
      ...mapsFor("Bd Taschereau, Brossard, QC J4Y 1A4"),
      rating: null,
      reviewCount: null,
      lastSyncedAt: null,
    },
    social: emptySocial,
    ordering: emptyOrdering,
    discovery: { birdeye: null, restoEnLigne: null },
    legacy: {},
    support: { directPhone: null, directPhoneDisplay: null, email: null, marketplaceNote: false },
    menuScope: "not-published",
    seo: {
      titleEn: "PPP Pizzeria Brossard — Coming Soon",
      titleFr: "PPP Pizzeria Brossard — Bientôt ouvert",
      descriptionEn: "PPP Pizzeria is coming to Bd Taschereau in Brossard. Get opening updates.",
      descriptionFr:
        "PPP Pizzeria arrive sur le boul. Taschereau à Brossard. Recevez les nouvelles d'ouverture.",
    },
    storyEn: null,
    storyFr: null,
  },
];

export const openLocations = restaurantLocations.filter((l) => l.lifecycleStatus === "open");
export const comingSoonLocations = restaurantLocations.filter(
  (l) => l.lifecycleStatus === "coming_soon",
);
export const pastLocations = restaurantLocations.filter(
  (l) => l.lifecycleStatus === "closed" || l.lifecycleStatus === "temporarily_closed",
);

export function locationBySlug(slug: string) {
  return restaurantLocations.find((l) => l.slug === slug);
}

export function locationById(id: string) {
  return restaurantLocations.find((l) => l.id === id);
}

/** Only OPEN stores with PPP Direct enabled can start an in-app order. */
export function canOrder(loc: RestaurantLocation) {
  return loc.lifecycleStatus === "open" && loc.ordering.direct;
}

export function locationSocial(loc: RestaurantLocation) {
  return {
    facebook: loc.social.facebook ?? brandSocial.facebook,
    instagram: loc.social.instagram ?? brandSocial.instagram,
    tiktok: loc.social.tiktok ?? brandSocial.tiktok,
    x: loc.social.x ?? brandSocial.x,
  };
}

export const defaultLocation = restaurantLocations[0]!;
