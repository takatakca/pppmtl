/**
 * THE FRANCHISE BRANDS — one app, one Clover register, one menu, one checkout, one gift-card system.
 *
 * The domain a visitor opens picks the brand (`resolveBrandId`). A brand only changes the front of the site:
 * logo, name, colours, the home-page words, its own 10–12 dishes, its kitchen addresses and its store links on the
 * delivery apps. Everything else (menu, order, checkout, gift cards, account) is the shared PPP system.
 *
 * Rules (owner's orders):
 * - Every brand is a real restaurant in its kitchen (NDG or Saint-Léonard). Never write "ghost", "virtual" or
 *   "delivery-only".
 * - Po Poulet NDG (DoorDash store 27982486) is never linked and never mentioned (the test refuses it).
 * - `dishes` are Clover item ids (`src/config/clover-item-map.ts`). The same lists are in the owner's
 *   `private/google/MENUS_PAR_MARQUE.md`, so the sites and the Google profiles show the same dishes.
 * - An order link is shown only when `live` is true (the store is visible on that app today).
 * - `phone: null` = the group's contact number (GROUP_PHONE) until each brand has its own number.
 */

export type BrandId =
  | "ppp"
  | "ooeuf"
  | "dejeuner"
  | "pipita"
  | "pitalibanais"
  | "mythos"
  | "nutrishake"
  | "bmbd"
  | "ocrepe"
  | "viennoise"
  | "tacomontreal"
  | "inntime"
  | "pizzaalgerie"
  | "popoulet"
  | "pouletpoulet"
  | "bolon"
  | "placeafrique";

export type KitchenId = "ndg" | "st-leonard";

export type BrandIcon =
  | "egg"
  | "burger"
  | "crepe"
  | "pita"
  | "skewer"
  | "shake"
  | "cake"
  | "taco"
  | "pizza"
  | "cone"
  | "drumstick"
  | "cup"
  | "flame";

export type OrderLink =
  | { platform: "doordash"; store: string; live: boolean; note?: string }
  | { platform: "ubereats"; uuid: string; slug: string; live: boolean; note?: string }
  | { platform: "skip"; url: string; live: boolean; note?: string };

export interface Kitchen {
  id: KitchenId;
  labelEn: string;
  labelFr: string;
  area: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  /** Every day, 24-hour "HH:MM". `closes` before `opens` = after midnight. */
  hours: { opens: string; closes: string };
}

export interface BrandText {
  en: string;
  fr: string;
}

export interface BrandRail {
  title: BrandText;
  /** Clover item ids, in display order. */
  items: string[];
}

export interface Brand {
  id: BrandId;
  /** Main host, without www (the canonical address). */
  domain: string;
  name: string;
  /** Other names the same restaurant is known by (schema.org alternateName). */
  alternateNames?: string[];
  icon: BrandIcon;
  /** Button colour (white text on it). */
  primary: string;
  /** Light colours for words and the gradient on the dark page. */
  accent: string;
  accent2: string;
  cuisine: { en: string[]; fr: string[] };
  /** Home-page headline after the name, e.g. ["Craving a", "pita?"]. */
  hook: { en: [string, string]; fr: [string, string] };
  description: BrandText;
  about: { en: string[]; fr: string[] };
  menu: BrandRail[];
  /** Clover item ids shown in the hero composition (first three). */
  heroItems: string[];
  /** googleCid: the Google Maps place id (cid) of that kitchen's verified profile, for schema.org sameAs. */
  kitchens: Array<{ kitchen: KitchenId; orderLinks: OrderLink[]; googleCid?: string }>;
  phone: { display: string; e164: string } | null;
  email: string | null;
}

/**
 * The phone on the Google Business Profiles of the brands (same NAP everywhere), shown until each brand has its own
 * line. Google notes 2026-10-08: (450) 999-4999 on every profile except Café Bolon NDG and Gâteau Montréal NDG.
 */
export const GROUP_PHONE = { display: "(450) 999-4999", e164: "+14509994999" } as const;

/**
 * Clover Online Ordering page of the On2GO.ca merchant: the first "Commander" button of every brand that cooks at
 * NDG (pickup at Somerled). Saint-Léonard has no Clover ordering, so it is never shown for that kitchen alone.
 * Google agent, 2026-10-09 (private/google/ORDER_LINKS.md). The build variable VITE_CLOVER_ONLINE_ORDERING_URL
 * can replace it.
 */
export const CLOVER_ONLINE_ORDERING_URL: string | null =
  (import.meta.env?.["VITE_CLOVER_ONLINE_ORDERING_URL"] as string | undefined)?.trim() ||
  "https://www.clover.com/online-ordering/6280";

/** Hours from Uber Eats Manager (2026-10-07): NDG stores 4:30 PM–3:15 AM, Jean-Talon stores 9 AM–11 PM, daily. */
export const KITCHENS: Record<KitchenId, Kitchen> = {
  ndg: {
    id: "ndg",
    labelEn: "NDG",
    labelFr: "NDG",
    area: "Notre-Dame-de-Grâce",
    street: "6280 Av Somerled",
    city: "Montréal",
    region: "QC",
    postalCode: "H3X 2B6",
    hours: { opens: "16:30", closes: "03:15" },
  },
  "st-leonard": {
    id: "st-leonard",
    labelEn: "Saint-Léonard",
    labelFr: "Saint-Léonard",
    area: "Saint-Léonard",
    street: "5839 Rue Jean-Talon E",
    city: "Montréal",
    region: "QC",
    postalCode: "H1S 1M4",
    hours: { opens: "09:00", closes: "23:00" },
  },
};

const both = (
  ndg: OrderLink[],
  stLeonard: OrderLink[],
  google: { ndg?: string; stLeonard?: string } = {},
): Brand["kitchens"] => [
  { kitchen: "ndg", orderLinks: ndg, ...(google.ndg ? { googleCid: google.ndg } : {}) },
  {
    kitchen: "st-leonard",
    orderLinks: stLeonard,
    ...(google.stLeonard ? { googleCid: google.stLeonard } : {}),
  },
];

const KITCHENS_FR =
  "dans nos cuisines de Notre-Dame-de-Grâce (NDG) et de Saint-Léonard, à Montréal";
const KITCHENS_EN = "in our kitchens in Notre-Dame-de-Grâce (NDG) and Saint-Léonard, Montréal";

