import { categories, menuItems, type Lang, type MenuCategory, type MenuItem } from "@/data/menu";
import { expandFoodTerm } from "@/data/food-terms";

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Words that carry no food meaning in either language. */
const STOP_WORDS = new Set([
  "i",
  "im",
  "a",
  "an",
  "the",
  "want",
  "would",
  "like",
  "looking",
  "for",
  "show",
  "me",
  "some",
  "please",
  "get",
  "give",
  "of",
  "my",
  "with",
  "and",
  "to",
  "do",
  "you",
  "have",
  "any",
  "je",
  "veux",
  "moi",
  "montre",
  "montrez",
  "des",
  "du",
  "de",
  "la",
  "le",
  "les",
  "un",
  "une",
  "cherche",
  "voudrais",
  "avez",
  "vous",
  "svp",
  "sil",
  "plait",
  "yo",
  "quiero",
  "quisiera",
  "dame",
  "por",
  "favor",
  "el",
  "los",
  "las",
  "una",
  "unos",
  "con",
  "para",
  "tienen",
  "tiene",
  "busco",
  "que",
]);

export function tokenize(query: string) {
  return normalize(query)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export interface SearchContext {
  lang: Lang;
  locationId?: string | null;
}

export interface SearchResults {
  query: string;
  terms: string[];
  categories: MenuCategory[];
  items: MenuItem[];
  related: MenuCategory[];
  isEmpty: boolean;
}

/** Deterministic pairing rules — replaceable by a server-side semantic service later. */
const RELATED_CATEGORIES: Record<string, string[]> = {
  "cat-pizza": ["cat-sides", "cat-combos"],
  "cat-chicken": ["cat-pita", "cat-combos"],
  "cat-pita": ["cat-sides", "cat-combos"],
  "cat-burgers": ["cat-sides", "cat-combos"],
  "cat-sides": ["cat-combos", "cat-burgers"],
  "cat-combos": ["cat-sides", "cat-dessert"],
  "cat-dessert": ["cat-combos"],
};

function haystack(parts: Array<string | string[]>) {
  return parts
    .flat()
    .map((p) => normalize(p))
    .join(" | ");
}

/**
 * The catalog is static, so every searchable string is normalized once at
 * module load. Keystroke-time search then only scans short lowercase strings —
 * no per-render normalization of 175 items.
 */
interface ItemIndex {
  names: string;
  aliases: string;
  desc: string;
  options: string;
}

const CATEGORY_INDEX = new Map<string, { names: string; aliases: string; desc: string }>(
  categories.map((c) => [
    c.id,
    {
      names: haystack([c.nameEn, c.nameFr, c.nameEs ?? ""]),
      aliases: haystack([c.aliasesEn, c.aliasesFr, c.aliasesEs ?? []]),
      desc: haystack([c.descriptionEn, c.descriptionFr, c.descriptionEs ?? ""]),
    },
  ]),
);

const ITEM_INDEX = new Map<string, ItemIndex>(
  menuItems.map((i) => [
    i.id,
    {
      names: haystack([i.nameEn, i.nameFr, i.nameEs ?? ""]),
      aliases: haystack([i.aliasesEn, i.aliasesFr, i.aliasesEs ?? []]),
      desc: haystack([i.descriptionEn, i.descriptionFr, i.descriptionEs ?? ""]),
      // Only the choices that define the item (required groups): Clover's add-on groups (extra drink,
      // suggested desserts…) are offered on almost every item and would make every search match everything.
      options: haystack(
        (i.modifierGroups ?? [])
          .filter((g) => g.required)
          .flatMap((g) => [
            g.labelEn,
            g.labelFr,
            ...g.choices.flatMap((c) => [c.labelEn, c.labelFr]),
          ]),
      ),
    },
  ]),
);

/**
 * Each typed term is scored together with its EN/FR/ES equivalents, so a
 * Spanish or French word finds the English catalog entry it refers to.
 */
function variantsOf(term: string) {
  return expandFoodTerm(term);
}

function scoreCategory(cat: MenuCategory, terms: string[]) {
  const idx = CATEGORY_INDEX.get(cat.id);
  if (!idx) return 0;
  const { names, aliases, desc } = idx;
  let score = 0;
  for (const typed of terms) {
    for (const term of variantsOf(typed)) {
      if (names === term) score += 12;
      else if (names.includes(term)) score += 8;
      if (aliases.includes(term)) score += 6;
      if (desc.includes(term)) score += 2;
    }
  }
  return score;
}

function scoreItem(item: MenuItem, terms: string[]) {
  const idx = ITEM_INDEX.get(item.id);
  if (!idx) return 0;
  let score = 0;
  for (const typed of terms) {
    for (const term of variantsOf(typed)) {
      if (idx.names.startsWith(term)) score += 10;
      else if (idx.names.includes(term)) score += 7;
      if (idx.aliases.includes(term)) score += 5;
      if (idx.desc.includes(term)) score += 2;
      if (idx.options.includes(term)) score += 3;
    }
  }
  return score;
}

/**
 * Single search pipeline shared by typed input, voice input and craving chips.
 * Later this signature can be backed by an HTTP/semantic service without UI changes.
 */
export function searchMenu(query: string, context: SearchContext): SearchResults {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return { query, terms, categories: [], items: [], related: [], isEmpty: true };
  }

  const available = menuItems.filter(
    (i) => i.isAvailable && (!context.locationId || i.locationIds.includes(context.locationId)),
  );

  const scoredCats = categories
    .map((c) => ({ c, s: scoreCategory(c, terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const matchedCatIds = new Set(scoredCats.map((x) => x.c.id));

  const scoredItems = available
    .map((i) => ({
      i,
      s: scoreItem(i, terms) + (matchedCatIds.has(i.categoryId) ? 3 : 0),
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const resultCats = scoredCats.map((x) => x.c);
  const relatedIds = new Set<string>();
  for (const c of resultCats.slice(0, 2)) {
    for (const r of RELATED_CATEGORIES[c.id] ?? []) {
      if (!matchedCatIds.has(r)) relatedIds.add(r);
    }
  }

  return {
    query,
    terms,
    categories: resultCats,
    items: scoredItems.map((x) => x.i),
    related: categories.filter((c) => relatedIds.has(c.id)),
    isEmpty: resultCats.length === 0 && scoredItems.length === 0,
  };
}

export function localizedName(
  entity: { nameEn: string; nameFr: string; nameEs?: string },
  lang: Lang,
) {
  if (lang === "fr") return entity.nameFr || entity.nameEn;
  if (lang === "es") return entity.nameEs || entity.nameEn;
  return entity.nameEn;
}

export function localizedDescription(
  entity: { descriptionEn: string; descriptionFr: string; descriptionEs?: string },
  lang: Lang,
) {
  if (lang === "fr") return entity.descriptionFr || entity.descriptionEn;
  if (lang === "es") return entity.descriptionEs || entity.descriptionEn;
  return entity.descriptionEn;
}

/** Splits a label so matched search terms can be emphasized without garish highlighting. */
export function highlightParts(label: string, terms: string[]) {
  if (terms.length === 0) return [{ text: label, match: false }];
  const normalizedLabel = normalize(label);
  const flags = new Array(label.length).fill(false);
  for (const term of terms) {
    let from = 0;
    while (from <= normalizedLabel.length) {
      const idx = normalizedLabel.indexOf(term, from);
      if (idx === -1) break;
      for (let k = idx; k < idx + term.length && k < flags.length; k++) flags[k] = true;
      from = idx + term.length;
    }
  }
  const parts: Array<{ text: string; match: boolean }> = [];
  let current = "";
  let currentFlag = flags[0] ?? false;
  for (let i = 0; i < label.length; i++) {
    const f = flags[i] ?? false;
    if (f !== currentFlag) {
      parts.push({ text: current, match: currentFlag });
      current = "";
      currentFlag = f;
    }
    current += label[i];
  }
  if (current) parts.push({ text: current, match: currentFlag });
  return parts;
}
