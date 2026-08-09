/**
 * Canonical customer-facing business record for this PPP website.
 *
 * Single source of truth: no component may hardcode the address, phone,
 * Google identity or social URLs. Values marked `null` are NOT confirmed and
 * must render as a truthful fallback rather than an invented value.
 */

export interface GoogleProfileSnapshot {
  /** Owner-supplied Google listing values. Replace with a live sync later. */
  rating: number | null;
  reviewCount: number | null;
  priceRange: string | null;
  /** ISO date of the last verified read of the Google listing. */
  lastSyncedAt: string | null;
}

export type DayKey =
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface HoursConfig {
  /** null = weekly hours not confirmed yet. Never invent a schedule. */
  weekly: Record<DayKey, { opens: string; closes: string }[]> | null;
  specialHours: Array<{ date: string; opens: string; closes: string }> | null;
  holidayHours: Array<{ date: string; label: string; closed: boolean }> | null;
  temporaryClosure: { from: string; to: string | null; reason: string } | null;
  /** Short status string as last seen on the Google listing. */
  currentStatusNote: string | null;
}

const e164 = "+14509994999";

export const pppBusiness = {
  brandName: "PPP Pizzeria Montreal",
  locationName: "Notre Dame de Grace",
  shortLocationName: "NDG",
  displayName: "PPP Pizzeria Montreal (Notre Dame de Grace)",
  neighbourhood: "Notre-Dame-de-Grâce",

  address: {
    line1: "6280 Av. Somerled",
    city: "Montréal",
    province: "QC",
    postalCode: "H3X 2B6",
    country: "Canada",
    get oneLine() {
      return "6280 Av. Somerled, Montréal, QC H3X 2B6";
    },
  },

  phone: {
    display: "(450) 999-4999",
    e164,
    href: `tel:${e164}`,
  },

  /** Dedicated AI ordering line — null until provisioned. */
  aiOrderPhone: null as { display: string; e164: string; href: string } | null,

  website: "https://pppmtl.com/",

  google: {
    fid: "0x4cc917b87ac80faf:0x548f0d6034204d6b",
    ludocid: "6093103527698124139",
    /** Canonical Google entity for this restaurant. */
    listingUrl: "https://www.google.com/maps?cid=6093103527698124139",
    reviewsUrl: "https://www.google.com/maps?cid=6093103527698124139",
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent("PPP Pizzeria Montreal, 6280 Av. Somerled, Montréal, QC H3X 2B6"),
    embedUrl:
      "https://www.google.com/maps?q=" +
      encodeURIComponent("PPP Pizzeria Montreal, 6280 Av. Somerled, Montréal, QC H3X 2B6") +
      "&output=embed",
  },

  /** Owner-supplied listing snapshot. Sync from Google Business Profile later. */
  googleProfile: {
    rating: 4.0,
    reviewCount: 21,
    priceRange: "$10–20",
    lastSyncedAt: "2026-08-09",
  } satisfies GoogleProfileSnapshot,

  hours: {
    weekly: null,
    specialHours: null,
    holidayHours: null,
    temporaryClosure: null,
    currentStatusNote: "Closed · Opens 4 p.m.",
  } satisfies HoursConfig,

  /** Confirmed by the Google listing. */
  serviceOptions: [
    { id: "pickup", en: "Pickup", fr: "Cueillette" },
    { id: "delivery", en: "Delivery", fr: "Livraison" },
    { id: "live-music", en: "Live music", fr: "Musique live" },
    { id: "sports", en: "Sports", fr: "Sports" },
    { id: "wifi", en: "Wi-Fi", fr: "Wi-Fi" },
  ],

  social: {
    instagram: "https://www.instagram.com/ppp_pizzeria/",
    facebook: "https://www.facebook.com/pppmtl.com1",
    x: "https://x.com/pppmtlnord",
    pinterest: "https://ca.pinterest.com/pppmtl",
  },

  /**
   * Listed on Google but named for Montréal-Nord — kept as a legacy external
   * link only. NOT the canonical NDG ordering menu.
   */
  legacyExternalMenuUrl: "https://linktr.ee/pppmontrealnord",
} as const;

/**
 * Only current PPP-brand profiles. Legacy Montréal-Nord directory records are
 * deliberately excluded so NDG structured data stays unambiguous.
 */
export const businessSameAs = [pppBusiness.website, ...currentBrandSameAs];

/** Restaurant / LocalBusiness JSON-LD built only from confirmed fields. */
export function businessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: pppBusiness.displayName,
    url: pppBusiness.website,
    telephone: pppBusiness.phone.e164,
    priceRange: pppBusiness.googleProfile.priceRange ?? undefined,
    servesCuisine: ["Pizza", "Rotisserie Chicken", "Poutine"],
    address: {
      "@type": "PostalAddress",
      streetAddress: pppBusiness.address.line1,
      addressLocality: pppBusiness.address.city,
      addressRegion: pppBusiness.address.province,
      postalCode: pppBusiness.address.postalCode,
      addressCountry: "CA",
    },
    hasMap: pppBusiness.google.listingUrl,
    sameAs: businessSameAs,
    aggregateRating:
      pppBusiness.googleProfile.rating && pppBusiness.googleProfile.reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue: pppBusiness.googleProfile.rating,
            reviewCount: pppBusiness.googleProfile.reviewCount,
          }
        : undefined,
  };
}