export const BRANDS: Brand[] = [
  {
    // PPP keeps its own home page; these values feed the shared parts (head, logo, schema, links).
    id: "ppp",
    domain: "pppmtl.com",
    name: "PPP Pizzeria",
    icon: "pizza",
    primary: "",
    accent: "",
    accent2: "",
    cuisine: { en: ["Pizza", "Rotisserie chicken", "Poutine"], fr: ["Pizza", "Poulet", "Poutine"] },
    hook: { en: ["Craving", "PPP?"], fr: ["Envie de", "PPP?"] },
    description: {
      en: "Chicken, pizza and poutine from our NDG kitchen, pickup or delivery.",
      fr: "Poulet, pizza et poutine de notre cuisine NDG, cueillette ou livraison.",
    },
    about: { en: [], fr: [] },
    menu: [],
    heroItems: [],
    kitchens: [
      { kitchen: "ndg", orderLinks: [], googleCid: "6093103527698124139" },
      {
        kitchen: "st-leonard",
        orderLinks: [
          {
            platform: "ubereats",
            uuid: "627d09f0-8fb4-57f2-8ec1-6a71984ad267",
            slug: "ppp-pizzeria-hochelaga",
            live: true,
          },
        ],
      },
    ],
    phone: null,
    email: null,
  },
  {
    id: "ooeuf",
    domain: "ooeuf.ca",
    name: "OOEUF",
    icon: "egg",
    primary: "#a3400c",
    accent: "#ffc93c",
    accent2: "#ff9a52",
    cuisine: {
      en: ["Snack bar", "Burgers", "Hot dogs", "Poutine"],
      fr: ["Casse-croûte", "Burgers", "Hot-dogs", "Poutine"],
    },
    hook: { en: ["Craving a", "Big Matt?"], fr: ["Envie d’un", "Big Matt ?"] },
    description: {
      fr: `OOEUF, c’est le casse-croûte de quartier : burgers, hot-dogs Michigan, poutines et rondelles d’oignon, préparés ${KITCHENS_FR}.`,
      en: `OOEUF is the neighbourhood snack bar: burgers, Michigan hot dogs, poutines and onion rings, made ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Le Big Matt, notre burger double, le cheeseburger, le Philly Burger et le Sloppy Joe sont servis avec garnitures et sauces au choix. Ajoutez un trio frites et breuvage, ou une poutine classique.",
        "La poutine classique ou bacon se commande du format mini au grand format. Hot-dogs Michigan, suprêmes ou toastés et rondelles d’oignon complètent le casse-croûte.",
      ],
      en: [
        "The Big Matt, our double burger, the cheeseburger, the Philly Burger and the Sloppy Joe come with the toppings and sauces you choose. Add fries and a drink, or a classic poutine.",
        "Classic or bacon poutine comes in mini to large. Michigan, supreme or toasted hot dogs and onion rings round out the menu.",
      ],
    },
    menu: [
      {
        title: { fr: "Burgers", en: "Burgers" },
        items: [
          "GEXZQ53GK93C0",
          "HM49MB9XYVMWT",
          "TNHW4S2PJPDET",
          "8RRW243269DSP",
          "DRWRTRPHWEBSG",
          "QXSABG94QS1F0",
        ],
      },
      {
        title: { fr: "Hot-dogs et poutines", en: "Hot dogs and poutines" },
        items: [
          "BCFQM8RZZ9GMP",
          "43472J9YW6ZA0",
          "H22MA0YY0R4TW",
          "7BF0CQ2WDEY2R",
          "0JWAY1VMJ2M2J",
          "RT6HGTMYT1F6E",
        ],
      },
    ],
    heroItems: ["GEXZQ53GK93C0", "0JWAY1VMJ2M2J", "BCFQM8RZZ9GMP"],
    kitchens: both(
      [
        {
          platform: "ubereats",
          uuid: "6cbb374c-c3a2-5951-b88c-11142bd5121a",
          slug: "ooeufs-express-ndg",
          live: true,
        },
        { platform: "doordash", store: "34525477", live: true },
      ],
      [
        {
          platform: "ubereats",
          uuid: "c5585882-ab06-5a2f-bbc2-66fe5ec9179c",
          slug: "ooeufs-express",
          live: false,
          note: "not visible",
        },
        {
          platform: "doordash",
          store: "33597929",
          live: false,
          note: "inactive, reactivation asked",
        },
      ],
      { ndg: "8027317480379740171" },
    ),
    phone: null,
    email: null,
  },
  {
    id: "dejeuner",
    domain: "dejeuner.ooeuf.ca",
    name: "Déjeuner Montréal",
    icon: "burger",
    primary: "#8a5a00",
    accent: "#ffd166",
    accent2: "#f4a259",
    cuisine: { en: ["Snack bar", "Combos", "Poutine"], fr: ["Casse-croûte", "Trios", "Poutine"] },
    hook: { en: ["Craving a", "combo?"], fr: ["Envie d’un", "bon trio ?"] },
    description: {
      fr: `Déjeuner Montréal sert les trios du casse-croûte : hamburgers, cheeseburgers, hot-dogs vapeur ou Michigan, frites et poutines garnies, préparés ${KITCHENS_FR}.`,
      en: `Déjeuner Montréal serves snack-bar combos: hamburgers, cheeseburgers, steamed or Michigan hot dogs, fries and loaded poutines, made ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Chaque trio vient avec frites et breuvage : deux hamburgers, un cheeseburger double avec rondelles d’oignon, deux hot-dogs vapeur, Michigan ou suprêmes.",
        "Côté poutines : hot-dog, italienne, steak ou toute garnie. Les frites se prennent nature, sauce ou Michigan.",
      ],
      en: [
        "Every combo comes with fries and a drink: two hamburgers, a double cheeseburger with onion rings, two steamed, Michigan or supreme hot dogs.",
        "For poutine: hot dog, Italian, steak or all-dressed. Fries come plain, with gravy or Michigan style.",
      ],
    },
    menu: [
      {
        title: { fr: "Trios", en: "Combos" },
        items: [
          "ZR4DKS7XCBB06",
          "V04ZTAZFAJHER",
          "HAB6C0ZVQCY2E",
          "E98EWT00ES3FP",
          "XYC8N674P8Q2M",
        ],
      },
      {
        title: { fr: "Frites et poutines", en: "Fries and poutines" },
        items: [
          "N27C2RAXVV4Y8",
          "48BQ2M1BCYXWP",
          "A5D88EY1G2B1P",
          "GHMMXTN9XTCEW",
          "V8SW1SPAEYF5P",
          "AA5T55NBBQSCM",
          "JJRB835A5C4V2",
        ],
      },
    ],
    heroItems: ["V04ZTAZFAJHER", "JJRB835A5C4V2", "E98EWT00ES3FP"],
    kitchens: both([], []),
    phone: null,
    email: null,
  },
  {
    id: "pipita",
    domain: "pipita.ca",
    name: "Pi Pita",
    icon: "pita",
    primary: "#17633a",
    accent: "#9be08f",
    accent2: "#f3e19a",
    cuisine: {
      en: ["Lebanese", "Shawarma", "Shish taouk"],
      fr: ["Libanais", "Shawarma", "Shish taouk"],
    },
    hook: { en: ["Craving a", "shawarma?"], fr: ["Envie d’un", "shawarma ?"] },
    description: {
      fr: `Pi Pita sert la cuisine de rue libanaise : pitas et wraps shawarma, shish taouk et mixte, assiettes libanaises avec salade au choix, salades shish taouk et shawarma, et des options végétariennes, ${KITCHENS_FR}.`,
      en: `Pi Pita serves Lebanese street food: shawarma, shish taouk and mixed pitas and wraps, Lebanese plates with your choice of salad, shish taouk and shawarma salads, and vegetarian options, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Chaque pita ou wrap vient avec garnitures et sauces au choix. Ajoutez un trio frites et breuvage, ou une poutine classique.",
        "Les assiettes shish taouk, shawarma, mixte ou végétarienne se servent seules, avec un pita ou en duo, avec une salade maison, grecque ou César. Le shish taouk et le shawarma existent aussi en salade.",
      ],
      en: [
        "Every pita or wrap comes with the toppings and sauces you choose. Add fries and a drink, or a classic poutine.",
        "Shish taouk, shawarma, mixed or vegetarian plates come on their own, with one pita or two, with a house, Greek or Caesar salad. Shish taouk and shawarma also come as a salad.",
      ],
    },
    menu: [
      {
        title: { fr: "Pitas et wraps", en: "Pitas and wraps" },
        items: ["597X8A3860936", "WVP2PV58R83VT", "MKHYNCFYDQXQY", "2XP0YDZVBPT94"],
      },
      {
        title: { fr: "Assiettes et salades", en: "Plates and salads" },
        items: [
          "4MY54W143VJKA",
          "KAHRY3GB43ZR8",
          "727Z9F3YVT1HW",
          "TZJTHVQVKRHBR",
          "9WJ119FVZ9CZG",
          "4BZ1WR4YF7QDT",
        ],
      },
    ],
    heroItems: ["597X8A3860936", "727Z9F3YVT1HW", "9WJ119FVZ9CZG"],
    kitchens: both(
      [
        {
          platform: "ubereats",
          uuid: "c8390129-1c18-5c51-800e-d9be32a865a3",
          slug: "pi-pita-ndg",
          live: true,
        },
        { platform: "doordash", store: "27986352", live: false, note: "inactive" },
      ],
      [
        {
          platform: "ubereats",
          uuid: "b6b36ca0-bc57-50d0-a184-1d28bf74771f",
          slug: "pi-pita-hochelaga",
          live: false,
          note: "not visible",
        },
        { platform: "doordash", store: "33598679", live: false, note: "inactive" },
      ],
      { ndg: "2408837339277880870" },
    ),
    phone: null,
    email: null,
  },
  {
    id: "pitalibanais",
    domain: "pitalibanais.pppmtl.com",
    name: "Pita Libanais",
    icon: "pita",
    primary: "#b3261e",
    accent: "#8fe39a",
    accent2: "#ffffff",
    cuisine: {
      en: ["Lebanese", "Family meals", "Shish taouk"],
      fr: ["Libanais", "Repas familiaux", "Shish taouk"],
    },
    hook: { en: ["Lebanese", "to share?"], fr: ["Libanais", "à partager ?"] },
    description: {
      fr: `Pita Libanais, ce sont les repas libanais à partager : quatre assiettes ou quatre pitas pour la famille, trios pour deux, et le shish taouk et le shawarma en sous-marin, en poutine ou sur pizza, ${KITCHENS_FR}.`,
      en: `Pita Libanais is Lebanese food to share: four plates or four pitas for the family, combos for two, and shish taouk and shawarma as a sub, a poutine or a pizza, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Pour la famille : quatre assiettes libanaises ou quatre pitas au choix, avec frites et boissons. Pour deux : deux pitas avec deux mini poutines, ou deux assiettes avec deux breuvages.",
        "Le shish taouk et le shawarma se prennent aussi en sous-marin, en poutine ou sur une pizza.",
      ],
      en: [
        "For the family: four Lebanese plates or four pitas of your choice, with fries and drinks. For two: two pitas with two mini poutines, or two plates with two drinks.",
        "Shish taouk and shawarma also come as a sub, a poutine or a pizza.",
      ],
    },
    menu: [
      {
        title: { fr: "Repas à partager", en: "Meals to share" },
        items: ["G52E2A8PG9WZC", "PJE3BX3HBY6XM", "4ZTKJ0YEVXXYP", "A9J45QQ10ZFD8"],
      },
      {
        title: {
          fr: "Shish taouk et shawarma autrement",
          en: "Shish taouk and shawarma, other ways",
        },
        items: [
          "8QY1VZ96HGJKR",
          "DMXXWSMB26250",
          "TFF125JTRPYZ6",
          "VNDJXW31BYDV8",
          "GQD4RH1JXB79R",
          "3KEZ2GZT59MC2",
        ],
      },
    ],
    heroItems: ["G52E2A8PG9WZC", "PJE3BX3HBY6XM", "TFF125JTRPYZ6"],
    kitchens: both(
      [
        { platform: "doordash", store: "28719391", live: false, note: "inactive (POS outage)" },
        {
          platform: "ubereats",
          uuid: "ad89eb6f-9244-53fc-b6a7-cd0086e70b43",
          slug: "pita-libanais-montreal",
          live: false,
          note: "hidden",
        },
      ],
      [
        {
          platform: "ubereats",
          uuid: "c6b9e38d-15da-4771-9bcc-7cfa9f9abea9",
          slug: "pita-libanais-hochelaga",
          live: false,
          note: "hidden",
        },
      ],
    ),
    phone: null,
    email: null,
  },
  {
    id: "mythos",
    domain: "mythos.pppmtl.com",
    name: "Mythos & Go",
    icon: "skewer",
    primary: "#1f4e9c",
    accent: "#8cc8ff",
    accent2: "#ffffff",
    cuisine: { en: ["Greek", "Gyros", "Souvlaki"], fr: ["Grec", "Gyros", "Souvlaki"] },
    hook: { en: ["Craving", "gyros?"], fr: ["Envie d’un", "gyros ?"] },
    description: {
      fr: `Mythos & Go sert la cuisine de rue grecque : pitas et assiettes gyros et souvlaki, brochettes, salade grecque, poutine, sous-marin et pizza gyros, ${KITCHENS_FR}.`,
      en: `Mythos & Go serves Greek street food: gyros and souvlaki pitas and plates, skewers, Greek salad, gyros poutine, sub and pizza, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Les assiettes gyros, souvlaki porc ou souvlaki poulet viennent avec une salade maison, grecque ou César, seules ou avec pita. Pour deux : deux assiettes de deux brochettes, poulet ou porc.",
        "Le gyros se prend aussi en pita, en sous-marin, en poutine ou sur une pizza. Ajoutez de la feta.",
      ],
      en: [
        "Gyros, pork souvlaki or chicken souvlaki plates come with a house, Greek or Caesar salad, on their own or with pita. For two: two plates of two skewers, chicken or pork.",
        "Gyros also comes in a pita, a sub, a poutine or on a pizza. Add feta.",
      ],
    },
    menu: [
      {
        title: { fr: "Assiettes et pitas", en: "Plates and pitas" },
        items: [
          "1JBFM5YK1MSGT",
          "93A61ZY15KTWY",
          "D74FME072WNFE",
          "H5QAG8XDM7KC0",
          "R06FJ1J754K70",
          "DJY7QBZW0SCCG",
          "143A5SF8PBW3G",
        ],
      },
      {
        title: { fr: "Gyros à votre façon", en: "Gyros your way" },
        items: [
          "3X7W15NDS9YK4",
          "H9Q6YDCSNF218",
          "YVZKRHA5SZWCP",
          "GDW759EPRDWHW",
          "SH6288Z189A7W",
        ],
      },
    ],
    heroItems: ["1JBFM5YK1MSGT", "R06FJ1J754K70", "3X7W15NDS9YK4"],
    kitchens: both(
      [
        { platform: "doordash", store: "32501513", live: false, note: "deactivated (tablet)" },
        {
          platform: "ubereats",
          uuid: "f54cdb63-78cb-5ea3-b967-1b58d18c83cf",
          slug: "mythos-and-go-montreal",
          live: false,
          note: "hidden",
        },
      ],
      [
        {
          platform: "ubereats",
          uuid: "203c8294-81e6-4fde-ad04-e7158a66f4b4",
          slug: "mythos-and-go-montreal",
          live: true,
        },
      ],
    ),
    phone: null,
    email: null,
  },
  {
    id: "nutrishake",
    domain: "nutrishake.ca",
    name: "Nutrition Shake",
    alternateNames: ["Nutri Shake"],
    icon: "shake",
    primary: "#0c6355",
    accent: "#6fe3c8",
    accent2: "#d4f57a",
    cuisine: {
      en: ["Healthy", "Protein salads", "Vegetarian"],
      fr: ["Santé", "Salades protéinées", "Végétarien"],
    },
    hook: { en: ["Craving", "something fresh?"], fr: ["Envie de", "fraîcheur ?"] },
    description: {
      fr: `Nutrition Shake prépare des repas légers et protéinés : salades au poulet, au shish taouk, grecque et César, assiettes et wraps végétariens, eau et boissons froides, ${KITCHENS_FR}.`,
      en: `Nutrition Shake makes light, protein-rich meals: chicken, shish taouk, Greek and Caesar salads, vegetarian plates and wraps, water and cold drinks, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Salade au poulet, au shish taouk, grecque, César ou maison : de quoi manger frais, au dîner comme au souper. Le duo de salades protéinées se partage à deux.",
        "Pour un repas plus complet : l’assiette souvlaki poulet, l’assiette végétarienne ou le wrap végétarien, avec la salade de votre choix.",
      ],
      en: [
        "Chicken, shish taouk, Greek, Caesar or house salad: fresh food for lunch or dinner. The two protein salads deal is made to share.",
        "For a fuller meal: the chicken souvlaki plate, the vegetarian plate or the vegetarian wrap, with the salad you choose.",
      ],
    },
    menu: [
      {
        title: { fr: "Salades protéinées", en: "Protein salads" },
        items: [
          "Q0RJH1DDQEEVY",
          "9WJ119FVZ9CZG",
          "3X7W15NDS9YK4",
          "QHACT24KE119P",
          "WRYSANG402512",
          "KHQHQGJ4A8RH8",
        ],
      },
      {
        title: { fr: "Assiettes, wraps et eau", en: "Plates, wraps and water" },
        items: ["D74FME072WNFE", "TZJTHVQVKRHBR", "2XP0YDZVBPT94", "5187NBRCYT454"],
      },
    ],
    heroItems: ["Q0RJH1DDQEEVY", "D74FME072WNFE", "3X7W15NDS9YK4"],
    kitchens: both(
      [
        {
          platform: "ubereats",
          uuid: "58f2a0dd-a9da-5a27-a130-d858a52e18f9",
          slug: "nutri-shake-ndg",
          live: true,
        },
        { platform: "doordash", store: "27510307", live: true },
      ],
      [
        {
          platform: "ubereats",
          uuid: "8c0a69ee-1667-5aa7-a8e6-7fdb707095da",
          slug: "nutri-shake-hochelaga",
          live: true,
        },
        {
          platform: "doordash",
          store: "33596565",
          live: false,
          note: "temporarily deactivated (POS outage)",
        },
      ],
      { stLeonard: "17679975320192778617" },
    ),
    phone: null,
    email: null,
  },
  {
    id: "bmbd",
    domain: "bmbd.ca",
    name: "Bin Molle & Bin Dure",
    alternateNames: ["Crèmerie Bin Molle Bin Dure"],
    icon: "cone",
    primary: "#3550a8",
    accent: "#ffb3d4",
    accent2: "#9fe3ff",
    cuisine: { en: ["Ice cream shop", "Desserts"], fr: ["Crèmerie", "Desserts"] },
    hook: { en: ["Craving", "dessert?"], fr: ["Envie d’un", "dessert ?"] },
    description: {
      fr: `Bin Molle & Bin Dure, c’est la crèmerie et le comptoir à desserts du quartier : slush glacée, gaufres, crêpes, cheesecakes et gâteaux, préparés ${KITCHENS_FR}.`,
      en: `Bin Molle & Bin Dure is the neighbourhood ice cream and dessert counter: icy slush, waffles, crêpes, cheesecakes and cakes, made ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Une slush bleue ou rouge, du petit au grand format, une gaufre ou une crêpe avec le coulis de votre choix : le dessert parfait après le souper.",
        "Pour fêter : cheesecake Oreo, pistache, amaretto ou aux brisures de chocolat, gâteau Skor ou red velvet, à la pointe ou en gâteau complet. Et un root beer ou un cream soda bien froid.",
      ],
      en: [
        "A blue or red slush, small to large, a waffle or a crêpe with the sauce you choose: the perfect dessert after dinner.",
        "To celebrate: Oreo, pistachio, amaretto or chocolate chip cheesecake, Skor or red velvet cake, by the slice or whole. And an ice-cold root beer or cream soda.",
      ],
    },
    menu: [
      {
        title: { fr: "Glacé et sucré", en: "Icy and sweet" },
        items: [
          "XBC44J0XGW846",
          "4RZHQEWZ5EZ8W",
          "FM3GRQBRXJT5M",
          "BMVW3SX774K7G",
          "E2D6NW8BY4ZNR",
        ],
      },
      {
        title: { fr: "Cheesecakes et gâteaux", en: "Cheesecakes and cakes" },
        items: [
          "9BH4C37D32D98",
          "6JV0JDXBMS79A",
          "CN917JJCM514Y",
          "XKXMJ1EQ0XT9T",
          "9VT6C1M23DNAR",
          "Z68DXWMMA7B6W",
        ],
      },
    ],
    heroItems: ["4RZHQEWZ5EZ8W", "XBC44J0XGW846", "9BH4C37D32D98"],
    kitchens: both(
      [
        {
          platform: "ubereats",
          uuid: "3ca49ac1-fb4c-562d-b066-0389875f24eb",
          slug: "bin-molle-%26-bin-dure-ndg",
          live: true,
        },
        { platform: "doordash", store: "28108457", live: false, note: "inactive" },
      ],
      [
        {
          platform: "ubereats",
          uuid: "7656b055-48d1-5f46-a6a7-2a0d23668c0b",
          slug: "bin-molle-%26-bin-dure-hochelaga",
          live: true,
        },
        { platform: "doordash", store: "33598151", live: false, note: "inactive" },
      ],
      { ndg: "5723855720782944465" },
    ),
    phone: null,
    email: null,
  },
  {
    id: "ocrepe",
    domain: "ocrepe.ca",
    name: "OCRÊPE",
    alternateNames: ["O'Crêpe"],
    icon: "crepe",
    primary: "#7a2f86",
    accent: "#ffa8d8",
    accent2: "#ffd38a",
    cuisine: { en: ["Crêpes", "Waffles", "Desserts"], fr: ["Crêpes", "Gaufres", "Desserts"] },
    hook: { en: ["Craving a", "crêpe?"], fr: ["Envie d’une", "crêpe ?"] },
    description: {
      fr: `OCRÊPE prépare des crêpes et des gaufres avec le coulis de votre choix, des gâteaux Nutella, Ferrero Rocher et Oréo, ${KITCHENS_FR}.`,
      en: `OCRÊPE makes crêpes and waffles with the sauce you choose, plus Nutella, Ferrero Rocher and Oreo cakes, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Chaque crêpe et chaque gaufre vient avec un choix de coulis. Ajoutez des garnitures sucrées pour une collation ou un dessert à partager.",
        "Pour finir le repas : gâteau Nutella, Ferrero Rocher ou Oréo, cheesecake Oreo, une slush bien glacée ou une boisson gazeuse.",
      ],
      en: [
        "Every crêpe and every waffle comes with a choice of sauce. Add sweet toppings for a snack or a dessert to share.",
        "To finish the meal: Nutella, Ferrero Rocher or Oreo cake, Oreo cheesecake, an icy slush or a soft drink.",
      ],
    },
    menu: [
      {
        title: { fr: "Crêpes, gaufres et gâteaux", en: "Crêpes, waffles and cakes" },
        items: [
          "FM3GRQBRXJT5M",
          "4RZHQEWZ5EZ8W",
          "PKW78B88KZHPY",
          "E7T25Y1XPHN3A",
          "9PZ89C9Y5VJA0",
          "9BH4C37D32D98",
        ],
      },
      {
        title: { fr: "Pour boire", en: "Drinks" },
        items: ["XBC44J0XGW846", "6CE1CW5KW31MT", "JX7E4HAPBSHAA", "SVDF5RFFFHAPY"],
      },
    ],
    heroItems: ["FM3GRQBRXJT5M", "4RZHQEWZ5EZ8W", "PKW78B88KZHPY"],
    kitchens: both(
      [
        { platform: "doordash", store: "27986646", live: false, note: "inactive (POS outage)" },
        {
          platform: "ubereats",
          uuid: "f9c5fa6b-8353-53f9-ac13-68596b3a21ae",
          slug: "ocrepe-montreal",
          live: false,
          note: "hidden",
        },
      ],
      [{ platform: "doordash", store: "33596721", live: false, note: "inactive" }],
    ),
    phone: null,
    email: null,
  },
  {
    id: "viennoise",
    domain: "viennoise.ca",
    // viennoise.ca carries Gâteau Montréal (owner: "gateaumtl = viennoise"), the name on its Google profile.
    name: "Gâteau Montréal",
    alternateNames: ["La Viennoise", "Gâteaux Montréal"],
    icon: "cake",
    primary: "#7a3e1d",
    accent: "#f0bf72",
    accent2: "#ffd9b3",
    cuisine: {
      en: ["Pastry", "Cakes", "Cheesecakes"],
      fr: ["Pâtisserie", "Gâteaux", "Cheesecakes"],
    },
    hook: { en: ["Craving", "cake?"], fr: ["Envie d’un", "gâteau ?"] },
    description: {
      fr: `Gâteau Montréal (La Viennoise), c’est la pâtisserie du quartier : gâteaux Ferrero Rocher, red velvet, carotte, citron, Skor et cheesecakes, à la pointe ou entiers, préparés ${KITCHENS_FR}.`,
      en: `Gâteau Montréal (La Viennoise) is the neighbourhood pastry shop: Ferrero Rocher, red velvet, carrot, lemon and Skor cakes and cheesecakes, by the slice or whole, made ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Chaque gâteau se commande à la pointe ou entier, pour un anniversaire, un souper en famille ou une petite gâterie. Ajoutez un coulis ou des garnitures.",
        "Nos favoris : le Ferrero Rocher, le red velvet et le gâteau aux carottes. Côté cheesecake : pistache et amaretto.",
      ],
      en: [
        "Every cake comes by the slice or whole, for a birthday, a family dinner or a small treat. Add a sauce or toppings.",
        "Our favourites: Ferrero Rocher, red velvet and carrot cake. For cheesecake: pistachio and amaretto.",
      ],
    },
    menu: [
      {
        title: { fr: "Gâteaux", en: "Cakes" },
        items: [
          "E7T25Y1XPHN3A",
          "Z68DXWMMA7B6W",
          "T12CC1Z7W38ZM",
          "QBQDDD7V8TG68",
          "9VT6C1M23DNAR",
          "PKW78B88KZHPY",
          "XG8BV51VSMRG4",
          "9PZ89C9Y5VJA0",
        ],
      },
      {
        title: { fr: "Cheesecakes", en: "Cheesecakes" },
        items: ["6JV0JDXBMS79A", "CN917JJCM514Y"],
      },
    ],
    heroItems: ["E7T25Y1XPHN3A", "Z68DXWMMA7B6W", "6JV0JDXBMS79A"],
    kitchens: both(
      [
        {
          platform: "ubereats",
          uuid: "c20d55f1-661a-56d6-b1db-bd792423b777",
          slug: "gateaux-montreal-ndg",
          live: true,
          note: "Uber store named Gâteaux Montreal (NDG)",
        },
        { platform: "doordash", store: "28114454", live: false, note: "Gâteau Montréal, inactive" },
      ],
      [
        {
          platform: "ubereats",
          uuid: "d4e00c50-971f-5eb4-afa2-d48231f98a48",
          slug: "gateaux-montreal-hochelaga",
          live: true,
          note: "Uber store named Gâteaux Montreal (Hochelaga), paused",
        },
        {
          platform: "doordash",
          store: "33521453",
          live: false,
          note: "Gâteau Montréal, operations suspended",
        },
      ],
    ),
    phone: null,
    email: null,
  },
  {
    id: "tacomontreal",
    domain: "tacomontreal.ca",
    name: "Taco Mexican",
    icon: "taco",
    primary: "#b0251c",
    accent: "#ffd23f",
    accent2: "#8fe39a",
    cuisine: {
      en: ["Mexican", "Tacos", "Burritos", "Nachos"],
      fr: ["Mexicain", "Tacos", "Burritos", "Nachos"],
    },
    hook: { en: ["Craving", "tacos?"], fr: ["Envie de", "tacos ?"] },
    description: {
      fr: `Taco Mexican prépare tacos, burritos, quesadillas et nachos au poulet, au steak, au bœuf ou aux haricots noirs, ${KITCHENS_FR}.`,
      en: `Taco Mexican makes tacos, burritos, quesadillas and nachos with chicken, steak, beef or black beans, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Les tacos se commandent à l’unité ou en trio familial. Les burritos et les quesadillas viennent avec les garnitures de votre choix.",
        "Pour partager : nachos au bœuf, au poulet ou au fromage en sauce. Une version végétarienne aux haricots noirs est offerte.",
      ],
      en: [
        "Tacos come one at a time or as a family trio. Burritos and quesadillas come with the toppings you choose.",
        "To share: beef, chicken or cheese sauce nachos. A vegetarian black bean version is available.",
      ],
    },
    menu: [
      {
        title: { fr: "Tacos et burritos", en: "Tacos and burritos" },
        items: [
          "JDE3K8K9ETDB2",
          "CC2JG7EYN9QTG",
          "9VT50FXQ4RFA6",
          "TJFWSWFXW2XDP",
          "D7D8QVXBP0HSJ",
          "Q8T19M23HZB8P",
        ],
      },
      {
        title: {
          fr: "Quesadillas, nachos et trio familial",
          en: "Quesadillas, nachos and family trio",
        },
        items: [
          "G9ZZ2BG8P5J7P",
          "7EF6BC6506X2A",
          "DAZQFAT9RX7DY",
          "43W3XWAZ78VKA",
          "HY7370H42A8PJ",
          "MT73HS8BAH52C",
        ],
      },
    ],
    heroItems: ["JDE3K8K9ETDB2", "43W3XWAZ78VKA", "TJFWSWFXW2XDP"],
    kitchens: both(
      [
        { platform: "doordash", store: "30831008", live: false, note: "deactivated (integration)" },
        {
          platform: "ubereats",
          uuid: "d2288211-7239-5e8e-97f1-df156c9ff71a",
          slug: "taco-mexican-montreal",
          live: false,
          note: "hidden",
        },
      ],
      [{ platform: "doordash", store: "33597179", live: false, note: "inactive (POS outage)" }],
    ),
    phone: null,
    email: null,
  },
  {
    id: "inntime",
    domain: "inntime.ca",
    name: "Pizza Inntime",
    icon: "pizza",
    primary: "#9a1f17",
    accent: "#ffb703",
    accent2: "#ff8a3d",
    cuisine: { en: ["Pizzeria", "Pizza"], fr: ["Pizzeria", "Pizza"] },
    hook: { en: ["Craving", "pizza?"], fr: ["Envie de", "pizza ?"] },
    description: {
      fr: `Pizza Inntime sort du four des pizzas toute garnie, pepperonata, napolitaine, végétarienne, au poulet ou au bacon, et des combos pizza-poutine, ${KITCHENS_FR}.`,
      en: `Pizza Inntime bakes all-dressed, pepperonata, Neapolitan, vegetarian, chicken and bacon pizzas, plus pizza-and-poutine deals, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Nos classiques : toute garnie, pepperonata, napolitaine et végétarienne, au poulet ou au bacon. Le pain magique au fromage accompagne tout.",
        "Pour les soirées en groupe : deux pizzas moyennes ou deux larges, ou une pizza avec sa poutine, de la petite à la grande.",
      ],
      en: [
        "Our classics: all-dressed, pepperonata, Neapolitan and vegetarian, chicken or bacon. Cheesy magic bread goes with everything.",
        "For a night with friends: two medium or two large pizzas, or a pizza with its poutine, small to large.",
      ],
    },
    menu: [
      {
        title: { fr: "Pizzas", en: "Pizzas" },
        items: [
          "FYJ5QXV8R7VT2",
          "CZKGWVHP85VFT",
          "9Y4WYNJW8FG3P",
          "PV7K48EG1460E",
          "4CPFQG1YBKJZC",
          "KEZWKV1KF0YBW",
        ],
      },
      {
        title: { fr: "Pour partager", en: "To share" },
        items: [
          "YDFQHHE9JCVEJ",
          "EMNACV94ZBWBM",
          "WYEF3AJ5BY34P",
          "YC4VER80RB8HW",
          "R7VQ76BQP03Q6",
          "BEJCK56NNWTQW",
        ],
      },
    ],
    heroItems: ["FYJ5QXV8R7VT2", "YDFQHHE9JCVEJ", "R7VQ76BQP03Q6"],
    kitchens: both(
      [
        { platform: "doordash", store: "28519423", live: false, note: "inactive (POS outage)" },
        {
          platform: "ubereats",
          uuid: "5d836bb5-7e95-5c65-a28f-d0066818349e",
          slug: "pizza-inntime-montreal",
          live: false,
          note: "hidden",
        },
      ],
      [],
    ),
    phone: null,
    email: null,
  },
  {
    id: "pizzaalgerie",
    domain: "pizzaalgerie.pppmtl.com",
    name: "Pizza Algérie",
    icon: "pizza",
    primary: "#166534",
    accent: "#ffffff",
    accent2: "#ff6b6b",
    cuisine: { en: ["Pizza", "Pizza combos"], fr: ["Pizza", "Combos pizza"] },
    hook: { en: ["Craving a", "pizza combo?"], fr: ["Envie d’un", "combo pizza ?"] },
    description: {
      fr: "Pizza Algérie, ce sont des combos pizza avec pilons frits, ailes ou sous-marin, la pizza Philly steak et le pain magique, préparés dans notre cuisine de Notre-Dame-de-Grâce (NDG), au 6280 avenue Somerled, à Montréal.",
      en: "Pizza Algérie makes pizza combos with fried drumsticks, wings or a sub, the Philly steak pizza and magic bread, in our kitchen in Notre-Dame-de-Grâce (NDG), 6280 Somerled Avenue, Montréal.",
    },
    about: {
      fr: [
        "Les combos : une pizza avec des pilons frits, des ailes ou un sous-marin, frites, salade, sauce et Pepsi, de la bambino à la large. Ou deux pizzas Deluxe moyennes.",
        "À la carte : la pizza Philly steak et le pain magique.",
      ],
      en: [
        "The combos: a pizza with fried drumsticks, wings or a sub, fries, salad, sauce and Pepsi, from bambino to large. Or two medium Deluxe pizzas.",
        "À la carte: the Philly steak pizza and magic bread.",
      ],
    },
    menu: [
      {
        title: { fr: "Combos pizza et poulet", en: "Pizza and chicken combos" },
        items: [
          "5DJ702E4C6GGE",
          "26YJMPP5AB5D0",
          "K594K709BHENC",
          "WSB1KXAEQKEBT",
          "9RRZNJ8HDF1QT",
          "T7RZ6YCXJ1R2A",
        ],
      },
      {
        title: { fr: "Pizza, sous-marin et pain magique", en: "Pizza, sub and magic bread" },
        items: ["F2GA9J2HCS7K6", "6P1030ABY1X7C", "BX2FTMCSA82ZE", "1VVFQB0HF3PFG"],
      },
    ],
    heroItems: ["26YJMPP5AB5D0", "BX2FTMCSA82ZE", "T7RZ6YCXJ1R2A"],
    kitchens: [
      {
        kitchen: "ndg",
        orderLinks: [
          {
            platform: "ubereats",
            uuid: "baa21fb9-e843-4667-895e-1fe7d3dbb0ce",
            slug: "pizza-algerie-montreal",
            live: true,
          },
        ],
      },
    ],
    phone: null,
    email: null,
  },
  {
    // Po Poulet: Saint-Léonard only. Po Poulet NDG is never linked or mentioned (owner's order).
    id: "popoulet",
    domain: "popoulet.ca",
    name: "Po Poulet",
    icon: "drumstick",
    primary: "#a3260f",
    accent: "#ffc145",
    accent2: "#ff7b54",
    cuisine: {
      en: ["Fried chicken", "Wings", "Chicken burgers"],
      fr: ["Poulet frit", "Ailes", "Burgers poulet"],
    },
    hook: { en: ["Craving", "fried chicken?"], fr: ["Envie de", "poulet frit ?"] },
    description: {
      fr: "Po Poulet, c’est le poulet frit croustillant à Saint-Léonard : poulet frit en 3, 4, 9 ou 15 morceaux avec frites, salade de chou et sauce, ailes et croquettes, burgers au poulet et salade poulet, au 5839 rue Jean-Talon Est, à Montréal.",
      en: "Po Poulet is crispy fried chicken in Saint-Léonard: 3, 4, 9 or 15 pieces with fries, coleslaw and gravy, wings and nuggets, chicken burgers and chicken salad, at 5839 Jean-Talon Street East, Montréal.",
    },
    about: {
      fr: [
        "Du repas solo de 3 morceaux au festin de 15 morceaux avec frites, sauces, salades de chou et Pepsi. Ailes ou croquettes : 10 morceaux avec frites, sauce et Pepsi.",
        "Aussi : le burger poulet, les trios burgers poulet avec frites ou rondelles d’oignon, et la salade poulet.",
      ],
      en: [
        "From a 3-piece meal for one to a 15-piece feast with fries, gravy, coleslaw and Pepsi. Wings or nuggets: 10 pieces with fries, sauce and Pepsi.",
        "Also: the chicken burger, chicken burger combos with fries or onion rings, and the chicken salad.",
      ],
    },
    menu: [
      {
        title: { fr: "Poulet frit", en: "Fried chicken" },
        items: [
          "1Z3Q6Z3XD36J8",
          "5632F0AR37HG4",
          "JE8906EWHC53T",
          "J7ANNVEQHJDKE",
          "9M2JQR3HE1VD4",
        ],
      },
      {
        title: { fr: "Burgers et salades", en: "Burgers and salads" },
        items: [
          "HT19ENNG0E2QA",
          "ZMJFXFG7DZZJ4",
          "1FWV6D7D22ZA8",
          "Q0RJH1DDQEEVY",
          "YR956YC5NHQQG",
        ],
      },
    ],
    heroItems: ["1Z3Q6Z3XD36J8", "HT19ENNG0E2QA", "J7ANNVEQHJDKE"],
    kitchens: [
      {
        kitchen: "st-leonard",
        orderLinks: [
          {
            platform: "doordash",
            store: "34494017",
            live: false,
            note: "Po Poulet Hochelaga, inactive, to become Po Poulet (Jean-Talon)",
          },
        ],
      },
    ],
    phone: null,
    email: null,
  },
  {
    id: "pouletpoulet",
    domain: "pouletpoulet.popoulet.ca",
    name: "Poulet Poulet",
    alternateNames: ["Poulet Express", "Poulet 24/7"],
    icon: "drumstick",
    primary: "#b45309",
    accent: "#fde047",
    accent2: "#fb923c",
    cuisine: { en: ["Chicken wings", "Nuggets"], fr: ["Ailes de poulet", "Croquettes"] },
    hook: { en: ["Craving", "wings?"], fr: ["Envie", "d’ailes ?"] },
    description: {
      fr: `Poulet Poulet, ce sont les ailes de poulet et les croquettes avec frites, sauce et Pepsi, de 6 à 25 morceaux, et les trios burger ou cheeseburger avec ailes, ${KITCHENS_FR}.`,
      en: `Poulet Poulet is chicken wings and nuggets with fries, sauce and Pepsi, from 6 to 25 pieces, plus burger or cheeseburger combos with wings, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Ailes ou croquettes, au choix : 6, 10, 15 ou 25 morceaux, avec frites, sauces et Pepsi. Une aile de plus ? Elle se commande à l’unité.",
        "Les trios : cheeseburger ou burger poulet avec 6 ailes et une boisson gazeuse. À côté : frites maison, poutine classique et salade de chou.",
      ],
      en: [
        "Wings or nuggets, your choice: 6, 10, 15 or 25 pieces, with fries, sauces and Pepsi. One more wing? Order it by the piece.",
        "The combos: cheeseburger or chicken burger with 6 wings and a soft drink. On the side: house fries, classic poutine and coleslaw.",
      ],
    },
    menu: [
      {
        title: { fr: "Ailes et croquettes", en: "Wings and nuggets" },
        items: [
          "PQTJ2AABECNZG",
          "9M2JQR3HE1VD4",
          "EF46DMNY50B54",
          "GSD85QSS9EY66",
          "9YX4SG4B5KGPC",
        ],
      },
      {
        title: { fr: "Trios et à-côtés", en: "Combos and sides" },
        items: [
          "TXR37X7C4MFQ2",
          "K3GJ1FFGXMXH0",
          "N27C2RAXVV4Y8",
          "7BF0CQ2WDEY2R",
          "YR956YC5NHQQG",
        ],
      },
    ],
    heroItems: ["9M2JQR3HE1VD4", "TXR37X7C4MFQ2", "GSD85QSS9EY66"],
    kitchens: both(
      [
        {
          platform: "doordash",
          store: "32501399",
          live: true,
          note: "Poulet Express, Active (closed)",
        },
        {
          platform: "doordash",
          store: "28719392",
          live: false,
          note: "Poulet Poulet (NDG), inactive",
        },
      ],
      [
        {
          platform: "doordash",
          store: "33597093",
          live: false,
          note: "Poulet Poulet (Hochelaga) at 5839 Jean-Talon, inactive",
        },
      ],
    ),
    phone: null,
    email: null,
  },
  {
    id: "bolon",
    domain: "bolon.ca",
    name: "Café Bolon",
    alternateNames: ["Bolon Café", "Cafe Bolon"],
    icon: "cup",
    primary: "#6b4226",
    accent: "#f2c48d",
    accent2: "#e8a87c",
    cuisine: {
      en: ["Latin American", "Empanadas", "Nachos"],
      fr: ["Latino-américain", "Empanadas", "Nachos"],
    },
    hook: { en: ["Craving", "empanadas?"], fr: ["Envie", "d’empanadas ?"] },
    description: {
      fr: `Café Bolon propose des bouchées d’inspiration latino-américaine : empanadas, quesadillas, nachos et burritos au bœuf, au steak ou aux haricots noirs, poutine et sous-marin tacos, et des crêpes et gaufres pour le dessert, ${KITCHENS_FR}.`,
      en: `Café Bolon offers Latin American-inspired bites: empanadas, quesadillas, nachos and burritos with beef, steak or black beans, taco poutine and taco sub, and crêpes and waffles for dessert, ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Pour grignoter : empanadas, nachos au steak ou aux haricots noirs, quesadillas au bœuf ou aux haricots noirs. Pour un repas : burrito aux haricots noirs, assiette de viande à tacos, sous-marin ou poutine tacos.",
        "Pour le dessert : une crêpe ou une gaufre avec le coulis de votre choix.",
      ],
      en: [
        "To snack: empanadas, steak or black bean nachos, beef or black bean quesadillas. For a meal: black bean burrito, taco meat plate, taco sub or taco poutine.",
        "For dessert: a crêpe or a waffle with the sauce you choose.",
      ],
    },
    menu: [
      {
        title: { fr: "Bouchées latino", en: "Latin bites" },
        items: [
          "GRY1026TH1T6M",
          "NRZZ3XN458F8E",
          "PSV66A91RNA7E",
          "XN2YG06BHX63W",
          "TQ3WPBPYVFH20",
          "CSH40D9HQ784J",
        ],
      },
      {
        title: { fr: "Repas tacos et desserts", en: "Taco meals and desserts" },
        items: [
          "XTQBFGSREN6WP",
          "9CJ0N85E1WPNY",
          "BGMKG4QVXZXV2",
          "FM3GRQBRXJT5M",
          "4RZHQEWZ5EZ8W",
        ],
      },
    ],
    heroItems: ["GRY1026TH1T6M", "NRZZ3XN458F8E", "XTQBFGSREN6WP"],
    kitchens: both(
      [
        {
          platform: "ubereats",
          uuid: "8d911a03-247c-53a2-92da-593808f33592",
          slug: "bolon-cafe-ndg",
          live: true,
        },
        { platform: "doordash", store: "30831269", live: false, note: "deactivated" },
      ],
      [
        {
          platform: "ubereats",
          uuid: "8179598e-a40f-509e-8b03-59ce49d57d77",
          slug: "bolon-cafe-hochelaga",
          live: false,
          note: "not visible",
        },
      ],
      { ndg: "13512885180808196559", stLeonard: "9510640660342127576" },
    ),
    phone: null,
    email: null,
  },
  {
    id: "placeafrique",
    domain: "placeafrique.bolon.ca",
    name: "Place Afrique",
    alternateNames: ["Place d'Afrique"],
    icon: "flame",
    primary: "#9a3412",
    accent: "#fbbf24",
    accent2: "#4ade80",
    cuisine: { en: ["Grill", "Snacks"], fr: ["Grillades", "Bouchées"] },
    hook: { en: ["Craving", "skewers?"], fr: ["Envie de", "brochettes ?"] },
    description: {
      fr: `Place Afrique propose samoussas, pâtés jamaïcains, empanadas et assiettes de brochettes et de souvlaki grillés, préparés ${KITCHENS_FR}.`,
      en: `Place Afrique offers samosas, Jamaican patties, empanadas and grilled skewer and souvlaki plates, made ${KITCHENS_EN}.`,
    },
    about: {
      fr: [
        "Pour grignoter : samoussas, pâté jamaïcain et empanadas. Pour un vrai repas : deux assiettes de deux brochettes, poulet ou porc, avec breuvages.",
        "À côté : pilon de poulet, salade de chou, frites maison et un ginger ale bien froid.",
      ],
      en: [
        "To snack: samosas, Jamaican patty and empanadas. For a real meal: two plates of two skewers, chicken or pork, with drinks.",
        "On the side: chicken drumstick, coleslaw, house fries and an ice-cold ginger ale.",
      ],
    },
    menu: [
      {
        title: { fr: "Bouchées", en: "Snacks" },
        items: ["RGHG7YHPHPY1A", "0WJWVRF0E30HY", "GRY1026TH1T6M"],
      },
      {
        title: { fr: "Grillades et à-côtés", en: "Grill and sides" },
        items: [
          "H5QAG8XDM7KC0",
          "D74FME072WNFE",
          "93A61ZY15KTWY",
          "DMC178ED7GTPC",
          "YR956YC5NHQQG",
          "N27C2RAXVV4Y8",
          "Z98BT09DS5GRT",
        ],
      },
    ],
    heroItems: ["H5QAG8XDM7KC0", "RGHG7YHPHPY1A", "0WJWVRF0E30HY"],
    kitchens: both([], []),
    phone: null,
    email: null,
  },
];

export const DEFAULT_BRAND_ID: BrandId = "ppp";

const byId = new Map(BRANDS.map((b) => [b.id, b]));

export function getBrand(id: BrandId): Brand {
  return byId.get(id) ?? (byId.get(DEFAULT_BRAND_ID) as Brand);
}

/**
 * Host → brand. Accepts the brand host itself, `www.` and `preview.` in front of it, Coolify / sslip preview hosts
 * (`ooeuf-ca.31-220-96-134.sslip.io`: first label = the host with dashes) and local hosts (`ooeuf.localhost`,
 * `ooeuf-ca.localhost`). Anything else is PPP.
 */
export function resolveBrandId(rawHost: string | null | undefined): BrandId {
  const host = (rawHost ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  if (!host) return DEFAULT_BRAND_ID;

  const bare = host.replace(/^(www|preview)\./, "");
  const exact = BRANDS.find((b) => b.domain === bare);
  if (exact) return exact.id;

  const first = host.split(".")[0] ?? "";
  if (/\.(sslip|nip)\.io$/.test(host) || host.endsWith(".localhost")) {
    const dashed = BRANDS.find((b) => b.domain.replace(/\./g, "-") === first);
    if (dashed) return dashed.id;
    const named = BRANDS.find((b) => b.id === first);
    if (named) return named.id;
  }
  return DEFAULT_BRAND_ID;
}

/** True on preview hosts (never indexed by search engines). */
export function isPreviewHost(rawHost: string | null | undefined): boolean {
  const host = (rawHost ?? "").toLowerCase().replace(/:\d+$/, "");
  return (
    /\.(sslip|nip)\.io$/.test(host) ||
    host.startsWith("preview.") ||
    host.endsWith(".localhost") ||
    host === "localhost"
  );
}

export function brandOrigin(brand: Brand): string {
  return `https://${brand.domain}`;
}

export function brandPhone(brand: Brand): { display: string; e164: string } {
  return brand.phone ?? GROUP_PHONE;
}

export const PLATFORM_NAMES: Record<OrderLink["platform"], string> = {
  doordash: "DoorDash",
  ubereats: "Uber Eats",
  skip: "SkipTheDishes",
};

/** The store page on the delivery app, in the visitor's language. */
export function orderLinkUrl(link: OrderLink, lang: "en" | "fr" | "es"): string {
  if (link.platform === "doordash") {
    return `https://www.doordash.com/${lang === "fr" ? "fr-CA" : "en-CA"}/store/${link.store}/`;
  }
  if (link.platform === "ubereats") {
    const id = uuidToBase64Url(link.uuid);
    return `https://www.ubereats.com/${lang === "fr" ? "ca-fr" : "ca"}/store/${link.slug}/${id}`;
  }
  return link.url;
}

/** Uber Eats store pages use the store uuid as 16 bytes in base64url (no padding). */
export function uuidToBase64Url(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error(`bad uuid ${uuid}`);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = (hex.match(/../g) ?? []).map((h) => parseInt(h, 16));
  const at = (i: number) => alphabet.charAt(i);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a = 0, b = 0, c = 0] = bytes.slice(i, i + 3);
    const n = (a << 16) | (b << 8) | c;
    const left = bytes.length - i;
    out += at((n >> 18) & 63) + at((n >> 12) & 63);
    if (left > 1) out += at((n >> 6) & 63);
    if (left > 2) out += at(n & 63);
  }
  return out;
}

