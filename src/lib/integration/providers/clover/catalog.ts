/**
 * Clover inventory, normalised for the PPP site. PURE: no imports, no I/O, no credentials.
 *
 * Used in three places with the same rules:
 *   - `scripts/clover/snapshot.ts` writes `src/data/clover/inventory.snapshot.json` from a Clover export or the API;
 *   - the server re-reads the live inventory with it before every checkout (`api.server.ts`);
 *   - the menu adapter turns it into the universal menu.
 *
 * Rules:
 *   - internal categories never reach a customer: "ARCHIVE · …", "Menu Employés", "INSTORE PROMOTIONS",
 *     "Menu promotionnel" (in-store / staff only). An item filed in any of them is left out entirely;
 *   - hidden items and items without a fixed price (VARIABLE / PER_UNIT) are left out;
 *   - an item Clover marks unavailable (86'd) stays, flagged `available: false`;
 *   - money is in cents; a Clover group with no maximum allows every option.
 */

export interface CloverModifier {
  /** Clover modifier id when known (the API gives it; older exports do not). */
  id: string | null;
  /** Stable id used by the site's cart: the option name as a slug, unique inside its group. */
  slug: string;
  name: string;
  /** Cents. */
  price: number;
  available: boolean;
}

export interface CloverModifierGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  modifiers: CloverModifier[];
}

export interface CloverCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CloverItem {
  id: string;
  name: string;
  /** Cents. */
  price: number;
  description: string | null;
  categoryIds: string[];
  /** In the order Clover lists them on the item. */
  modifierGroupIds: string[];
  available: boolean;
}

export interface CloverInventory {
  source: string;
  generatedAt: string;
  categories: CloverCategory[];
  items: CloverItem[];
  modifierGroups: CloverModifierGroup[];
}

/** Categories that are staff-only, in-store-only or archived. */
export const INTERNAL_CATEGORY =
  /^\s*(archive\b|menu\s+employ|instore\s+promo|in-store\s+promo|menu\s+promotionnel|test\b)/i;

/** The slug rule of the PPP site ids (`sous-marin-steak`, `quesadillas-buf`), capped like the site's ids. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^ -~]/g, "") // "œ", "—", "’" are dropped, as in the site's ids ("quesadillas-buf")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The site's item id rule: the slug cut at 52 characters (a cut can leave a final "-", as the site's ids do). */
export function siteSlug(name: string): string {
  return slugify(name).slice(0, 52);
}

type Raw = Record<string, unknown>;

const asRecord = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const asArray = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  const elements = asRecord(v)["elements"];
  return Array.isArray(elements) ? elements : [];
};
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const int = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

export interface RawCloverInventory {
  /** Clover `GET /v3/merchants/{mId}/items?expand=categories,modifierGroups` rows (price in cents). */
  items: unknown[];
  /** Clover `GET /v3/merchants/{mId}/modifier_groups?expand=modifiers` rows (price in cents). */
  modifierGroups: unknown[];
  /** Clover `GET /v3/merchants/{mId}/categories` rows. */
  categories: unknown[];
}

/** Clover API rows -> the site's normalised inventory. */
export function normalizeCloverInventory(
  raw: RawCloverInventory,
  opts: { source: string; now?: string },
): CloverInventory {
  const categories: CloverCategory[] = raw.categories
    .map(asRecord)
    .filter((c) => str(c["id"]) && !INTERNAL_CATEGORY.test(str(c["name"])))
    .map((c) => ({ id: str(c["id"]), name: str(c["name"]).trim(), sortOrder: int(c["sortOrder"]) }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const visibleCategory = new Set(categories.map((c) => c.id));

  const items: CloverItem[] = [];
  for (const row of raw.items.map(asRecord)) {
    const id = str(row["id"]);
    const name = str(row["name"]).trim();
    if (!id || !name || row["hidden"] === true) continue;
    const priceType = str(row["priceType"] || "FIXED").toUpperCase();
    if (priceType !== "FIXED") continue;
    const cats = asArray(row["categories"]).map(asRecord);
    if (!cats.length || cats.some((c) => INTERNAL_CATEGORY.test(str(c["name"])))) continue;
    const categoryIds = cats.map((c) => str(c["id"])).filter((cid) => visibleCategory.has(cid));
    if (!categoryIds.length) continue;
    const description = str(row["description"]).trim();
    items.push({
      id,
      name,
      price: int(row["price"]),
      description: description || null,
      categoryIds,
      modifierGroupIds: asArray(row["modifierGroups"])
        .map((g) => str(asRecord(g)["id"]))
        .filter(Boolean),
      available: row["available"] !== false,
    });
  }

  const used = new Set(items.flatMap((i) => i.modifierGroupIds));
  const modifierGroups: CloverModifierGroup[] = [];
  for (const row of raw.modifierGroups.map(asRecord)) {
    const id = str(row["id"]);
    if (!used.has(id)) continue;
    const seen = new Set<string>();
    const modifiers: CloverModifier[] = asArray(row["modifiers"])
      .map(asRecord)
      .filter((m) => str(m["name"]).trim())
      .map((m) => {
        const base = slugify(str(m["name"])) || "option";
        let slug = base;
        for (let n = 2; seen.has(slug); n += 1) slug = `${base}-${n}`;
        seen.add(slug);
        return {
          id: str(m["id"]) || null,
          slug,
          name: str(m["name"]).trim(),
          price: int(m["price"]),
          available: m["available"] !== false,
        };
      });
    if (!modifiers.length) continue;
    // Clover: no maximum (null / 0) means any number of the options.
    const maxRaw = int(row["maxAllowed"]);
    const max = maxRaw > 0 ? Math.min(maxRaw, modifiers.length) : modifiers.length;
    const min = Math.min(Math.max(0, int(row["minRequired"])), max);
    modifierGroups.push({ id, name: str(row["name"]).trim() || "Options", min, max, modifiers });
  }
  // Items only point at groups that exist (an empty or unreadable group is dropped).
  const groupIds = new Set(modifierGroups.map((g) => g.id));
  for (const item of items)
    item.modifierGroupIds = item.modifierGroupIds.filter((g) => groupIds.has(g));

  return {
    source: opts.source,
    generatedAt: opts.now ?? new Date().toISOString(),
    categories: categories.filter((c) => items.some((i) => i.categoryIds.includes(c.id))),
    items,
    modifierGroups,
  };
}

/* ------------------------------------------------------------- wording */

const SMALL_WORDS = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "et",
  "ou",
  "en",
  "au",
  "aux",
  "à",
  "a",
]);

