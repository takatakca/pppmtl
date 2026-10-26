/**
 * Clover option groups as the site's modifier groups. Pure: the overlay uses it with the committed snapshot,
 * the server with the live Clover inventory, so the browser and the server always agree on ids and rules.
 */
import type { ModifierGroup } from "@/data/catalog-types";
import { displayGroupName, displayName, groupNameEn, type CloverInventory } from "./catalog";

/**
 * Clover's cross-sell groups ("Accompagnements suggérés", "Boissons suggérées", "Desserts suggérés").
 * The item sheet already cross-sells once, through its "Complétez votre commande" rail, so these
 * groups never appear as option groups on the sheet.
 */
const SUGGESTED = /sugg/i;

/**
 * Preparation order inside a requirement tier, read off the cleaned customer label:
 * the dish choice / format first, then what comes included with the dish (fries, salad,
 * toppings, condiments), the included sauce, the included breuvage, and only then the
 * paid extras (meat, cheese, sauce, breuvage) and the trio / combo add-ons.
 */
function prepRank(labelFr: string): number {
  const s = labelFr.toLowerCase();
  if (/^(choix|format|grandeur|nombre|assiette ou duo)/.test(s)) return 0;
  if (/^\d/.test(s)) return 1; // included quantities: "2 frites", "6 ailes de poulet"
  if (/inclus/.test(s) && !/^sauce/.test(s) && !/^boisson/.test(s)) return 1;
  if (/^sauce/.test(s) && /inclus/.test(s)) return 2;
  if (/^boisson/.test(s) && /inclus/.test(s)) return 3;
  if (/extra|ajout|^(trio|combo)\b/.test(s)) return 4;
  return 5;
}

/**
 * Required groups first, each tier in preparation order, Clover's order otherwise.
 * Suggested cross-sell groups are excluded. Unavailable options are left out.
 */
export function siteGroupsFor(inventory: CloverInventory, cloverItemId: string): ModifierGroup[] {
  const item = inventory.items.find((i) => i.id === cloverItemId);
  if (!item) return [];
  const byId = new Map(inventory.modifierGroups.map((g) => [g.id, g]));
  const groups = item.modifierGroupIds.flatMap((id): ModifierGroup[] => {
    const g = byId.get(id);
    if (!g || SUGGESTED.test(g.name)) return [];
    const choices = g.modifiers
      .filter((m) => m.available)
      .map((m) => ({
        id: m.slug,
        labelFr: displayName(m.name),
        labelEn: displayName(m.name),
        priceDelta: m.price / 100,
      }));
    if (!choices.length) return [];
    const labelFr = displayGroupName(g.name);
    if (SUGGESTED.test(labelFr)) return [];
    const max = Math.min(g.max, choices.length);
    const min = Math.min(g.min, max);
    return [
      { id: g.id, labelFr, labelEn: groupNameEn(labelFr), required: min > 0, min, max, choices },
    ];
  });
  const tier = (g: ModifierGroup) => (g.required ? 0 : 1);
  return groups
    .map((g, i) => ({ g, i }))
    .sort(
      (a, b) =>
        tier(a.g) - tier(b.g) || prepRank(a.g.labelFr) - prepRank(b.g.labelFr) || a.i - b.i,
    )
    .map(({ g }) => g);
}
