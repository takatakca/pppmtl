/**
 * Checkout money rules shared by the checkout page and the server. Pure: no I/O, safe in the browser.
 * All amounts in cents. The server re-prices everything from Clover; the page uses the same rules to show them.
 */

/** A Clover tax rate: `rate` 10 % = 1 000 000 (Clover's unit). The name must exist on the merchant. */
export interface CloverTaxRate {
  name: string;
  rate: number;
  id?: string;
}

/** Québec, prepared food: GST 5 % + QST 9.975 %. Used only when the merchant's own rates cannot be read. */
export const QUEBEC_TAX_RATES: CloverTaxRate[] = [
  { name: "TPS", rate: 500_000 },
  { name: "TVQ", rate: 997_500 },
];

export function taxesFor(subtotalCents: number, rates: CloverTaxRate[]): number {
  return rates.reduce((sum, r) => sum + Math.round((subtotalCents * r.rate) / 10_000_000), 0);
}

/** Tip choices offered at checkout, percent of the food subtotal (before taxes, as is usual in Québec). */
export const TIP_PERCENTS = [10, 15, 18, 20] as const;
export const DEFAULT_TIP_PERCENT = 15;
/** A tip above this is refused as a typo. */
export const MAX_TIP_CENTS = 200_00;

export function tipFromPercent(subtotalCents: number, percent: number): number {
  return Math.round((subtotalCents * percent) / 100);
}

export function isValidTip(tip: unknown): tip is number {
  return typeof tip === "number" && Number.isSafeInteger(tip) && tip >= 0 && tip <= MAX_TIP_CENTS;
}

export interface CheckoutTotals {
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  tip: number;
  total: number;
}

/** Taxes apply to the food and the delivery fee, never to the tip. */
export function checkoutTotals(input: {
  subtotal: number;
  deliveryFee: number;
  tip: number;
  taxRates?: CloverTaxRate[];
}): CheckoutTotals {
  const taxes = taxesFor(input.subtotal + input.deliveryFee, input.taxRates ?? QUEBEC_TAX_RATES);
  return {
    subtotal: input.subtotal,
    deliveryFee: input.deliveryFee,
    taxes,
    tip: input.tip,
    total: input.subtotal + input.deliveryFee + taxes + input.tip,
  };
}
