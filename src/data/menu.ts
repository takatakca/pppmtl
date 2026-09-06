import foodPizza from "@/assets/food-pizza.jpg";
import foodChicken from "@/assets/food-chicken.jpg";
import foodPoutine from "@/assets/food-poutine.jpg";
import foodPita from "@/assets/food-pita.jpg";
import foodBurger from "@/assets/food-burger.jpg";
import foodDessert from "@/assets/food-dessert.jpg";
import comboPita from "@/assets/combo-pita.jpg";
import comboBurger from "@/assets/combo-burger.jpg";
import menuRotisserie from "@/assets/menu-rotisserie.jpg";

import { pppBusiness } from "@/config/business";
import { externalPresence } from "@/config/external-presence";
import { generatedCategories, generatedItems } from "@/data/catalog.generated";
import { mostOrderedItemIds } from "@/data/collections.generated";
import type { ModifierChoice, ModifierGroup } from "@/data/catalog-types";

export type { ModifierChoice, ModifierGroup };

export type { Lang } from "@/i18n/types";
export type OrderMode = "pickup" | "delivery";

export interface MenuCategory {
  id: string;
  slug: string;
  nameEn: string;
  nameFr: string;
  /** Optional Spanish name. Absent = the English name is shown. */
  nameEs?: string;
  descriptionEn: string;
  descriptionFr: string;
  /** Optional Spanish description. Absent = the English description is shown. */
  descriptionEs?: string;
  aliasesEn: string[];
  aliasesFr: string[];
  /** Optional Spanish search aliases; trilingual synonyms also come from food-terms. */
  aliasesEs?: string[];
  image: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  nameEn: string;
  nameFr: string;
  /** Optional Spanish name. Absent = the English name is shown. */
  nameEs?: string;
  descriptionEn: string;
  descriptionFr: string;
  /** Optional Spanish description. Absent = the English description is shown. */
  descriptionEs?: string;
  aliasesEn: string[];
  aliasesFr: string[];
  /** Optional Spanish search aliases; trilingual synonyms also come from food-terms. */
  aliasesEs?: string[];
  image: string;
  /** CAD. null when pricing is configured per location and not confirmed here. */
  price: number | null;
  /** Struck-through reference price when a configured promo is active. */
  compareAtPrice?: number | null;
  isAvailable: boolean;
  badges: Array<"popular" | "new" | "deal">;
  locationIds: string[];
  /**
   * Choice groups published by the restaurant. Price deltas are intentionally
   * `null`: the published menu never states them, so the UI must not invent one.
   */
  modifierGroups?: ModifierGroup[];
}

export interface Offer {
  id: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  /** Optional Spanish description. Absent = the English description is shown. */
  descriptionEs?: string;
  image: string;
  price: number | null;
  compareAtPrice?: number | null;
  locationIds: string[];
  modes: OrderMode[];
  startsAt: string | null;
  endsAt: string | null;
}

export interface Location {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string | null;
  phone: string | null;
  /** null when hours are not confirmed for this location. */
  hours: string | null;
  services: string[];
  channels: Array<{ id: string; label: string; kind: "direct" | "marketplace" | "surplus" }>;
  status: "open" | "coming-soon";
  /**
   * Customer handoff destinations. Every value is per-location and configurable;
   * `null` means "not configured yet" and the UI hides the shortcut.
   */
  links: {
    directPickupUrl: string | null;
    directDeliveryUrl: string | null;
    uberEatsUrl: string | null;
    doorDashUrl: string | null;
    skipUrl: string | null;
    tooGoodToGoUrl: string | null;
    phoneOrderNumber: string | null;
  };
}

const NDG = "loc-ndg-somerled";

export const categories: MenuCategory[] = generatedCategories.map((c) => ({ ...c }));

/**
 * 175 published NDG items across 17 categories, generated from the restaurant's
 * live ordering menu. Facts (names, prices, promos, option groups) are real;
 * customer-facing wording is PPP's own.
 */
const popularSet = new Set(mostOrderedItemIds);

export const menuItems: MenuItem[] = generatedItems.map((i) => ({
  ...i,
  compareAtPrice: i.compareAtPrice,
  isAvailable: true,
  badges: [
    ...(popularSet.has(i.id) ? (["popular"] as const) : []),
    ...(i.compareAtPrice ? (["deal"] as const) : []),
  ] as MenuItem["badges"],
  locationIds: [NDG],
}));

export const offers: Offer[] = [
  {
    id: "off-3mcx",
    titleEn: "3 pc chicken + fries + coleslaw + Pepsi",
    titleFr: "3 MCX poulet + frites + salade de chou + Pepsi",
    descriptionEn: "20% off the published price on the 3-piece fried chicken combo.",
    descriptionFr: "20 % de rabais sur le combo poulet frit 3 morceaux.",
    image: foodChicken,
    price: 14.39,
    compareAtPrice: 17.99,
    locationIds: [NDG],
    modes: ["pickup", "delivery"],
    startsAt: null,
    endsAt: null,
  },
  {
    id: "off-4mcx",
    titleEn: "4 pc chicken + fries + coleslaw + Pepsi",
    titleFr: "4 MCX poulet + frites + salade de chou + Pepsi",
    descriptionEn: "20% off the published price on the 4-piece fried chicken combo.",
    descriptionFr: "20 % de rabais sur le combo poulet frit 4 morceaux.",
    image: foodChicken,
    price: 17.27,
    compareAtPrice: 21.59,
    locationIds: [NDG],
    modes: ["pickup", "delivery"],
    startsAt: null,
    endsAt: null,
  },
  {
    id: "off-poutine",
    titleEn: "Classic Poutine",
    titleFr: "Poutine classique",
    descriptionEn: "Fries, cheese curds and gravy — mini to large.",
    descriptionFr: "Frites, fromage en grains et sauce — mini à grande.",
    image: foodPoutine,
    price: 8.39,
    compareAtPrice: null,
    locationIds: [NDG],
    modes: ["pickup", "delivery"],
    startsAt: null,
    endsAt: null,
  },
];

export const locations: Location[] = [
  {
    id: NDG,
    slug: "notre-dame-de-grace",
    name: `PPP ${pppBusiness.shortLocationName}`,
    address: pppBusiness.address.line1,
    city: pppBusiness.address.city,
    province: pppBusiness.address.province,
    postalCode: pppBusiness.address.postalCode,
    phone: pppBusiness.phone.display,
    hours: null,
    services: ["Pickup", "Delivery", "Live music", "Sports", "Wi-Fi"],
    channels: [
      { id: "direct", label: "PPP Direct", kind: "direct" },
      { id: "ubereats", label: "Uber Eats", kind: "marketplace" },
      { id: "doordash", label: "DoorDash", kind: "marketplace" },
      { id: "skip", label: "SkipTheDishes", kind: "marketplace" },
      { id: "tgtg", label: "Too Good To Go", kind: "surplus" },
    ],
    status: "open",
    links: {
      directPickupUrl: null,
      directDeliveryUrl: null,
      uberEatsUrl: externalPresence.ordering.uberEats,
      doorDashUrl: externalPresence.ordering.doorDash,
      skipUrl: externalPresence.ordering.skip,
      /** No confirmed NDG Too Good To Go listing — the MTL-Nord one is legacy. */
      tooGoodToGoUrl: null,
      phoneOrderNumber: pppBusiness.phone.e164,
    },
  },
];

export function categoryById(id: string) {
  return categories.find((c) => c.id === id);
}

export function itemsInCategory(categoryId: string) {
  return menuItems.filter((i) => i.categoryId === categoryId);
}
