/**
 * Clover option groups as the site's modifier groups. Pure: the overlay uses it with the committed snapshot,
 * the server with the live Clover inventory, so the browser and the server always agree on ids and rules.
 */
import type { ModifierGroup } from "@/data/catalog-types";
import { displayGroupName, displayName, groupNameEn, type CloverInventory } from "./catalog";

const SUGGESTED = /sugg[ée]r/i;

/** Required groups first, suggested add-ons last, Clover's order otherwise. Unavailable options are left out. */
export function siteGroupsFor(inventory: CloverInventory, cloverItemId: string): ModifierGroup[] {
  const item = inventory.items.find((i) => i.id === cloverItemId);
  if (!item) return [];
  const byId = new Map(inventory.modifierGroups.map((g) => [g.id, g]));
  const groups = item.modifierGroupIds.flatMap((id): ModifierGroup[] => {
    const g = byId.get(id);
    if (!g) return [];
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
    const max = Math.min(g.max, choices.length);
    const min = Math.min(g.min, max);
    return [
      { id: g.id, labelFr, labelEn: groupNameEn(labelFr), required: min > 0, min, max, choices },
    ];
  });
  const rank = (g: ModifierGroup) => (g.required ? 0 : SUGGESTED.test(g.labelFr) ? 2 : 1);
  return groups
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i)
    .map(({ g }) => g);
}
