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
  liveLinks,
  orderLinkUrl,
  PLATFORM_NAMES,
  type Brand,
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

/** One factual paragraph: real restaurant, addresses, hours, phone, dishes. */
export function factualAbout(brand: Brand, lang: "fr" | "en"): string {
  const kitchens = brand.kitchens.map((k) => KITCHENS[k.kitchen]);
  const phone = brandPhone(brand).display;
  const dishes = brandItems(brand)
    .slice(0, 6)
    .map((i) => (lang === "fr" ? i.nameFr : i.nameEn));
  if (lang === "fr") {
    const where = kitchens.map((k) => `au ${k.street} (${k.area}, ${k.postalCode})`).join(" et ");
    return (
      `${brand.name} est un restaurant de Montréal avec sa cuisine sur place, ${where}. ` +
      `Ouvert tous les jours. Téléphone : ${phone}. Pour emporter ou en livraison.` +
      (dishes.length ? ` Au menu : ${dishes.join(", ")}.` : "")
    );
  }
  const where = kitchens.map((k) => `${k.street} (${k.area}, ${k.postalCode})`).join(" and ");
  return (
    `${brand.name} is a Montréal restaurant with its own kitchen at ${where}. ` +
    `Open every day. Phone: ${phone}. Pickup or delivery.` +
    (dishes.length ? ` On the menu: ${dishes.join(", ")}.` : "")
  );
}

/** llms.txt for one brand domain (https://llmstxt.org): facts only, French first. */
export function llmsTxt(brand: Brand): string {
  const origin = brandOrigin(brand);
  const phone = brandPhone(brand);
  const lines: string[] = [];
  lines.push(`# ${brand.name}`, "");
  lines.push(`> ${brand.description.fr}`, "");
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
