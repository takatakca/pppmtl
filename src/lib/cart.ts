import type { MenuItem, OrderMode } from "@/data/menu";

/** Chosen option per modifier group: `{ [groupId]: choiceId }`. */
export type LineSelections = Record<string, string>;

export interface CartLine {
  lineId: string;
  itemId: string;
  quantity: number;
  /** Free-text kitchen note. Empty string when the guest left it blank. */
  instructions: string;
  /** Snapshot of the price at add time. null when the item has no published price. */
  unitPrice: number | null;
  /** Published option choices. Never carries a price: none is published. */
  selections: LineSelections;
}

export interface CartTotals {
  /** Sum of every line with a known price. */
  knownSubtotal: number;
  /** How many lines could not be priced from the published menu. */
  unpricedLines: number;
  itemCount: number;
}

export function newLine(
  item: MenuItem,
  quantity: number,
  instructions: string,
  selections: LineSelections = {},
): CartLine {
  return {
    lineId: `${item.id}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
    itemId: item.id,
    quantity,
    instructions,
    unitPrice: item.price,
    selections,
  };
}

/** Human-readable summary of a line's chosen options, in the active language. */
export function selectionLabels(item: MenuItem | null, selections: LineSelections, fr: boolean) {
  if (!item?.modifierGroups) return [];
  return item.modifierGroups.flatMap((group) => {
    const choice = group.choices.find((c) => c.id === selections[group.id]);
    if (!choice) return [];
    return [`${fr ? group.labelFr : group.labelEn}: ${fr ? choice.labelFr : choice.labelEn}`];
  });
}

/**
 * Totals are derived only from published prices. Tax, delivery, service fees
 * and tips are intentionally absent — none of them are modelled yet, and the
 * prototype must never show a number it cannot justify.
 */
export function cartTotals(lines: CartLine[]): CartTotals {
  let knownSubtotal = 0;
  let unpricedLines = 0;
  let itemCount = 0;
  for (const line of lines) {
    itemCount += line.quantity;
    if (line.unitPrice === null) unpricedLines += 1;
    else knownSubtotal += line.unitPrice * line.quantity;
  }
  return { knownSubtotal, unpricedLines, itemCount };
}

export function formatPrice(value: number | null, mode?: OrderMode) {
  void mode;
  return value === null ? null : `$${value.toFixed(2)}`;
}
