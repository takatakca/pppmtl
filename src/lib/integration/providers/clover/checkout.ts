/**
 * Clover Hosted Checkout, the pure part: price the cart from the Clover inventory, build the checkout request,
 * check the webhook signature, and word the order for the register and the kitchen. No network, no env reads.
 *
 * Official reference (North America — United States and Canada):
 *   https://docs.clover.com/dev/docs/creating-a-hosted-checkout-session  (POST /invoicingcheckoutservice/v1/checkouts)
 *   https://docs.clover.com/dev/reference/createcheckout                 (customer, redirectUrls, shoppingCart)
 *   https://docs.clover.com/dev/docs/ecomm-hosted-checkout-webhook       (Clover-Signature: t=…,v1=…)
 * Hosted Checkout has no modifier field and does not use the inventory's taxes, so each cart line becomes one
 * Clover line: unit price = item + options, options in the line note, the Clover item id in `itemRefUuid`, and
 * the Québec taxes as `taxRates` on every line.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { checkSelections, chosenOptions, type LineSelections } from "@/lib/modifiers";
import type { CloverInventory } from "./catalog";
import { siteGroupsFor } from "./site-groups";

/* ----------------------------------------------------------- pricing */

export interface CheckoutLineInput {
  /** Site item id (the slot). */
  siteItemId: string;
  quantity: number;
  notes: string;
  selections: LineSelections;
}

export interface PricedCloverLine {
  siteItemId: string;
  cloverItemId: string;
  /** The item's Clover name: what the register and the kitchen know it as. */
  name: string;
  quantity: number;
  /** Cents: the item alone. */
  basePrice: number;
  /** Cents: one unit with its options. */
  unitPrice: number;
  /** Chosen options with their Clover names and prices (cents), in the item's group order. */
  options: Array<{ groupId: string; slug: string; name: string; price: number }>;
  notes: string;
}

export type CloverPriceResult =
  | { ok: true; lines: PricedCloverLine[]; subtotal: number }
  | { ok: false; code: "empty_cart" | "menu_changed" | "item_unavailable"; detail: string };

const MAX_QTY = 50;

/**
 * Every price comes from the Clover inventory, never from the browser. `slotFor` gives the Clover item id of a
 * site item (the map file). Unknown items or options, a missing required option or too many options refuse the
 * cart with `menu_changed`; an item Clover has 86'd refuses it with `item_unavailable`.
 */
export function priceCloverCart(
  lines: CheckoutLineInput[],
  inventory: CloverInventory,
  slotFor: (siteItemId: string) => string | undefined,
): CloverPriceResult {
  if (!lines.length) return { ok: false, code: "empty_cart", detail: "no lines" };
  const items = new Map(inventory.items.map((i) => [i.id, i]));
  const groups = new Map(inventory.modifierGroups.map((g) => [g.id, g]));
  const priced: PricedCloverLine[] = [];
  for (const line of lines) {
    const cloverId = slotFor(line.siteItemId);
    const item = cloverId ? items.get(cloverId) : undefined;
    if (!item)
      return { ok: false, code: "menu_changed", detail: `no Clover item for ${line.siteItemId}` };
    if (!item.available) return { ok: false, code: "item_unavailable", detail: item.name };
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QTY) {
      return { ok: false, code: "menu_changed", detail: `quantity ${line.quantity}` };
    }
    const quantity = line.quantity;
    const siteGroups = siteGroupsFor(inventory, item.id);
    const check = checkSelections(siteGroups, line.selections ?? {});
    if (!check.ok) {
      const what = [
        ...check.missing.map((g) => `missing ${g.labelFr}`),
        ...check.tooMany.map((g) => `too many ${g.labelFr}`),
        ...check.unknown.map((u) => `unknown ${u}`),
      ];
      return { ok: false, code: "menu_changed", detail: `${item.name}: ${what.join(", ")}` };
    }
    const options = chosenOptions(siteGroups, line.selections ?? {}).flatMap(({ group, choices }) =>
      choices.map((c) => {
        const m = groups.get(group.id)?.modifiers.find((x) => x.slug === c.id);
        return { groupId: group.id, slug: c.id, name: m?.name ?? c.labelFr, price: m?.price ?? 0 };
      }),
    );
    const unitPrice = item.price + options.reduce((s, o) => s + o.price, 0);
    priced.push({
      siteItemId: line.siteItemId,
      cloverItemId: item.id,
      name: item.name,
      quantity,
      basePrice: item.price,
      unitPrice,
      options,
      notes: (line.notes ?? "").trim().slice(0, 200),
    });
  }
  return {
    ok: true,
    lines: priced,
    subtotal: priced.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
  };
}

/* ------------------------------------------------------------- taxes */

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

/* --------------------------------------------------- checkout request */

