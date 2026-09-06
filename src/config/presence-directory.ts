/**
 * Editorial directory of every place PPP can be found online.
 *
 * Strictly derived from `external-presence.ts` and `locations.ts` — no URL,
 * rating or review text is invented here. Records tied to the old
 * Montréal-Nord / Léger identity are marked `status: "legacy"` and must never
 * be presented as current NDG truth.
 */

import { externalPresence } from "@/config/external-presence";
import { pppBusiness } from "@/config/business";
import { NDG_LOCATION_ID, restaurantLocations } from "@/config/locations";

export type PresenceCategory = "social" | "review" | "directory" | "ordering" | "legacy";
export type PresenceStatus = "active" | "legacy" | "unverified";
export type PresenceIconKey =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "x"
  | "google"
  | "yelp"
  | "tripadvisor"
  | "birdeye"
  | "resto-en-ligne"
  | "trustindex"
  | "too-good-to-go"
  | "order-online"
  | "setmore"
  | "linktree"
  | "uber-eats"
  | "doordash"
  | "skip";

export interface PresenceRecord {
  id: string;
  name: string;
  category: PresenceCategory;
  url: string | null;
  /** "brand" or a `RestaurantLocation.id`. */
  locationScope: "brand" | string;
  status: PresenceStatus;
  blurbEn: string;
  blurbFr: string;
  iconKey: PresenceIconKey;
}

const ndg = restaurantLocations.find((l) => l.id === NDG_LOCATION_ID)!;
const montrealNord = restaurantLocations.find((l) => l.id === "loc-montreal-nord")!;
const sainteCatherine = restaurantLocations.find((l) => l.id === "loc-sainte-catherine-e")!;

