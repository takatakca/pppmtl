/**
 * Social content model for the homepage "Fresh from PPP" band.
 *
 * Today every post is `curated`/`ppp` — content written and photographed by
 * PPP itself, never presented as a real Instagram/Facebook/TikTok post. The
 * `SocialFeedRepository` seam below is shaped so a real platform adapter
 * (Instagram/Facebook/TikTok) can be plugged in later without touching any
 * component. There is no network call here.
 */

import foodPizza from "@/assets/food-pizza.jpg";
import foodChicken from "@/assets/food-chicken.jpg";
import foodPoutine from "@/assets/food-poutine.jpg";
import foodPita from "@/assets/food-pita.jpg";
import foodBurger from "@/assets/food-burger.jpg";
import foodDessert from "@/assets/food-dessert.jpg";
import comboBurger from "@/assets/combo-burger.jpg";
import menuRotisserie from "@/assets/menu-rotisserie.jpg";
import { NDG_LOCATION_ID } from "@/config/locations";

/** Where a post's content actually came from. */
export type SocialSource = "curated" | "instagram" | "facebook" | "tiktok";

/**
 * `ppp` = authored by PPP for this site (must be labelled "From PPP" and
 * never wear a platform badge). `platform` = a real post pulled from a
 * third-party platform (only valid once a live adapter is wired up).
 */
export type SocialProvenance = "ppp" | "platform";

export interface SocialPost {
  id: string;
  source: SocialSource;
  provenance: SocialProvenance;
  image: string;
  captionEn: string;
  captionFr: string;
  /** Real destination only. `null` means the card renders as non-clickable. */
  href: string | null;
  /** `null` = brand-wide post, shown for every location. */
  locationId: string | null;
  publishedAt: string;
}

/**
 * PPP-authored cards. Images reuse the existing menu catalog imagery.
 * `href: null` because there is no real per-post destination to link to —
 * the cards intentionally render as non-clickable.
 */
const curatedPosts: SocialPost[] = [
  {
    id: "post-pizza-friday",
    source: "curated",
    provenance: "ppp",
    image: foodPizza,
    captionEn: "Fresh out of the oven — pizza night starts here.",
    captionFr: "Fraîche sortie du four — la soirée pizza commence ici.",
    href: null,
    locationId: NDG_LOCATION_ID,
    publishedAt: "2026-07-18",
  },
  {
    id: "post-fried-chicken",
    source: "curated",
    provenance: "ppp",
    image: foodChicken,
    captionEn: "Pressure-fried, always crispy, always by the piece.",
    captionFr: "Frit sous pression, toujours croustillant, toujours au morceau.",
    href: null,
    locationId: NDG_LOCATION_ID,
    publishedAt: "2026-07-10",
  },
  {
    id: "post-poutine",
    source: "curated",
    provenance: "ppp",
    image: foodPoutine,
    captionEn: "Poutine weather, every day of the year.",
    captionFr: "Un temps à poutine, à longueur d'année.",
    href: null,
    locationId: null,
    publishedAt: "2026-06-30",
  },
  {
    id: "post-pita",
    source: "curated",
    provenance: "ppp",
    image: foodPita,
    captionEn: "Wrapped tight, packed with flavour.",
    captionFr: "Bien enroulé, plein de saveur.",
    href: null,
    locationId: null,
    publishedAt: "2026-06-22",
  },
  {
    id: "post-burger",
    source: "curated",
    provenance: "ppp",
    image: foodBurger,
    captionEn: "The trio lineup — burger, fries, drink, done right.",
    captionFr: "La gamme de trios — burger, frites, boisson, comme il faut.",
    href: null,
    locationId: NDG_LOCATION_ID,
    publishedAt: "2026-06-08",
  },
  {
    id: "post-dessert",
    source: "curated",
    provenance: "ppp",
    image: foodDessert,
    captionEn: "Save room. Always save room.",
    captionFr: "Gardez de la place. Toujours garder de la place.",
    href: null,
    locationId: null,
    publishedAt: "2026-05-27",
  },
  {
    id: "post-family-combo",
    source: "curated",
    provenance: "ppp",
    image: comboBurger,
    captionEn: "Family combos built for the whole table.",
    captionFr: "Des combos familiaux pensés pour toute la table.",
    href: null,
    locationId: NDG_LOCATION_ID,
    publishedAt: "2026-05-14",
  },
  {
    id: "post-rotisserie",
    source: "curated",
    provenance: "ppp",
    image: menuRotisserie,
    captionEn: "Slow-turned rotisserie, ready when you are.",
    captionFr: "Poulet rôti à la broche, prêt quand vous l'êtes.",
    href: null,
    locationId: null,
    publishedAt: "2026-05-02",
  },
];

/**
 * A source of social posts. `CuratedSocialFeedRepository` is the only
 * implementation today. Future platform adapters (Instagram/Facebook/TikTok)
 * can implement the same interface — fetching real posts over the network —
 * and be swapped in without touching any component.
 */
export interface SocialFeedRepository {
  getPosts(locationId: string | null, limit?: number): SocialPost[];
}

class CuratedSocialFeedRepository implements SocialFeedRepository {
  constructor(private readonly posts: SocialPost[]) {}

  getPosts(locationId: string | null, limit = 8): SocialPost[] {
    const sorted = [...this.posts].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    const scoped = sorted.filter((p) => p.locationId === locationId);
    const brandWide = sorted.filter((p) => p.locationId === null);
    const merged = [...scoped, ...brandWide.filter((p) => !scoped.includes(p))];
    const seen = new Set<string>();
    const deduped = merged.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    return deduped.slice(0, limit);
  }
}

/** Active repository. Swap this instance for a live one once available. */
export const socialFeedRepository: SocialFeedRepository = new CuratedSocialFeedRepository(
  curatedPosts,
);

/** Convenience wrapper kept for existing call sites. */
export function getSocialPosts(locationId: string | null, limit = 8): SocialPost[] {
  return socialFeedRepository.getPosts(locationId, limit);
}
