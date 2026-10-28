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
 * Display sequence for the restaurant preparation flow, regardless of the
 * order Clover exposes modifier groups. NEVER mutate ids, prices, min/max or
 * choice order: these remain authoritative from the live Clover inventory.
 *
 * 0 = base dish / required product choice, 1 = sauces, 2 = garnishes and
 * vegetables, 3 = drinks, 4 = trio upgrades, 5 = combos, 6 = paid extras.
 * Unknown group names stay at the end in their original Clover order.
 */
export function preparationRank(labelFr: string): number {
  const label = labelFr
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  // 'Extra sauces' and 'Boisson extra' are extras, not included choices.
  if (/\b(extra|extras|supplement|supplements|ajout|ajouts)\b/.test(label)) return 6;
  if (/^(en )?trio\b|\boption trio\b/.test(label)) return 4;
  if (/^(en )?combo\b|\boption combo\b/.test(label)) return 5;
  if (/sauce|vinaigrette|trempette|coulis/.test(label)) return 1;
  if (/garniture|legume|salade|condiment|crudite|accompagnement|frite/.test(label)) return 2;
  if (/boisson|breuvage|liqueur|jus|canette|drink/.test(label)) return 3;
  if (/^\d+/.test(label)) return 0;
  if (/^(choix|format|grandeur|taille|nombre|type|cuisson|pain|pate|assiette|portion)/.test(label)) return 0;
  return 7;
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
        tier(a.g) - tier(b.g) || preparationRank(a.g.labelFr) - preparationRank(b.g.labelFr) || a.i - b.i,
    )
    .map(({ g }) => g);
}
