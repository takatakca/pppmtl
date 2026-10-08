/**
 * Writes src/data/clover/inventory.snapshot.json: the real Clover menu the site shows (names, prices, options).
 *
 *   From the live Clover API (recommended):
 *     CLOVER_API_TOKEN=… CLOVER_MERCHANT_ID=… [CLOVER_ENV=sandbox] npm run clover:snapshot -- --api
 *   From a Clover export kept OUTSIDE this repository (clover-items.json + clover-modifiers.json, prices in $):
 *     npm run clover:snapshot -- --export <clover-items.json> <clover-modifiers.json>
 *
 * The snapshot never contains the merchant id, a token, costs or staff-only items (see catalog.ts for the rules).
 * After it changes, run `npm test`: the map test says if a site slot points at an item Clover no longer sells.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  normalizeCloverInventory,
  type RawCloverInventory,
} from "../../src/lib/integration/providers/clover/catalog.ts";

const OUT = new URL("../../src/data/clover/inventory.snapshot.json", import.meta.url);

type Row = Record<string, unknown>;

function restBase(): string {
  if (process.env["CLOVER_REST_BASE_URL"])
    return process.env["CLOVER_REST_BASE_URL"].replace(/\/$/, "");
  return process.env["CLOVER_ENV"] === "sandbox"
    ? "https://sandbox.dev.clover.com"
    : "https://api.clover.com";
}

async function getAll(path: string, expand: string): Promise<unknown[]> {
  const token = process.env["CLOVER_API_TOKEN"] ?? process.env["CLOVER_API_KEY"];
  const mid = process.env["CLOVER_MERCHANT_ID"];
  if (!token || !mid) throw new Error("Set CLOVER_API_TOKEN and CLOVER_MERCHANT_ID.");
  const out: unknown[] = [];
  for (let offset = 0; offset < 20_000; offset += 1000) {
    const qs = new URLSearchParams({
      limit: "1000",
      offset: String(offset),
      ...(expand ? { expand } : {}),
    });
    const res = await fetch(`${restBase()}/v3/merchants/${encodeURIComponent(mid)}/${path}?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Clover ${path} HTTP ${res.status}`);
    const rows = ((await res.json()) as { elements?: unknown[] }).elements ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function fromApi(): Promise<{ raw: RawCloverInventory; source: string }> {
  const [items, modifierGroups, categories] = await Promise.all([
    getAll("items", "categories,modifierGroups"),
    getAll("modifier_groups", "modifiers"),
    getAll("categories", ""),
  ]);
  return { raw: { items, modifierGroups, categories }, source: "clover-api" };
}

/** The export format (prices in dollars, categories by name) -> Clover API rows. */
function fromExport(
  itemsPath: string,
  groupsPath: string,
): { raw: RawCloverInventory; source: string; at?: string } {
  const it = JSON.parse(readFileSync(itemsPath, "utf8")) as {
    meta?: Row;
    categories: Row[];
    items: Row[];
  };
  const md = JSON.parse(readFileSync(groupsPath, "utf8")) as { modifierGroups: Row[] };
  const byName = new Map(it.categories.map((c) => [String(c["name"]), c]));
  const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
  return {
    source: "clover-export",
    ...(it.meta?.["fetchedAt"] ? { at: new Date(String(it.meta["fetchedAt"])).toISOString() } : {}),
    raw: {
      categories: it.categories,
      items: it.items.map((x) => ({
        ...x,
        hidden: x["hidden"] === true || x["archived"] === true,
        price: cents(x["price"]),
        categories: ((x["categories"] as string[]) ?? []).map(
          (n) => byName.get(n) ?? { id: "", name: n },
        ),
      })),
      modifierGroups: md.modifierGroups.map((g) => ({
        ...g,
        modifiers: ((g["modifiers"] as Row[]) ?? []).map((m) => ({
          ...m,
          price: cents(m["price"]),
        })),
      })),
    },
  };
}

const args = process.argv.slice(2);
const input =
  args[0] === "--export" && args[1] && args[2]
    ? fromExport(args[1], args[2])
    : args[0] === "--api"
      ? await fromApi()
      : null;
if (!input) {
  console.error("Usage: --api  |  --export <clover-items.json> <clover-modifiers.json>");
  process.exit(1);
}
const inventory = normalizeCloverInventory(input.raw, {
  source: input.source,
  ...("at" in input && input.at ? { now: input.at } : {}),
});
writeFileSync(OUT, `${JSON.stringify(inventory, null, 1)}\n`);
console.log(
  `Snapshot: ${inventory.items.length} items, ${inventory.categories.length} categories, ${inventory.modifierGroups.length} option groups.`,
);
