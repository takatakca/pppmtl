/**
 * Curated, PPP-authored "social feed" — there is no live API integration.
 * This is a typed seam: swap `getSocialPosts` for a real fetch later without
 * touching any component.
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
import type { SocialProvider } from "@/config/external-presence";

export interface SocialPost {
  id: string;
  platform: SocialProvider;
  image: string;
  captionEn: string;
  captionFr: string;
  href: string | null;
  /** `null` = brand-wide post, shown for every location. */
  locationId: string | null;
  publishedAt: string;
}

/** PPP-authored posts. Images reuse the existing menu catalog imagery. */
const socialPosts: SocialPost[] = [
  {
    id: "post-pizza-friday",
    platform: "instagram",
    image: foodPizza,
    captionEn: "Fresh out of the oven — pizza night starts here.",
    captionFr: "Fraîche sortie du four — la soirée pizza commence ici.",
    href: null,
    locationId: NDG_LOCATION_ID,
    publishedAt: "2026-07-18",
  },
  {
    id: "post-fried-chicken",
    platform: "instagram",
    image: foodChicken,
    captionEn: "Pressure-fried, always crispy, always by the piece.",
    captionFr: "Frit sous pression, toujours croustillant, toujours au morceau.",
    href: null,
    locationId: NDG_LOCATION_ID,
    publishedAt: "2026-07-10",
  },
  {
    id: "post-poutine",
    platform: "facebook",
    image: foodPoutine,
    captionEn: "Poutine weather, every day of the year.",
    captionFr: "Un temps à poutine, à longueur d'année.",
    href: null,
    locationId: null,
    publishedAt: "2026-06-30",
  },
  {
    id: "post-pita",
    platform: "tiktok",
    image: foodPita,
    captionEn: "Wrapped tight, packed with flavour.",
    captionFr: "Bien enroulé, plein de saveur.",
    href: null,
    locationId: null,
    publishedAt: "2026-06-22",
  },
  {
    id: "post-burger",
    platform: "instagram",
    image: foodBurger,
    captionEn: "The trio lineup — burger, fries, drink, done right.",
    captionFr: "La gamme de trios — burger, frites, boisson, comme il faut.",
    href: null,
    locationId: NDG_LOCATION_ID,
    publishedAt: "2026-06-08",
  },
  {
    id: "post-dessert",
    platform: "instagram",
    image: foodDessert,
    captionEn: "Save room. Always save room.",
    captionFr: "Gardez de la place. Toujours garder de la place.",
    href: null,
    locationId: null,
    publishedAt: "2026-05-27",
  },
  {
    id: "post-family-combo",
    platform: "facebook",
    image: comboBurger,
    captionEn: "Family combos built for the whole table.",
    captionFr: "Des combos familiaux pensés pour toute la table.",
    href: null,
    locationId: NDG_LOCATION_ID,
    publishedAt: "2026-05-14",
  },
  {
    id: "post-rotisserie",
    platform: "x",
    image: menuRotisserie,
    captionEn: "Slow-turned rotisserie, ready when you are.",
    captionFr: "Poulet rôti à la broche, prêt quand vous l'êtes.",
    href: null,
    locationId: null,
    publishedAt: "2026-05-02",
  },
];

/**
 * Pure selector so a future live feed can replace the array above without
 * changing call sites. Prefers posts scoped to the given location, then
 * fills with brand-wide posts, newest first.
 */
export function getSocialPosts(locationId: string | null, limit = 8): SocialPost[] {
  const sorted = [...socialPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const scoped = sorted.filter((p) => p.locationId === locationId);
  const brandWide = sorted.filter((p) => p.locationId === null);
  const merged = [...scoped, ...brandWide.filter((p) => !scoped.includes(p))];
  const seen = new Set<string>();
  const deduped = merged.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  return deduped.slice(0, limit);
}
