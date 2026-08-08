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
    id: "cat-pizza",
    slug: "pizza",
    nameEn: "Pizza",
    nameFr: "Pizza",
    descriptionEn: "Montréal style, all dressed, pepperoni and more.",
    descriptionFr: "Style montréalais, toute garnie, pepperoni et plus.",
    aliasesEn: ["pizza", "pizzas", "pie", "slice"],
    aliasesFr: ["pizza", "pizzas", "pointe"],
    image: foodPizza,
    sortOrder: 1,
  },
  {
    id: "cat-chicken",
    slug: "chicken",
    nameEn: "Rotisserie & Chicken",
    nameFr: "Rôtisserie & Poulet",
    descriptionEn: "Rotisserie quarters, ribs and family platters.",
    descriptionFr: "Quarts de poulet, côtes levées et assiettes familiales.",
    aliasesEn: ["chicken", "rotisserie", "poulet", "wings", "bbq"],
    aliasesFr: ["poulet", "rotisserie", "rôtisserie", "ailes", "bbq"],
    image: foodChicken,
    sortOrder: 2,
  },
  {
    id: "cat-pita",
    slug: "pita",
    nameEn: "Pitas & Shawarma",
    nameFr: "Pitas & Shawarma",
    descriptionEn: "Shish taouk, shawarma, gyros and mixed grill.",
    descriptionFr: "Shish taouk, shawarma, gyros et grillades.",
    aliasesEn: ["pita", "pitas", "wrap", "shawarma", "taouk", "gyro", "grill"],
    aliasesFr: ["pita", "pitas", "shawarma", "taouk", "gyro", "grillades"],
    image: foodPita,
    sortOrder: 3,
  },
  {
    id: "cat-burgers",
    slug: "burgers",
    nameEn: "Burgers & Hot Dogs",
    nameFr: "Burgers & Hot-dogs",
    descriptionEn: "Charbroiled burgers and Montréal steamés.",
    descriptionFr: "Burgers grillés et steamés montréalais.",
    aliasesEn: ["burger", "burgers", "hamburger", "cheeseburger", "hot dog", "hotdog"],
    aliasesFr: ["burger", "burgers", "hambourgeois", "hot-dog", "steamé", "steame"],
    image: foodBurger,
    sortOrder: 4,
  },
  {
    id: "cat-sides",
    slug: "sides",
    nameEn: "Fries & Poutine",
    nameFr: "Frites & Poutine",
    descriptionEn: "Fresh cut fries, classic and loaded poutines.",
    descriptionFr: "Frites fraîches, poutines classiques et garnies.",
    aliasesEn: ["fries", "french fries", "sides", "poutine", "potato", "chips"],
    aliasesFr: ["frites", "patates frites", "accompagnements", "poutine", "patates"],
    image: foodPoutine,
    sortOrder: 5,
  },
  {
    id: "cat-combos",
    slug: "combos",
    nameEn: "Combos",
    nameFr: "Combos",
    descriptionEn: "Main, side and drink — one price.",
    descriptionFr: "Plat, accompagnement et boisson — un prix.",
    aliasesEn: ["combo", "combos", "meal", "meals", "deal", "trio"],
    aliasesFr: ["combo", "combos", "repas", "trio", "spécial", "special"],
    image: comboPita,
    sortOrder: 6,
  },
  {
    id: "cat-dessert",
    slug: "dessert",
    nameEn: "Crèmerie & Dessert",
    nameFr: "Crèmerie & Dessert",
    descriptionEn: "Soft serve, sundaes and shakes.",
    descriptionFr: "Crème glacée molle, sundaes et laits frappés.",
    aliasesEn: ["dessert", "sweet", "ice cream", "sundae", "shake", "soft serve"],
    aliasesFr: ["dessert", "sucré", "crème glacée", "sundae", "lait frappé", "molle"],
    image: foodDessert,
    sortOrder: 7,
  },
];

const NDG = "loc-ndg";

