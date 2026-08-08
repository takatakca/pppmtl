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

export type Lang = "en" | "fr";
export type OrderMode = "pickup" | "delivery";

export interface MenuCategory {
  id: string;
  slug: string;
  nameEn: string;
  nameFr: string;
  descriptionEn: string;
  descriptionFr: string;
  aliasesEn: string[];
  aliasesFr: string[];
  image: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  nameEn: string;
  nameFr: string;
  descriptionEn: string;
  descriptionFr: string;
  aliasesEn: string[];
  aliasesFr: string[];
  image: string;
  /** CAD. null when pricing is configured per location and not confirmed here. */
  price: number | null;
  /** Struck-through reference price when a configured promo is active. */
  compareAtPrice?: number | null;
  isAvailable: boolean;
  badges: Array<"popular" | "new" | "deal">;
  locationIds: string[];
}

export interface Offer {
  id: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
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

export const categories: MenuCategory[] = [
  {
    id: "cat-chicken",
    slug: "poulet-frit",
    nameEn: "Fried Chicken & Wings",
    nameFr: "Poulet Frit & Ailes",
    descriptionEn: "Pieces, wings and nuggets with fries, sauce and coleslaw.",
    descriptionFr: "Morceaux, ailes et croquettes avec frites, sauce et salade de chou.",
    aliasesEn: ["chicken", "fried chicken", "wings", "nuggets", "poulet", "mcx", "pieces"],
    aliasesFr: ["poulet", "poulet frit", "ailes", "croquettes", "mcx", "morceaux"],
    image: foodChicken,
    sortOrder: 1,
  },
  {
    id: "cat-trios",
    slug: "trios",
    nameEn: "Trios",
    nameFr: "Trios",
    descriptionEn: "Numbered trios with a main, wings and a drink.",
    descriptionFr: "Trios numérotés avec plat, ailes et boisson.",
    aliasesEn: ["trio", "trios", "combo", "meal", "burger combo"],
    aliasesFr: ["trio", "trios", "combo", "repas"],
    image: comboBurger,
    sortOrder: 2,
  },
  {
    id: "cat-pizza",
    slug: "pizza",
    nameEn: "Pizza",
    nameFr: "Pizza",
    descriptionEn: "Single, double and promo pizza.",
    descriptionFr: "Pizza simple, double et promo.",
    aliasesEn: ["pizza", "pizzas", "slice", "pie"],
    aliasesFr: ["pizza", "pizzas", "pointe"],
    image: foodPizza,
    sortOrder: 3,
  },
  {
    id: "cat-subs",
    slug: "sous-marins",
    nameEn: "Submarines",
    nameFr: "Sous-Marins",
    descriptionEn: "Small subs with included toppings and sauces.",
    descriptionFr: "Sous-marins petits avec garnitures et sauces incluses.",
    aliasesEn: ["sub", "subs", "submarine", "steak", "sandwich", "tacos"],
    aliasesFr: ["sous-marin", "sous marin", "sous-marins", "steak", "sandwich", "tacos"],
    image: comboPita,
    sortOrder: 4,
  },
  {
    id: "cat-sides",
    slug: "frites-poutines",
    nameEn: "Fries & Poutine",
    nameFr: "Frites & Poutines",
    descriptionEn: "Fries and poutines in mini, small, medium and large.",
    descriptionFr: "Frites et poutines format mini, petite, moyenne ou grande.",
    aliasesEn: ["fries", "poutine", "gravy", "curds", "sides", "potato"],
    aliasesFr: ["frites", "poutine", "sauce", "fromage en grains", "patates"],
    image: foodPoutine,
    sortOrder: 5,
  },
  {
    id: "cat-pita",
    slug: "pita-wrap-assiette",
    nameEn: "Pita / Wrap / Plate",
    nameFr: "Pita / Wrap / Assiette",
    descriptionEn: "Shish taouk, shawarma and tacos meat, pita or plate.",
    descriptionFr: "Shish taouk, shawarma et viande tacos, en pita ou en assiette.",
    aliasesEn: ["pita", "wrap", "shawarma", "taouk", "plate", "platter"],
    aliasesFr: ["pita", "wrap", "shawarma", "taouk", "assiette"],
    image: foodPita,
    sortOrder: 6,
  },
  {
    id: "cat-mexican",
    slug: "mexicain",
    nameEn: "Mexican",
    nameFr: "Mexicain",
    descriptionEn: "Quesadillas with included toppings and sauces.",
    descriptionFr: "Quesadillas avec garnitures et sauces incluses.",
    aliasesEn: ["mexican", "quesadilla", "quesadillas", "beef"],
    aliasesFr: ["mexicain", "quesadilla", "quesadillas", "boeuf", "bœuf"],
    image: foodBurger,
    sortOrder: 7,
  },
];

const NDG = "loc-ndg";

/**
 * Items and prices reflect the restaurant's published NDG ordering menu.
 * Only items with a published price are listed; nothing here is estimated.
 */
export const menuItems: MenuItem[] = [
  {
    id: "itm-3mcx-frits",
    categoryId: "cat-chicken",
    nameEn: "3 pc + fries + sauce + coleslaw + Pepsi",
    nameFr: "3 MCX + frites + sauce + salade de chou + Pepsi",
    descriptionEn:
      "Three pieces of fried chicken with fries, sauce, coleslaw and a drink. Extra chicken available.",
    descriptionFr:
      "3 morceaux de poulet frit, frites, sauce, salade de chou et boisson. Extras poulet disponibles.",
    aliasesEn: ["3 pieces", "3 mcx", "fried chicken", "chicken combo", "pepsi"],
    aliasesFr: ["3 mcx", "3 morceaux", "poulet frit", "combo poulet", "pepsi"],
    image: foodChicken,
    price: 14.39,
    compareAtPrice: 17.99,
    isAvailable: true,
    badges: ["popular", "deal"],
    locationIds: [NDG],
  },
  {
    id: "itm-4mcx-frits",
    categoryId: "cat-chicken",
    nameEn: "4 pc + fries + sauce + coleslaw + Pepsi",
    nameFr: "4 MCX + frites + sauce + salade de chou + Pepsi",
    descriptionEn:
      "Four pieces of fried chicken with fries, sauce, coleslaw and a drink. Extra chicken available.",
    descriptionFr:
      "4 morceaux de poulet frit, frites, sauce, salade de chou et boisson. Extras poulet disponibles.",
    aliasesEn: ["4 pieces", "4 mcx", "fried chicken", "chicken combo"],
    aliasesFr: ["4 mcx", "4 morceaux", "poulet frit", "combo poulet"],
    image: foodChicken,
    price: 17.27,
    compareAtPrice: 21.59,
    isAvailable: true,
    badges: ["deal"],
    locationIds: [NDG],
  },
  {
    id: "itm-10mcx",
    categoryId: "cat-chicken",
    nameEn: "10 pc + fries + sauce + Pepsi (nuggets or wings)",
    nameFr: "10 MCX + frites + sauce + Pepsi (CROQ. OU AIL)",
    descriptionEn:
      "Ten pieces — choose wings or nuggets — with fries, sauce and a drink. Extra chicken available.",
    descriptionFr:
      "10 morceaux — ailes ou croquettes — avec frites, sauce(s) et boisson. Extras poulet disponibles.",
    aliasesEn: ["10 pieces", "wings", "nuggets", "10 mcx"],
    aliasesFr: ["10 mcx", "ailes", "croquettes"],
    image: foodChicken,
    price: 20.39,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-trio-2",
    categoryId: "cat-trios",
    nameEn: "Trio #2 — Cheeseburger + 6 chicken wings + soft drink",
    nameFr: "Trio #2 — Cheeseburger + 6 ailes de poulet + boisson gazeuse",
    descriptionEn:
      "Cheeseburger, six chicken wings and a soft drink. Drink choice included; toppings and sauces per item.",
    descriptionFr:
      "Cheeseburger + 6 ailes de poulet + boisson gazeuse. Choix de boisson inclus; garnitures et sauces selon les items.",
    aliasesEn: ["trio 2", "cheeseburger", "burger", "wings", "combo"],
    aliasesFr: ["trio 2", "cheeseburger", "burger", "ailes", "combo"],
    image: comboBurger,
    price: 20.39,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-trio-5",
    categoryId: "cat-trios",
    nameEn: "Trio #5 — Chicken burger + 6 chicken wings + soft drink",
    nameFr: "Trio #5 — Burger poulet + 6 ailes de poulet + boisson gazeuse",
    descriptionEn:
      "Chicken burger, six chicken wings and a soft drink. Drink choice included; toppings and sauces per item.",
    descriptionFr:
      "Burger poulet + 6 ailes de poulet + boisson gazeuse. Choix de boisson inclus; garnitures et sauces selon les items.",
    aliasesEn: ["trio 5", "chicken burger", "wings", "combo"],
    aliasesFr: ["trio 5", "burger poulet", "ailes", "combo"],
    image: comboBurger,
    price: 20.39,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-sub-steak",
    categoryId: "cat-subs",
    nameEn: "Steak Submarine",
    nameFr: "Sous-marin Steak",
    descriptionEn:
      "Small steak sub with your choice of included toppings and sauces. Add a fries + drink trio or a classic poutine combo.",
    descriptionFr:
      "Sous-marin Steak — Petit. Garnitures et sauces incluses au choix. Ajoutez un trio frites + breuvage ou un combo poutine classique + breuvage.",
    aliasesEn: ["steak sub", "submarine", "sandwich", "steak"],
    aliasesFr: ["sous-marin steak", "sous marin", "sandwich", "steak"],
    image: comboPita,
    price: 12.0,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-sub-tacos",
    categoryId: "cat-subs",
    nameEn: "Tacos Submarine",
    nameFr: "Sous-marin Tacos",
    descriptionEn:
      "Small tacos sub with your choice of included toppings and sauces. Add a fries + drink trio or a classic poutine combo.",
    descriptionFr:
      "Sous-marin Tacos — Petit. Garnitures et sauces incluses au choix. Ajoutez un trio frites + breuvage ou un combo poutine classique + breuvage.",
    aliasesEn: ["tacos sub", "submarine", "sandwich", "tacos"],
    aliasesFr: ["sous-marin tacos", "sous marin", "sandwich", "tacos"],
    image: comboPita,
    price: 12.0,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-poutine-classique",
    categoryId: "cat-sides",
    nameEn: "Classic Poutine",
    nameFr: "Poutine classique",
    descriptionEn:
      "Fries, cheese curds and gravy. Choose mini, small, medium or large. Extra sauce and cheese available.",
    descriptionFr:
      "Poutine classique. Format mini, petite, moyenne ou grande. Extras sauce et fromage disponibles.",
    aliasesEn: ["poutine", "fries", "gravy", "curds", "classic poutine"],
    aliasesFr: ["poutine", "frites", "sauce", "fromage en grains", "poutine classique"],
    image: foodPoutine,
    price: 8.39,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-poutine-taouk",
    categoryId: "cat-sides",
    nameEn: "Shish Taouk Poutine",
    nameFr: "Poutine Shish Taouk",
    descriptionEn:
      "Poutine topped with shish taouk. Choose mini, small, medium or large. Extra sauce and cheese available.",
    descriptionFr:
      "Poutine Shish Taouk. Format mini, petite, moyenne ou grande. Extras sauce et fromage disponibles.",
    aliasesEn: ["poutine", "taouk", "chicken poutine", "shish taouk"],
    aliasesFr: ["poutine", "taouk", "poutine poulet", "shish taouk"],
    image: foodPoutine,
    price: 11.1,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-assiette-mixte",
    categoryId: "cat-pita",
    nameEn: "Mixed Plate — Shish Taouk & Shawarma",
    nameFr: "Assiette Mixte — Shish Taouk & Shawarma",
    descriptionEn:
      "Choose a one-pita or two-pita plate. Salad included: house, Greek or Caesar. Extra sauce and meat available.",
    descriptionFr:
      "Assiette 1 pita ou assiette duo pita. Salade incluse : maison, grecque ou César. Extras sauce et viande disponibles.",
    aliasesEn: ["mixed plate", "shawarma", "taouk", "platter", "plate"],
    aliasesFr: ["assiette mixte", "shawarma", "taouk", "assiette"],
    image: foodPita,
    price: 19.19,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-pita-tacos",
    categoryId: "cat-pita",
    nameEn: "Tacos Meat Pita / Wrap",
    nameFr: "Pita / Wrap Viande Tacos",
    descriptionEn:
      "Choose pita bread or a wrap. Toppings and sauces included. Add a fries + drink trio or a classic poutine combo.",
    descriptionFr:
      "Choisissez pain pita ou wrap. Garnitures et sauces incluses au choix. Ajoutez trio frites + breuvage ou combo poutine classique + breuvage.",
    aliasesEn: ["pita", "wrap", "tacos", "tacos meat"],
    aliasesFr: ["pita", "wrap", "tacos", "viande tacos"],
    image: foodPita,
    price: 11.39,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-quesadillas-boeuf",
    categoryId: "cat-mexican",
    nameEn: "Beef Quesadillas",
    nameFr: "Quesadillas Bœuf",
    descriptionEn: "Beef quesadilla with your choice of included toppings and sauces. Extra sauce available.",
    descriptionFr: "Quesadilla bœuf avec garnitures et sauces incluses au choix. Extra sauce disponible.",
    aliasesEn: ["quesadilla", "quesadillas", "beef", "mexican"],
    aliasesFr: ["quesadilla", "quesadillas", "boeuf", "bœuf", "mexicain"],
    image: foodBurger,
    price: 15.99,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-pizza",
    categoryId: "cat-pizza",
    nameEn: "Pizza",
    nameFr: "Pizza",
    descriptionEn: "Pizza, double 2x pizza and promo pizza — sizes and toppings chosen at checkout.",
    descriptionFr: "Pizza, double 2x pizza et promo pizza — formats et garnitures choisis à la commande.",
    aliasesEn: ["pizza", "pizzas", "double pizza", "promo pizza"],
    aliasesFr: ["pizza", "pizzas", "double pizza", "promo pizza"],
    image: foodPizza,
    price: null,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
];

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
      uberEatsUrl: null,
      doorDashUrl:
        "https://www.doordash.com/en-CA/store/po-poulet-ndg-montr%C3%A9al-27982486/110185563/",
      skipUrl: null,
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
