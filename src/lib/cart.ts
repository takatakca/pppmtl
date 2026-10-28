import type { MenuItem, OrderMode } from "@/data/menu";
import { checkSelections, optionsTotal, selectionSummary, type LineSelections } from "@/lib/modifiers";

/** Chosen option per modifier group: `{ [groupId]: choiceId }` (several options: comma-separated). */
export type { LineSelections };

export interface CartLine {
  lineId: string;
  itemId: string;
  quantity: number;
  /** Free-text kitchen note. Empty string when the guest left it blank. */
  instructions: string;
  /**
   * Price of one unit at add time: the item plus its chosen options (Clover prices). null when the item has no
   * published price. The server prices the order again from Clover before payment.
   */
  unitPrice: number | null;
  /** Chosen options. */
  selections: LineSelections;
}

export interface CartTotals {
  /** Sum of every line with a known price. */
  knownSubtotal: number;
  /** How many lines could not be priced from the published menu. */
  unpricedLines: number;
  itemCount: number;
}

/**
 * The customer cart shares Clover's real min/max modifier rules with server
 * checkout. Reject incomplete or stale lines before they reach the checkout
 * page; never change provider choice ids or prices to make a cart fit.
 */
export function canAddCartLine(
  item: MenuItem,
  quantity: number,
  selections: LineSelections,
  locationId?: string | null,
): boolean {
  return (
    item.isAvailable &&
    (locationId == null || item.locationIds.includes(locationId)) &&
    Number.isSafeInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 50 &&
    checkSelections(item.modifierGroups ?? [], selections).ok
  );
}

/** One unit of the item with these options, in dollars (null without a published price). */
export function unitPriceFor(item: MenuItem, selections: LineSelections): number | null {
  if (item.price === null) return null;
  return Math.round((item.price + optionsTotal(item.modifierGroups ?? [], selections)) * 100) / 100;
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
    unitPrice: unitPriceFor(item, selections),
    selections,
  };
}

/** Human-readable summary of a line's chosen options, in the active language. */
export function selectionLabels(item: MenuItem | null, selections: LineSelections, fr: boolean) {
  if (!item?.modifierGroups) return [];
  return selectionSummary(item.modifierGroups, selections, fr);
}

/**
 * Totals are derived only from published prices. Taxes are added on Clover's payment page; the site never shows
 * a number it cannot justify.
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