/** "CRUSH ORANGE" -> "Crush Orange"; mixed-case names are kept as Clover has them. */
export function displayName(name: string): string {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean !== clean.toUpperCase() || !/[A-ZÀ-Ý]{3}/.test(clean)) return clean;
  return clean
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (i > 0 && (SMALL_WORDS.has(w) || /^[dl]['’]/.test(w))) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/**
 * Clover group names carry staff hints ("SAUCE INCLUS (ASSIETTE+PITA)", "Extra Fromage Pizza #1 (+4.16 $)",
 * "(Mex) Extra Sauces"). The customer sees the plain words; the kitchen ticket keeps Clover's own names.
 */
export function displayGroupName(name: string): string {
  let s = name.replace(/\s+/g, " ").trim();
  s = s.replace(/\(\s*\+?\s*\d+[.,]\d{2}\s*\$\s*\)/g, " "); // "(+4.16 $)"
  s = s.replace(/#\s*\d+/g, " "); // "#1"
  s = s.replace(/^\([^)]*\)\s*/, ""); // "(Mex) …", "(ASSIETTES) …"
  const inner = /\(([^()]*(?:\([^()]*\))?[^()]*)\)\s*$/.exec(s);
  if (inner) {
    const without = s.slice(0, inner.index).trim();
    // Keep the qualifier when it is the only meaning left ("Choix (PITA/WRAP)" -> "Choix pita / wrap").
    s = without.split(" ").length >= 2 ? without : `${without} ${inner[1]!.toLowerCase()}`;
  }
  s = s.replace(/\s+/g, " ").trim();
  // ALL-CAPS names read as a sentence ("BOISSON EXTRA" -> "Boisson extra").
  if (s === s.toUpperCase()) s = s.charAt(0) + s.slice(1).toLowerCase();
  s = s.replace(/\binclus\b/gi, "incluse").replace(/\s*\/\s*/g, " / ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** English for the group names customers see most; anything else keeps its French name. */
const GROUP_EN: Array<[RegExp, string]> = [
  [/^accompagnements sugg/i, "Suggested sides"],
  [/^boissons sugg/i, "Suggested drinks"],
  [/^desserts sugg/i, "Suggested desserts"],
  [/^boisson extra/i, "Extra drink"],
  [/^boisson incluse/i, "Included drink"],
  [/^trio\b/i, "Make it a combo — fries + drink"],
  [/^combo\b.*poutine/i, "Make it a combo — poutine + drink"],
  [/^sauce incluse/i, "Included sauce"],
  [/^condiment incluse/i, "Included condiments"],
  [/^garnitures incluses/i, "Included toppings"],
  [/^frite incluse/i, "Included fries"],
  [/^salade de chou incluse/i, "Included coleslaw"],
  [/^extra sauces?/i, "Extra sauce"],
  [/^extra fromage/i, "Extra cheese"],
  [/^extra viande/i, "Extra meat"],
  [/^extra garniture/i, "Extra topping"],
  [/^ajout de garnitures/i, "Add toppings"],
  [/^ajout de viande/i, "Add meat"],
  [/^extras? poulet/i, "Chicken extras"],
  [/^extra poutine|^extras poutine/i, "Poutine extras"],
  [/^extra coulis|^extras coulis/i, "Extra sauce drizzle"],
  [/^grandeur|^format/i, "Size"],
  [/^choix de pizza/i, "Choose your pizza"],
  [/^choix de salade/i, "Choose your salad"],
  [/^choix du g[âa]teau/i, "Choose your cake"],
  [/^choix\b/i, "Your choice"],
  [/^nombre/i, "How many"],
  [/^assiette ou duo/i, "Plate or duo"],
];

export function groupNameEn(displayFr: string): string {
  for (const [re, en] of GROUP_EN) if (re.test(displayFr)) return en;
  return displayFr;
}

/** "$5.42" — the site's money format. */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