export const presenceDirectory: PresenceRecord[] = [
  // ---------------------------------------------------------------- social
  {
    id: "social-facebook-brand",
    name: "Facebook",
    category: "social",
    url: externalPresence.social.facebook,
    locationScope: "brand",
    status: "active",
    blurbEn: "PPP's main Facebook page — announcements, promos and kitchen updates.",
    blurbFr: "La page Facebook principale de PPP — annonces, promos et nouvelles de la cuisine.",
    iconKey: "facebook",
  },
  {
    id: "social-facebook-ndg",
    name: "Facebook — NDG",
    category: "social",
    url: externalPresence.social.facebookNdg,
    locationScope: NDG_LOCATION_ID,
    status: "active",
    blurbEn: "The Facebook page for the Notre-Dame-de-Grâce kitchen.",
    blurbFr: "La page Facebook de la cuisine de Notre-Dame-de-Grâce.",
    iconKey: "facebook",
  },
  {
    id: "social-instagram",
    name: "Instagram",
    category: "social",
    url: externalPresence.social.instagram,
    locationScope: "brand",
    status: "active",
    blurbEn: "Food photos, drops and behind-the-counter moments from PPP.",
    blurbFr: "Photos de plats, nouveautés et coulisses du comptoir PPP.",
    iconKey: "instagram",
  },
  {
    id: "social-tiktok",
    name: "TikTok",
    category: "social",
    url: externalPresence.social.tiktok,
    locationScope: "brand",
    status: "active",
    blurbEn:
      "Short clips from the PPP kitchen — historically posted under the Montréal-Nord handle.",
    blurbFr:
      "Courtes vidéos de la cuisine PPP — publiées historiquement sous le compte Montréal-Nord.",
    iconKey: "tiktok",
  },
  {
    id: "social-x",
    name: "X",
    category: "social",
    url: externalPresence.social.x,
    locationScope: "brand",
    status: "active",
    blurbEn: "Quick updates on X — historically the Montréal-Nord handle.",
    blurbFr: "Mises à jour rapides sur X — historiquement le compte Montréal-Nord.",
    iconKey: "x",
  },
  // --------------------------------------------------------------- reviews
  {
    id: "review-google",
    name: "Google",
    category: "review",
    url: pppBusiness.google.listingUrl,
    locationScope: NDG_LOCATION_ID,
    status: "active",
    blurbEn: "Read and leave a Google review for the NDG location — PPP's primary listing.",
    blurbFr: "Lisez et laissez un avis Google pour l'emplacement NDG — la fiche principale de PPP.",
    iconKey: "google",
  },
  {
    id: "review-birdeye",
    name: "Birdeye",
    category: "review",
    url: externalPresence.discovery.birdeye,
    locationScope: NDG_LOCATION_ID,
    status: "active",
    blurbEn: "An aggregated review profile for the NDG location.",
    blurbFr: "Un profil d'avis agrégés pour l'emplacement NDG.",
    iconKey: "birdeye",
  },
  {
    id: "review-yelp-legacy",
    name: "Yelp (Montréal-Nord)",
    category: "legacy",
    url: externalPresence.legacy.yelpMontrealNord,
    locationScope: "loc-montreal-nord",
    status: "legacy",
    blurbEn:
      "A historic Yelp record from the original Montréal-Nord kitchen on Rue Léger — not the current NDG listing.",
    blurbFr:
      "Une fiche Yelp historique de la cuisine d'origine à Montréal-Nord, rue Léger — pas la fiche NDG actuelle.",
    iconKey: "yelp",
  },
  {
    id: "review-trustindex-legacy",
    name: "Trustindex (Montréal-Nord)",
    category: "legacy",
    url: externalPresence.legacy.trustindexMontrealNord,
    locationScope: "loc-montreal-nord",
    status: "legacy",
    blurbEn: "A historic Trustindex review widget tied to the closed Montréal-Nord address.",
    blurbFr: "Un ancien widget d'avis Trustindex lié à l'adresse fermée de Montréal-Nord.",
    iconKey: "trustindex",
  },
  {
    id: "review-tripadvisor-legacy",
    name: "TripAdvisor (legacy)",
    category: "legacy",
    url: externalPresence.legacy.tripadvisorLegacy,
    locationScope: "loc-montreal-nord",
    status: "legacy",
    blurbEn: "A legacy TripAdvisor listing from before the Montréal-Nord kitchen closed.",
    blurbFr:
      "Une ancienne fiche TripAdvisor datant d'avant la fermeture de la cuisine de Montréal-Nord.",
    iconKey: "tripadvisor",
  },
  // ------------------------------------------------------------ directory
  {
    id: "directory-resto-en-ligne",
    name: "RestoEnLigne",
    category: "directory",
    url: externalPresence.discovery.restoEnLigne,
    locationScope: NDG_LOCATION_ID,
    status: "active",
    blurbEn: "PPP's directory entry on RestoEnLigne for the NDG location.",
    blurbFr: "La fiche de PPP sur RestoEnLigne pour l'emplacement NDG.",
    iconKey: "resto-en-ligne",
  },
  {
    id: "directory-linktree-legacy",
    name: "Linktree (Montréal-Nord)",
    category: "legacy",
    url: pppBusiness.legacyExternalMenuUrl,
    locationScope: "loc-montreal-nord",
    status: "legacy",
    blurbEn: "An older Linktree published under the Montréal-Nord name — kept for reference only.",
    blurbFr:
      "Un ancien Linktree publié sous le nom Montréal-Nord — conservé pour référence seulement.",
    iconKey: "linktree",
  },
  // ------------------------------------------------------------- ordering
  {
    id: "ordering-uber-eats",
    name: "Uber Eats",
    category: "ordering",
    url: externalPresence.ordering.uberEats,
    locationScope: NDG_LOCATION_ID,
    status: "active",
    blurbEn: "Order PPP NDG for delivery or pickup through Uber Eats.",
    blurbFr: "Commandez PPP NDG en livraison ou cueillette sur Uber Eats.",
    iconKey: "uber-eats",
  },
  {
    id: "ordering-doordash",
    name: "DoorDash",
    category: "ordering",
    url: externalPresence.ordering.doorDash,
    locationScope: NDG_LOCATION_ID,
    status: "active",
    blurbEn: "Order PPP NDG for delivery or pickup through DoorDash.",
    blurbFr: "Commandez PPP NDG en livraison ou cueillette sur DoorDash.",
    iconKey: "doordash",
  },
  {
    id: "ordering-skip",
    name: "SkipTheDishes",
    category: "ordering",
    url: externalPresence.ordering.skip,
    locationScope: NDG_LOCATION_ID,
    status: "active",
    blurbEn: "Order PPP NDG for delivery or pickup through Skip.",
    blurbFr: "Commandez PPP NDG en livraison ou cueillette sur Skip.",
    iconKey: "skip",
  },
  {
    id: "ordering-toogoodtogo-legacy",
    name: "Too Good To Go (Montréal-Nord)",
    category: "legacy",
    url: externalPresence.legacy.tooGoodToGoMontrealNord,
    locationScope: "loc-montreal-nord",
    status: "legacy",
    blurbEn:
      "A historic Too Good To Go surprise-bag listing from the closed Montréal-Nord kitchen.",
    blurbFr:
      "Une ancienne fiche de sac surprise Too Good To Go de la cuisine fermée de Montréal-Nord.",
    iconKey: "too-good-to-go",
  },
  {
    id: "ordering-order-online-legacy",
    name: "order.online (Hochelaga)",
    category: "legacy",
    url: externalPresence.legacy.orderOnlineHochelaga,
    locationScope: "loc-sainte-catherine-e",
    status: "legacy",
    blurbEn:
      "An older order.online storefront listed under the Hochelaga name, near the current Sainte-Catherine E kitchen.",
    blurbFr:
      "Une ancienne vitrine order.online publiée sous le nom Hochelaga, près de la cuisine actuelle Sainte-Catherine E.",
    iconKey: "order-online",
  },
  {
    id: "booking-setmore-legacy",
    name: "Setmore (Montréal-Nord)",
    category: "legacy",
    url: externalPresence.legacy.setmoreMontrealNord,
    locationScope: "loc-montreal-nord",
    status: "legacy",
    blurbEn: "A historic Setmore booking page tied to the original Montréal-Nord operation.",
    blurbFr:
      "Une ancienne page de réservation Setmore liée à l'exploitation d'origine de Montréal-Nord.",
    iconKey: "setmore",
  },
];

export function presenceByCategory(category: PresenceCategory) {
  return presenceDirectory.filter((p) => p.category === category);
}

export function activePresence() {
  return presenceDirectory.filter((p) => p.status !== "legacy");
}

export function legacyPresence() {
  return presenceDirectory.filter((p) => p.status === "legacy");
}

/** Records that are current AND actually have a destination to send people to. */
export function livePresence(category?: PresenceCategory) {
  return presenceDirectory.filter(
    (p) => p.status !== "legacy" && !!p.url && (!category || p.category === category),
  );
}

/** Factual counts for the page header — derived, never hardcoded. */
export function presenceCounts() {
  const live = livePresence();
  return {
    total: live.length,
    social: live.filter((p) => p.category === "social").length,
    ordering: live.filter((p) => p.category === "ordering").length,
    reviews: live.filter((p) => p.category === "review" || p.category === "directory").length,
  };
}

/** Short, human location context for a record ("NDG", "Montréal-Nord"…). */
export function presenceLocationLabel(record: PresenceRecord): string | null {
  if (record.locationScope === "brand") return null;
  return restaurantLocations.find((l) => l.id === record.locationScope)?.neighborhood ?? null;
}

export { ndg, montrealNord, sainteCatherine };