export const menuItems: MenuItem[] = [
  {
    id: "itm-pepperoni",
    categoryId: "cat-pizza",
    nameEn: "Pepperoni Pizza",
    nameFr: "Pizza Pepperoni",
    descriptionEn: "Tomato sauce, mozzarella, pepperoni.",
    descriptionFr: "Sauce tomate, mozzarella, pepperoni.",
    aliasesEn: ["pepperoni", "peperoni", "pizza"],
    aliasesFr: ["pepperoni", "pépéroni", "pizza"],
    image: foodPizza,
    price: null,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-all-dressed",
    categoryId: "cat-pizza",
    nameEn: "All Dressed Pizza",
    nameFr: "Pizza Toute Garnie",
    descriptionEn: "Pepperoni, green peppers, mushrooms, mozzarella.",
    descriptionFr: "Pepperoni, poivrons verts, champignons, mozzarella.",
    aliasesEn: ["all dressed", "deluxe", "pizza"],
    aliasesFr: ["toute garnie", "garnie", "pizza"],
    image: foodPizza,
    price: null,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-cheese",
    categoryId: "cat-pizza",
    nameEn: "Cheese Pizza",
    nameFr: "Pizza Fromage",
    descriptionEn: "Tomato sauce and mozzarella.",
    descriptionFr: "Sauce tomate et mozzarella.",
    aliasesEn: ["cheese", "plain", "pizza"],
    aliasesFr: ["fromage", "nature", "pizza"],
    image: foodPizza,
    price: null,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-quarter-chicken",
    categoryId: "cat-chicken",
    nameEn: "Rotisserie Chicken Plate",
    nameFr: "Assiette Poulet Rôti",
    descriptionEn: "Rotisserie chicken, fries, coleslaw and sauce.",
    descriptionFr: "Poulet rôti, frites, salade de chou et sauce.",
    aliasesEn: ["chicken", "rotisserie", "quarter chicken", "plate"],
    aliasesFr: ["poulet", "rôti", "quart de poulet", "assiette"],
    image: menuRotisserie,
    price: 18.99,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-chicken-pita",
    categoryId: "cat-pita",
    nameEn: "Shish Taouk Pita",
    nameFr: "Pita Shish Taouk",
    descriptionEn: "Grilled chicken, garlic sauce, pickles, vegetables.",
    descriptionFr: "Poulet grillé, sauce à l'ail, marinades, légumes.",
    aliasesEn: ["chicken pita", "taouk", "chicken wrap", "chicken"],
    aliasesFr: ["pita poulet", "taouk", "poulet"],
    image: foodPita,
    price: null,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-shawarma-pita",
    categoryId: "cat-pita",
    nameEn: "Shawarma Pita",
    nameFr: "Pita Shawarma",
    descriptionEn: "Marinated shawarma, tahini, tomato, onion.",
    descriptionFr: "Shawarma mariné, tahini, tomate, oignon.",
    aliasesEn: ["shawarma", "wrap", "pita"],
    aliasesFr: ["shawarma", "pita"],
    image: comboPita,
    price: null,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-burger",
    categoryId: "cat-burgers",
    nameEn: "PPP Burger",
    nameFr: "Burger PPP",
    descriptionEn: "Charbroiled patty, cheese, grilled onions, house sauce.",
    descriptionFr: "Boulette grillée, fromage, oignons grillés, sauce maison.",
    aliasesEn: ["burger", "cheeseburger", "hamburger"],
    aliasesFr: ["burger", "hambourgeois"],
    image: foodBurger,
    price: null,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-fries",
    categoryId: "cat-sides",
    nameEn: "Fries",
    nameFr: "Frites",
    descriptionEn: "Fresh cut, golden and crispy.",
    descriptionFr: "Coupées fraîches, dorées et croustillantes.",
    aliasesEn: ["fries", "french fries", "frites", "chips", "potato"],
    aliasesFr: ["frites", "patates frites", "patates"],
    image: foodPoutine,
    price: null,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
  {
    id: "itm-poutine",
    categoryId: "cat-sides",
    nameEn: "Classic Poutine",
    nameFr: "Poutine Classique",
    descriptionEn: "Fries, cheese curds, hot gravy.",
    descriptionFr: "Frites, fromage en grains, sauce chaude.",
    aliasesEn: ["poutine", "fries", "gravy", "curds"],
    aliasesFr: ["poutine", "frites", "sauce", "fromage en grains"],
    image: foodPoutine,
    price: null,
    isAvailable: true,
    badges: ["popular"],
    locationIds: [NDG],
  },
  {
    id: "itm-combo-pita",
    categoryId: "cat-combos",
    nameEn: "Pita Combo",
    nameFr: "Combo Pita",
    descriptionEn: "Shish taouk or shawarma pita, fries and a drink.",
    descriptionFr: "Pita shish taouk ou shawarma, frites et boisson.",
    aliasesEn: ["combo", "pita combo", "meal", "chicken combo", "fries"],
    aliasesFr: ["combo", "combo pita", "repas", "frites"],
    image: comboPita,
    price: 15.99,
    isAvailable: true,
    badges: ["deal"],
    locationIds: [NDG],
  },
  {
    id: "itm-combo-burger",
    categoryId: "cat-combos",
    nameEn: "Burger Combo",
    nameFr: "Combo Burger",
    descriptionEn: "PPP burger with a small poutine.",
    descriptionFr: "Burger PPP avec une petite poutine.",
    aliasesEn: ["combo", "burger combo", "meal", "poutine", "fries"],
    aliasesFr: ["combo", "combo burger", "repas", "poutine", "frites"],
    image: comboBurger,
    price: 15.99,
    isAvailable: true,
    badges: ["deal"],
    locationIds: [NDG],
  },
  {
    id: "itm-sundae",
    categoryId: "cat-dessert",
    nameEn: "Sundae",
    nameFr: "Sundae",
    descriptionEn: "Soft serve with chocolate or caramel.",
    descriptionFr: "Crème glacée molle, chocolat ou caramel.",
    aliasesEn: ["dessert", "ice cream", "sundae", "sweet"],
    aliasesFr: ["dessert", "crème glacée", "sundae", "sucré"],
    image: foodDessert,
    price: null,
    isAvailable: true,
    badges: [],
    locationIds: [NDG],
  },
];

export const offers: Offer[] = [
  {
    id: "off-combo-pita",
    titleEn: "Pita Combo",
    titleFr: "Combo Pita",
    descriptionEn: "Shish taouk or shawarma pita + fries + drink.",
    descriptionFr: "Pita shish taouk ou shawarma + frites + boisson.",
    image: comboPita,
    price: 15.99,
    locationIds: [NDG],
    modes: ["pickup", "delivery"],
    startsAt: null,
    endsAt: null,
  },
  {
    id: "off-combo-burger",
    titleEn: "Burger + Small Poutine",
    titleFr: "Burger + Petite Poutine",
    descriptionEn: "PPP burger with a small poutine on the side.",
    descriptionFr: "Burger PPP avec une petite poutine.",
    image: comboBurger,
    price: 15.99,
    locationIds: [NDG],
    modes: ["pickup", "delivery"],
    startsAt: null,
    endsAt: null,
  },
  {
    id: "off-rotisserie",
    titleEn: "Rotisserie Plate",
    titleFr: "Assiette Rôtisserie",
    descriptionEn: "Rotisserie chicken, fries, coleslaw, sauce.",
    descriptionFr: "Poulet rôti, frites, salade de chou, sauce.",
    image: menuRotisserie,
    price: 18.99,
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
      doorDashUrl: null,
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