export interface HostedCheckoutLineItem {
  name: string;
  price: number;
  unitQty: number;
  note?: string;
  itemRefUuid?: string;
  taxRates?: Array<{ name: string; rate: number; id?: string }>;
}

export interface HostedCheckoutRequest {
  customer: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  redirectUrls: { success: string; failure: string; cancel: string };
  shoppingCart: { lineItems: HostedCheckoutLineItem[] };
}

const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** "Pita · Sauce à l'Ail · Frites + Pepsi | Note: sans oignon" — what the kitchen reads on the ticket. */
export function lineNote(line: PricedCloverLine): string {
  const opts = line.options.map((o) => o.name).join(" · ");
  return cut([opts, line.notes ? `Note: ${line.notes}` : ""].filter(Boolean).join(" | "), 255);
}

export function splitName(full: string | null): { firstName?: string; lastName?: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  const [first, ...rest] = parts;
  return {
    firstName: cut(first!, 60),
    ...(rest.length ? { lastName: cut(rest.join(" "), 60) } : {}),
  };
}

export function buildHostedCheckoutRequest(input: {
  lines: PricedCloverLine[];
  customer: { name: string | null; phone: string | null; email: string | null };
  taxRates: CloverTaxRate[];
  urls: { success: string; failure: string; cancel: string };
}): HostedCheckoutRequest {
  const phone = (input.customer.phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const taxRates = input.taxRates.map((r) => ({
    name: r.name,
    rate: r.rate,
    ...(r.id ? { id: r.id } : {}),
  }));
  return {
    customer: {
      ...splitName(input.customer.name),
      ...(input.customer.email ? { email: input.customer.email } : {}),
      ...(phone ? { phoneNumber: phone } : {}),
    },
    redirectUrls: input.urls,
    shoppingCart: {
      lineItems: input.lines.map((l) => {
        const note = lineNote(l);
        return {
          name: cut(l.name, 127),
          price: l.unitPrice,
          unitQty: l.quantity,
          ...(note ? { note } : {}),
          itemRefUuid: l.cloverItemId,
          ...(taxRates.length ? { taxRates } : {}),
        };
      }),
    },
  };
}

/* ------------------------------------------------- register wording */

/**
 * Title given to the Clover order once paid. The Food Hub kitchen tablet recognises website orders by this
 * "Site web" prefix (Food Hub task 10), so keep it.
 */
export const WEBSITE_TITLE_PREFIX = "🌐 Site web";

export function websiteOrderTitle(orderNumber: string | null, firstName: string | null): string {
  return cut([WEBSITE_TITLE_PREFIX, orderNumber, firstName].filter(Boolean).join(" · "), 127);
}

export function isWebsiteTitled(title: unknown): boolean {
  return typeof title === "string" && title.startsWith(WEBSITE_TITLE_PREFIX);
}

export function websiteOrderNote(input: {
  site: string;
  customerName: string | null;
  phone: string | null;
  notes: string | null;
}): string {
  return cut(
    [
      `SITE WEB ${input.site}`,
      "POUR EMPORTER / PICKUP",
      "PAYÉ EN LIGNE / PAID ONLINE (Clover)",
      input.customerName,
      input.phone,
      input.notes,
    ]
      .filter(Boolean)
      .join(" | "),
    255,
  );
}

/* ----------------------------------------------------------- webhook */

export const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

export type CloverSignatureCheck =
  "ok" | "missing_secret" | "missing_signature" | "invalid_signature" | "stale_timestamp";

/** `Clover-Signature: t=1642599079,v1=<hex>` = HMAC-SHA256 of `${t}.${rawBody}` with the signing secret. */
export function verifyCloverSignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
  now = Date.now(),
): CloverSignatureCheck {
  if (!secret) return "missing_secret";
  if (!header) return "missing_signature";
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  ) as Record<string, string | undefined>;
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return "missing_signature";
  const seconds = Number(t);
  if (!Number.isFinite(seconds)) return "invalid_signature";
  const ms = seconds > 1e12 ? seconds : seconds * 1000;
  if (Math.abs(now - ms) > WEBHOOK_TOLERANCE_MS) return "stale_timestamp";
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(v1.toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "invalid_signature";
}

export interface HostedCheckoutEvent {
  status: string;
  type: string;
  paymentId: string | null;
  checkoutSessionId: string | null;
  merchantId: string | null;
  message: string | null;
}

/** The webhook body (Clover documents: createdTime, message, status, type, id, merchantId, data). */
export function parseHostedCheckoutEvent(rawBody: string): HostedCheckoutEvent | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  const lower = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const s = (k: string) => {
    const v = lower[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const status = (s("status") ?? "").toUpperCase();
  if (!status) return null;
  return {
    status,
    type: (s("type") ?? "").toUpperCase(),
    paymentId: s("id"),
    checkoutSessionId: s("data"),
    merchantId: s("merchantid"),
    message: s("message"),
  };
}
