/**
 * Plain facts about a brand, written the same way everywhere (page "À propos", llms.txt, schema.org), so search
 * engines and AI assistants read the same name, address, phone (NAP), hours and dishes on every surface.
 */
import {
  BRANDS,
  CLOVER_ONLINE_ORDERING_URL,
  KITCHENS,
  brandDishIds,
  brandOrigin,
  brandPhone,
  hoursText,
  formatTime,
  liveLinks,
  orderLinkUrl,
  PLATFORM_NAMES,
  type Brand,
  type ExtraItem,
  type Kitchen,
  type KitchenId,
} from "@/config/brands";
import { cloverItemMap } from "@/config/clover-item-map";
import { menuRepository } from "@/lib/menu-repository";
import type { MenuItem } from "@/data/menu";

const siteIdByClover = new Map(cloverItemMap.map((s) => [s.clover, s.site]));

export function itemForClover(cloverId: string): MenuItem | null {
  const site = siteIdByClover.get(cloverId);
  return site ? menuRepository.getItem(site) : null;
}

export function brandItems(brand: Brand): MenuItem[] {
  return brandDishIds(brand)
    .map(itemForClover)
    .filter((i): i is MenuItem => i !== null);
}

export function kitchenAddress(k: Kitchen): string {
  return `${k.street}, ${k.city}, ${k.region} ${k.postalCode}`;
}

export function googleMapsUrl(cid: string): string {
  return `https://www.google.com/maps?cid=${cid}`;
}

/** Brands cooking in one kitchen (PPP first, then A–Z). */
export function brandsInKitchen(kitchen: KitchenId): Brand[] {
  return BRANDS.filter((b) => b.kitchens.some((k) => k.kitchen === kitchen)).sort((a, b) =>
    a.id === "ppp" ? -1 : b.id === "ppp" ? 1 : a.name.localeCompare(b.name, "fr"),
  );
}

/**
 * Where "Commander" goes first: Clover Online Ordering (pickup at the NDG kitchen) when its page is known, else the
 * site's own order page (also paid on Clover). Only for brands that cook at NDG.
 */
export function primaryOrderUrl(origin: string): { url: string; external: boolean } {
  return CLOVER_ONLINE_ORDERING_URL
    ? { url: CLOVER_ONLINE_ORDERING_URL, external: true }
    : { url: `${origin}/order`, external: false };
}

const price = (n: number | null, lang: "fr" | "en") =>
  n === null ? "" : lang === "fr" ? `${n.toFixed(2).replace(".", ",")} $` : `$${n.toFixed(2)}`;

/** Dishes the brand sells that are not in Clover yet (shown, never in the cart). */
export function brandExtras(brand: Brand): ExtraItem[] {
  return brand.menu.flatMap((r) => r.extras ?? []);
}

/** "3,99 $" or "petit 3,99 $ · grand 4,99 $". */
export function extraPrice(item: ExtraItem, lang: "fr" | "en"): string {
  return item.sizes
    .map((s) => {
      const label = lang === "fr" ? s.labelFr : s.labelEn;
      return `${label ? `${label} ` : ""}${price(s.price, lang)}`;
    })
    .join(" · ");
}

/** "NDG et Saint-Léonard" / "NDG and Saint-Léonard". */
export function kitchenNames(brand: Brand, lang: "fr" | "en"): string {
  const names = brand.kitchens.map((k) =>
    lang === "fr" ? KITCHENS[k.kitchen].labelFr : KITCHENS[k.kitchen].labelEn,
  );
  return names.join(lang === "fr" ? " et " : " and ");
}

