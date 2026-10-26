/**
 * Option (modifier) rules, shared by the item sheet, the cart and the server. Pure.
 *
 * The cart keeps `{ [groupId]: choiceId }`. A group that allows several options keeps them comma-separated
 * (`"tomate,oignon"`), so older carts and every existing reader keep working. Choice ids are slugs (no commas).
 * Groups come from Clover: `min` options required, at most `max`; a price delta (dollars) per option.
 */
import type { ModifierChoice, ModifierGroup } from "@/data/catalog-types";

/** Chosen option per modifier group: `{ [groupId]: "choiceId" | "choiceId,choiceId" }`. */
export type LineSelections = Record<string, string>;

export function groupMin(group: ModifierGroup): number {
  return Math.max(0, group.min ?? (group.required ? 1 : 0));
}

export function groupMax(group: ModifierGroup): number {
  return Math.max(groupMin(group), group.max ?? 1, 1);
}

export function chosenIds(selections: LineSelections, groupId: string): string[] {
  const raw = selections[groupId];
  return raw ? raw.split(",").filter(Boolean) : [];
}

function withGroup(selections: LineSelections, groupId: string, ids: string[]): LineSelections {
  const next = { ...selections };
  if (ids.length) next[groupId] = ids.join(",");
  else delete next[groupId];
  return next;
}

/**
 * Tap on an option. One-option groups swap the choice (a required one cannot be emptied); several-option groups
 * toggle it and refuse a tap beyond the maximum.
 */
export function toggleChoice(
  selections: LineSelections,
  group: ModifierGroup,
  choiceId: string,
): LineSelections {
  const current = chosenIds(selections, group.id);
  const max = groupMax(group);
  if (current.includes(choiceId)) {
    if (max === 1 && groupMin(group) >= 1) return selections;
    return withGroup(
      selections,
      group.id,
      current.filter((c) => c !== choiceId),
    );
  }
  if (max === 1) return withGroup(selections, group.id, [choiceId]);
  if (current.length >= max) return selections;
  return withGroup(selections, group.id, [...current, choiceId]);
}

const usable = (c: ModifierChoice & { available?: boolean }) => c.available !== false;

/** Required groups with a single possible option are chosen for the customer. */
export function defaultSelections(groups: ModifierGroup[]): LineSelections {
  const out: LineSelections = {};
  for (const group of groups) {
    const choices = group.choices.filter(usable);
    if (groupMin(group) >= 1 && choices.length === 1 && choices[0]) out[group.id] = choices[0].id;
  }
  return out;
}

export interface SelectionCheck {
  ok: boolean;
  /** Groups that still need a choice (fewer than their minimum). */
  missing: ModifierGroup[];
  /** Groups with more options than allowed. */
  tooMany: ModifierGroup[];
  /** "groupId" or "groupId:choiceId" that the item does not offer. */
  unknown: string[];
}

export function checkSelections(
  groups: ModifierGroup[],
  selections: LineSelections,
): SelectionCheck {
  const missing: ModifierGroup[] = [];
  const tooMany: ModifierGroup[] = [];
  const unknown: string[] = [];
  const byId = new Map(groups.map((g) => [g.id, g]));
  for (const groupId of Object.keys(selections)) {
    const group = byId.get(groupId);
    if (!group) {
      unknown.push(groupId);
      continue;
    }
    for (const id of chosenIds(selections, groupId)) {
      if (!group.choices.some((c) => c.id === id)) unknown.push(`${groupId}:${id}`);
    }
  }
  for (const group of groups) {
    const count = new Set(chosenIds(selections, group.id)).size;
    if (count < groupMin(group)) missing.push(group);
    if (count > groupMax(group)) tooMany.push(group);
  }
  return { ok: !missing.length && !tooMany.length && !unknown.length, missing, tooMany, unknown };
}

/** The chosen options, group by group, in the item's order. Unknown ids are skipped. */
export function chosenOptions(
  groups: ModifierGroup[],
  selections: LineSelections,
): Array<{ group: ModifierGroup; choices: ModifierChoice[] }> {
  return groups.flatMap((group) => {
    const ids = chosenIds(selections, group.id);
    const choices = group.choices.filter((c) => ids.includes(c.id));
    return choices.length ? [{ group, choices }] : [];
  });
}

/** Dollars added by the chosen options (an option without a published price adds nothing). */
export function optionsTotal(groups: ModifierGroup[], selections: LineSelections): number {
  const cents = chosenOptions(groups, selections).reduce(
    (sum, { choices }) =>
      sum + choices.reduce((s, c) => s + Math.round((c.priceDelta ?? 0) * 100), 0),
    0,
  );
  return cents / 100;
}

/** Only the options the item still offers (old carts, reorders). */
export function keepKnownSelections(
  groups: ModifierGroup[],
  selections: LineSelections,
): LineSelections {
  let out: LineSelections = {};
  for (const group of groups) {
    const ids = chosenIds(selections, group.id).filter((id) =>
      group.choices.some((c) => c.id === id),
    );
    out = withGroup(out, group.id, ids.slice(0, groupMax(group)));
  }
  return out;
}

/** "Sauce: Ail · Trio: Frites + Pepsi (+$5.42)" pieces, in the active language. */
export function selectionSummary(
  groups: ModifierGroup[],
  selections: LineSelections,
  fr: boolean,
): string[] {
  return chosenOptions(groups, selections).map(
    ({ group, choices }) =>
      `${fr ? group.labelFr : group.labelEn}: ${choices.map((c) => (fr ? c.labelFr : c.labelEn)).join(", ")}`,
  );
}

/** Section badge on the item sheet: how many to choose, or that the group is optional. */
export function groupRule(group: ModifierGroup, fr: boolean): string {
  const min = groupMin(group);
  const max = groupMax(group);
  if (min >= 1) {
    if (min === max) return fr ? `Choisissez-en ${min}` : `Choose ${min}`;
    return fr ? `Choisissez-en ${min} à ${max}` : `Choose ${min} to ${max}`;
  }
  if (max > 1 && max < group.choices.length)
    return fr ? `Optionnel · jusqu'à ${max}` : `Optional · up to ${max}`;
  return fr ? "Optionnel" : "Optional";
}