/**
 * Kitchens listed on the "all restaurants" page of a site. Po Poulet's domain lists only Saint-Léonard (Po Poulet
 * NDG is never shown or linked, owner's order).
 */
export function listKitchens(site: Brand): KitchenId[] {
  return site.id === "popoulet" ? ["st-leonard"] : ["ndg", "st-leonard"];
}

/** The kitchen a site shows first: its own brand's first kitchen, if listed. */
export function defaultKitchen(site: Brand, wanted?: KitchenId): KitchenId {
  const options = listKitchens(site);
  if (wanted && options.includes(wanted)) return wanted;
  const own = site.kitchens.map((k) => k.kitchen).find((k) => options.includes(k));
  return own ?? options[0] ?? "ndg";
}

/** Live links of one kitchen. */
export function liveLinks(brand: Brand, kitchen: KitchenId): OrderLink[] {
  return brand.kitchens.find((k) => k.kitchen === kitchen)?.orderLinks.filter((l) => l.live) ?? [];
}

/** Every Clover id the brand shows (rails in order, no duplicates). */
export function brandDishIds(brand: Brand): string[] {
  return [...new Set(brand.menu.flatMap((r) => r.items))];
}

/** "16:30" → "16 h 30" (fr) / "4:30 PM" (en). */
export function formatTime(hhmm: string, lang: "en" | "fr" | "es"): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  if (lang === "fr") return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function hoursText(kitchen: Kitchen, lang: "en" | "fr" | "es"): string {
  const { opens, closes } = kitchen.hours;
  return lang === "fr"
    ? `Tous les jours, de ${formatTime(opens, "fr")} à ${formatTime(closes, "fr")}`
    : `Every day, ${formatTime(opens, "en")} to ${formatTime(closes, "en")}`;
}