/** "ouvert tard (jusqu’à 3 h 15 à NDG)": the latest closing time, never "24 h". */
export function lateText(brand: Brand, lang: "fr" | "en"): string {
  const ndg = brand.kitchens.some((k) => k.kitchen === "ndg");
  const k = KITCHENS[ndg ? "ndg" : "st-leonard"];
  const at = formatTime(k.hours.closes, lang);
  if (lang === "fr") return ndg ? `ouvert tard (jusqu’à ${at} à NDG)` : `ouvert jusqu’à ${at}`;
  return ndg ? `open late (until ${at} in NDG)` : `open until ${at}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** True when a delivery app shows one of the brand's stores today ("livraison" only then). */
export function hasDelivery(brand: Brand): boolean {
  return brand.kitchens.some((k) => liveLinks(brand, k.kitchen).length > 0);
}

/** Where the brand is, for titles: NDG when it cooks there, else "Saint-Léonard" (always with Montréal nearby). */
function mainPlace(brand: Brand): "NDG" | "Saint-Léonard" {
  return brand.kitchens.some((k) => k.kitchen === "ndg") ? "NDG" : "Saint-Léonard";
}

/** "NDG et Saint-Léonard, Montréal": the line under the H1 (KEYWORDS_MASTER §9: "OOEUF, fast food à NDG"). */
export function h1Line(brand: Brand, lang: "fr" | "en"): string {
  const where = kitchenNames(brand, lang);
  return lang === "fr"
    ? `${cap(brand.titleHead)} · fast food à ${where}, Montréal`
    : `${cap(brand.seoDish.en)} · fast food in ${where}, Montréal`;
}

/**
 * Title (≤ 60 characters) and meta description (≤ 155) from KEYWORDS_MASTER §9:
 * "OOEUF : fast food à NDG, ouvert tard | Commander", "Fast food ouvert tard à NDG, jusqu'à 3 h : Big Matt, …".
 * Saint-Léonard alone closes at 23 h: never "ouvert tard" there.
 */
export function brandSeo(brand: Brand): { title: string; description: string } {
  const place = mainPlace(brand);
  const ndg = place === "NDG";
  const late = ndg ? "ouvert tard" : "ouvert jusqu’à 23 h";
  let title = `${brand.name} : ${brand.titleHead} à ${place}, ${late} | Commander`;
  if (title.length > 60) title = `${brand.name} : ${brand.titleHead} à ${place}, ${late}`;
  if (title.length > 60) title = `${brand.name} : ${brand.titleHead} à ${place}`;

  const where = ndg
    ? "à NDG, jusqu’à 3 h"
    : "tous les jours jusqu’à 23 h, à Saint-Léonard (Montréal)";
  const lead = ndg
    ? `${cap(brand.titleHead)} ouvert tard ${where}`
    : `${cap(brand.titleHead)} ouvert ${where}`;
  const order = ndg
    ? `Commandez en ligne, cueillette${hasDelivery(brand) ? " ou livraison" : ""}.`
    : hasDelivery(brand)
      ? "Pour emporter ou en livraison."
      : "Commandez par téléphone, pour emporter.";
  // Its signature dishes when their names read well (not combo formulas like "6 MCX + Frites + …"),
  // else its food words (seoDish).
  const readable = (n: string) => n.length <= 28 && !/[+#(]/.test(n) && n !== n.toUpperCase();
  const dishes = brand.heroItems
    .map(itemForClover)
    .filter((i): i is MenuItem => i !== null)
    .map((i) => i.nameFr)
    .filter(readable);
  const candidates =
    dishes.length >= 2 ? [dishes.slice(0, 3).join(", "), dishes.slice(0, 2).join(", ")] : [];
  candidates.push(brand.seoDish.fr);
  let description = `${lead}. ${order}`;
  for (const list of candidates) {
    const text = `${lead} : ${list}. ${order}`;
    if (text.length <= 155) {
      description = text;
      break;
    }
  }
  return { title, description };
}

/** Search words for schema.org keywords and llms.txt (KEYWORDS_MASTER §8). */
export function brandKeywords(brand: Brand): string[] {
  return brand.keywords;
}

/** Neighbourhoods each kitchen really serves (KEYWORDS_MASTER §5, under 4 km). */
export const AREA_SERVED: Record<KitchenId, string[]> = {
  ndg: ["Notre-Dame-de-Grâce", "Côte-des-Neiges", "Westmount", "Côte-Saint-Luc"],
  "st-leonard": ["Saint-Léonard", "Anjou", "Montréal-Nord", "Saint-Michel"],
};

/** One factual paragraph: real restaurant, addresses, hours, phone, dishes. */
export function factualAbout(brand: Brand, lang: "fr" | "en"): string {
  const kitchens = brand.kitchens.map((k) => KITCHENS[k.kitchen]);
  const phone = brandPhone(brand).display;
  const dishes = brandItems(brand)
    .slice(0, 6)
    .map((i) => (lang === "fr" ? i.nameFr : i.nameEn));
  const extras = brandExtras(brand)
    .slice(0, 4)
    .map((i) => (lang === "fr" ? i.nameFr : i.nameEn).toLowerCase());
  if (lang === "fr") {
    const where = kitchens.map((k) => `au ${k.street} (${k.area}, ${k.postalCode})`).join(" et ");
    return (
      `${brand.name} est un restaurant fast food de Montréal avec sa cuisine sur place, ${where}. ` +
      `Ouvert tous les jours, ${lateText(brand, "fr")}. Téléphone : ${phone}. ${hasDelivery(brand) ? "Livraison et cueillette." : "Pour emporter."}` +
      (dishes.length ? ` Au menu : ${dishes.join(", ")}.` : "") +
      (extras.length ? ` Aussi : ${extras.join(", ")}.` : "")
    );
  }
  const where = kitchens.map((k) => `${k.street} (${k.area}, ${k.postalCode})`).join(" and ");
  return (
    `${brand.name} is a fast-food restaurant in Montréal with its own kitchen at ${where}. ` +
    `Open every day, ${lateText(brand, "en")}. Phone: ${phone}. ${hasDelivery(brand) ? "Delivery and pickup." : "Takeout."}` +
    (dishes.length ? ` On the menu: ${dishes.join(", ")}.` : "") +
    (extras.length ? ` Also: ${extras.join(", ")}.` : "")
  );
}

/** llms.txt for one brand domain (https://llmstxt.org): facts only, French first. */
export function llmsTxt(brand: Brand): string {
  const origin = brandOrigin(brand);
  const phone = brandPhone(brand);
  const lines: string[] = [];
  lines.push(`# ${brand.name}`, "");
  lines.push(`> ${brand.description.fr}`, "");
  lines.push(
    `Type : restaurant fast food (${brand.seoDish.fr}) · ${hasDelivery(brand) ? "livraison et cueillette" : "pour emporter"} · ${lateText(brand, "fr")} · ${kitchenNames(brand, "fr")}, Montréal.`,
    "",
    `Mots-clés : ${brandKeywords(brand).join(", ")}.`,
    "",
  );
  lines.push(factualAbout(brand, "fr"), "");
  lines.push(`English: ${factualAbout(brand, "en")}`, "");
  if (brand.alternateNames?.length)
    lines.push(`Aussi connu sous le nom : ${brand.alternateNames.join(", ")}.`, "");
  lines.push("## Adresses, heures et téléphone");
  for (const { kitchen: id, googleCid } of brand.kitchens) {
    const k = KITCHENS[id];
    lines.push(
      `- ${brand.name} (${k.labelFr}) : ${kitchenAddress(k)}, Canada · ${hoursText(k, "fr")} · ${phone.display}` +
        (googleCid ? ` · Google : ${googleMapsUrl(googleCid)}` : ""),
    );
  }
  lines.push("", "## Commander");
  if (brand.kitchens.some((k) => k.kitchen === "ndg")) {
    const primary = primaryOrderUrl(origin);
    lines.push(`- Commande en ligne directe (Clover, cueillette à NDG) : ${primary.url}`);
  }
  for (const { kitchen: id } of brand.kitchens) {
    for (const link of liveLinks(brand, id)) {
      lines.push(
        `- ${PLATFORM_NAMES[link.platform]} (${KITCHENS[id].labelFr}) : ${orderLinkUrl(link, "fr")}`,
      );
    }
  }
  lines.push(`- Téléphone : ${phone.display}`);
  const items = brandItems(brand);
  if (items.length) {
    lines.push("", "## Menu (prix en dollars canadiens, avant taxes)");
    for (const i of items)
      lines.push(
        `- ${i.nameFr} : ${price(i.price, "fr")}${i.descriptionFr ? ` — ${i.descriptionFr}` : ""}`,
      );
  }
  const extras = brandExtras(brand);
  if (extras.length) {
    lines.push("", "## Aussi au menu (pas encore dans la commande en ligne : par téléphone)");
    for (const x of extras) lines.push(`- ${x.nameFr} : ${extraPrice(x, "fr")}`);
  }
  lines.push("", "## Pages");
  lines.push(`- Accueil et menu : ${origin}/`);
  lines.push(`- Tous les restaurants de la même cuisine : ${origin}/marques`);
  lines.push(`- Menu complet et commande : ${origin}/order`);
  lines.push(`- Cartes-cadeaux : ${origin}/gift-cards`);
  return `${lines.join("\n")}\n`;
}

/** llms.txt on PPP's domain: PPP first, then every brand of the group with its own site. */
export function hubLlmsTxt(): string {
  const ppp = BRANDS.find((b) => b.id === "ppp")!;
  const lines = [
    llmsTxt(ppp).trimEnd(),
    "",
    "## Les restaurants de nos cuisines (NDG et Saint-Léonard)",
  ];
  for (const b of BRANDS.filter((x) => x.id !== "ppp")) {
    const where = b.kitchens.map((k) => KITCHENS[k.kitchen].labelFr).join(" et ");
    lines.push(
      `- ${b.name} (${b.cuisine.fr.join(", ")}) · ${where} : ${brandOrigin(b)}/ · ${brandOrigin(b)}/llms.txt`,
    );
  }
  return `${lines.join("\n")}\n`;
}
