/**
 * Interac e-Transfer through Food Hub — the pure part (no env, no network; safe in the browser and in tests).
 *
 *   - `interacQuote` prices what the customer sees BEFORE committing: subtotal, the Interac fee, the delivery fee
 *     when delivering, Québec taxes and the all-inclusive total (Québec consumer rule). It mirrors Food Hub's
 *     own arithmetic (lib/foodhub/delivery/orders.ts `totalsFor` + lib/foodhub/taxes.ts `foodTaxes`): GST and QST
 *     are each round2(taxable × rate) on subtotal + delivery fee + the Interac fee (Food Hub always taxes the fee),
 *     amounts in dollars rounded to the cent, so Food Hub's re-pricing lands on the same figure (tolerance $0.02).
 *   - `buildInteracWebsiteOrder` shapes the website-order payload of the shared contract (section B, Food Hub
 *     lib/foodhub/delivery/website.ts): `payment: "interac"`, `fees`, `total` (what was displayed), lines and paid
 *     options with `ref`, and `customerToken` + `tenant` for a signed-in customer.
 *   - `parseInteracResponse` reads the instructions Food Hub returns; `interacInstructionRows` words them.
 */

export const INTERAC_FEE_CODE = "interac";
export const INTERAC_FEE_NAME = "Frais Interac e-Transfer";
/** Québec sales taxes on prepared food: GST 5 % + QST 9.975 % (Food Hub lib/foodhub/taxes.ts, province QC). */
export const QC_GST_RATE = 0.05;
export const QC_QST_RATE = 0.09975;
export const QC_TAX_RATE = 0.14975;

/** Food Hub's `round2` (lib/foodhub/config.ts), character for character: dollars to the cent. */
export function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export const centsToDollars = (cents: number): number => round2(cents / 100);
export const dollarsToCents = (dollars: number): number => Math.round(dollars * 100);

export interface InteracQuoteInput {
  /** Cents: every cart line with a published price, options included. */
  subtotalCents: number;
  /** Cents. Always taxed, as Food Hub does (GST + QST on subtotal + delivery fee + fees). */
  interacFeeCents: number;
  /** Cents; 0 for pickup. */
  deliveryFeeCents: number;
}

export interface InteracQuote {
  subtotalCents: number;
  interacFeeCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  /** All included: what the customer commits to. */
  totalCents: number;
}

export function interacQuote(input: InteracQuoteInput): InteracQuote {
  const subtotal = centsToDollars(Math.max(0, input.subtotalCents));
  const fee = centsToDollars(Math.max(0, input.interacFeeCents));
  const delivery = centsToDollars(Math.max(0, input.deliveryFeeCents));
  // Food Hub: foodTaxes(province, subtotal + deliveryFee + fees) — each tax rounded on its own, then summed.
  const taxable = round2(subtotal + delivery + fee);
  const tax = round2(round2(taxable * QC_GST_RATE) + round2(taxable * QC_QST_RATE));
  const total = round2(subtotal + delivery + fee + tax);
  return {
    subtotalCents: dollarsToCents(subtotal),
    interacFeeCents: dollarsToCents(fee),
    deliveryFeeCents: dollarsToCents(delivery),
    taxCents: dollarsToCents(tax),
    totalCents: dollarsToCents(total),
  };
}

/** True when two displayed totals agree within Food Hub's tolerance. */
export function totalsAgree(aCents: number, bCents: number, toleranceCents = 2): boolean {
  return Math.abs(aCents - bCents) <= toleranceCents;
}

/* ------------------------------------------------------------------ payload */

export interface InteracOrderLine {
  /** Site item id (fallback ref). */
  productId: string;
  /** Clover item id when the site maps one: Food Hub re-prices from it (`ref`). */
  providerProductId: string | null;
  name: string;
  quantity: number;
  /** Cents, the item alone. */
  unitPrice: number | null;
  /** `ref`: the Clover modifier id when the site maps one (Food Hub matches a paid option by ref, then by name). */
  modifiers: Array<{ label: string; priceDelta: number | null; ref?: string | null }>;
  notes: string;
}

export interface InteracOrderCustomer {
  name: string | null;
  phone: string | null;
  email: string | null;
  lang: "fr" | "en" | "es";
}

export interface WebsiteOrderFee {
  code: string;
  name: string;
  /** Dollars. */
  amount: number;
}

export interface WebsiteOrderPayload {
  id: string;
  brand: string;
  location: string;
  customer: { name?: string; phone?: string; email?: string; lang: "fr" | "en" };
  fulfillment: "pickup" | "delivery";
  address?: string;
  items: Array<{
    ref: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
    options?: Array<{ ref?: string; name: string; price: number }>;
  }>;
  payment: "interac";
  paid: false;
  fees: WebsiteOrderFee[];
  deliveryFee?: number;
  /** Dollars, all included: exactly what the customer saw. */
  total: number;
  customerToken?: string;
  /** The brand website the customer token belongs to: Food Hub refuses a token of another tenant (403). */
  tenant?: string;
}

export interface BuildInteracOrderInput {
  orderId: string;
  brand: string;
  locationCode: string;
  customer: InteracOrderCustomer;
  fulfillment: "pickup" | "delivery";
  deliveryAddress: string | null;
  lines: InteracOrderLine[];
  quote: InteracQuote;
  customerToken?: string | null;
  /** Sent with the customer token only (FOODHUB_TENANT, default "pppmtl"). */
  tenant?: string | null;
}

const cut = (value: string, max: number) => value.trim().slice(0, max);

export function buildInteracWebsiteOrder(input: BuildInteracOrderInput): WebsiteOrderPayload {
  const customer: WebsiteOrderPayload["customer"] = {
    lang: input.customer.lang === "fr" ? "fr" : "en",
  };
  if (input.customer.name?.trim()) customer.name = cut(input.customer.name, 80);
  if (input.customer.phone?.trim()) customer.phone = cut(input.customer.phone, 40);
  if (input.customer.email?.trim()) customer.email = cut(input.customer.email, 120);

  const payload: WebsiteOrderPayload = {
    id: input.orderId,
    brand: input.brand,
    location: input.locationCode,
    customer,
    fulfillment: input.fulfillment,
    items: input.lines.map((line) => {
      const options = line.modifiers.map((m) => ({
        ...(m.ref?.trim() ? { ref: cut(m.ref, 80) } : {}),
        name: cut(m.label, 80),
        price: centsToDollars(m.priceDelta ?? 0),
      }));
      return {
        ref: line.providerProductId ?? line.productId,
        name: cut(line.name, 120),
        quantity: line.quantity,
        price: centsToDollars(line.unitPrice ?? 0),
        ...(line.notes.trim() ? { notes: cut(line.notes, 200) } : {}),
        ...(options.length ? { options } : {}),
      };
    }),
    payment: "interac",
    paid: false,
    fees: [
      {
        code: INTERAC_FEE_CODE,
        name: INTERAC_FEE_NAME,
        amount: centsToDollars(input.quote.interacFeeCents),
      },
    ],
    total: centsToDollars(input.quote.totalCents),
  };
  if (input.fulfillment === "delivery") {
    if (input.deliveryAddress?.trim()) payload.address = cut(input.deliveryAddress, 500);
    payload.deliveryFee = centsToDollars(input.quote.deliveryFeeCents);
  }
  if (input.customerToken) {
    payload.customerToken = input.customerToken;
    if (input.tenant?.trim()) payload.tenant = cut(input.tenant, 40);
  }
  return payload;
}

/* ----------------------------------------------------------------- response */

export interface InteracInstructions {
  /** Where the customer sends the transfer (the restaurant's Interac e-mail/phone). */
  recipient: string;
  /** Dollars. */
  amount: number;
  /** Message/reference the customer must put on the transfer. */
  reference: string;
  question: string | null;
  autoDeposit: boolean;
  /** ISO deadline after which Food Hub cancels the held order. */
  expiresAt: string | null;
  instructionsFr: string;
  instructionsEn: string;
}

export interface InteracOrderResponse {
  number: string;
  id: string;
  /** Dollars as Food Hub computed it. */
  total: number | null;
  duplicate: boolean;
  interac: InteracInstructions;
  /** Food Hub's tracking page for this order (`trackUrl`, https only), when the brand has one. */
  trackUrl: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const text = (value: unknown, max = 400): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export function parseInteracInstructions(value: unknown): InteracInstructions | null {
  if (!isRecord(value)) return null;
  const recipient = text(value["recipient"], 200);
  const reference = text(value["reference"], 120);
  const amount = Number(value["amount"]);
  if (!recipient || !reference || !Number.isFinite(amount) || amount <= 0) return null;
  return {
    recipient,
    amount: round2(amount),
    reference,
    question: text(value["question"], 200),
    autoDeposit: value["autoDeposit"] === true,
    expiresAt: text(value["expiresAt"], 60),
    instructionsFr: text(value["instructionsFr"], 2000) ?? "",
    instructionsEn: text(value["instructionsEn"], 2000) ?? "",
  };
}

/** A 200 without `interac` means the Food Hub that answered does not run the Interac contract: never a success. */
export function parseInteracResponse(body: unknown): InteracOrderResponse | null {
  if (!isRecord(body) || body["ok"] !== true) return null;
  const number = text(body["number"], 40);
  const id = text(body["id"], 80);
  const interac = parseInteracInstructions(body["interac"]);
  if (!number || !id || !interac) return null;
  const total = Number(body["total"]);
  return {
    number,
    id,
    total: Number.isFinite(total) ? round2(total) : null,
    duplicate: body["duplicate"] === true,
    interac,
    trackUrl: httpsUrl(body["trackUrl"]),
  };
}

/** An absolute https URL, or null: a link is only kept when it is safe to put in an <a href>. */
function httpsUrl(value: unknown): string | null {
  const raw = text(value, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ wording */

export interface InstructionRow {
  key: "recipient" | "amount" | "reference" | "question" | "deadline" | "autoDeposit";
  label: string;
  value: string;
}

function formatMoney(dollars: number, lang: "fr" | "en" | "es"): string {
  return lang === "fr" ? `${dollars.toFixed(2).replace(".", ",")} $` : `$${dollars.toFixed(2)}`;
}

function formatDeadline(iso: string, lang: "fr" | "en" | "es"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(lang === "fr" ? "fr-CA" : lang === "es" ? "es" : "en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: "America/Toronto",
  });
}

/** Rows for the confirmation screen and the receipt, in the customer's language. */
export function interacInstructionRows(
  instructions: InteracInstructions,
  lang: "fr" | "en" | "es",
): InstructionRow[] {
  const fr = lang === "fr";
  const rows: InstructionRow[] = [
    {
      key: "recipient",
      label: fr
        ? "Envoyer le virement à"
        : lang === "es"
          ? "Enviar la transferencia a"
          : "Send the transfer to",
      value: instructions.recipient,
    },
    {
      key: "amount",
      label: fr ? "Montant exact" : lang === "es" ? "Monto exacto" : "Exact amount",
      value: formatMoney(instructions.amount, lang),
    },
    {
      key: "reference",
      label: fr
        ? "Message du virement"
        : lang === "es"
          ? "Mensaje de la transferencia"
          : "Transfer message",
      value: instructions.reference,
    },
  ];
  if (instructions.question) {
    rows.push({
      key: "question",
      label: fr
        ? "Question de sécurité"
        : lang === "es"
          ? "Pregunta de seguridad"
          : "Security question",
      value: instructions.question,
    });
  }
  if (instructions.autoDeposit) {
    rows.push({
      key: "autoDeposit",
      label: fr ? "Dépôt automatique" : lang === "es" ? "Depósito automático" : "Auto-deposit",
      value: fr
        ? "Activé — aucune question de sécurité n'est requise."
        : lang === "es"
          ? "Activado — no se necesita pregunta de seguridad."
          : "On — no security question is needed.",
    });
  }
  if (instructions.expiresAt) {
    rows.push({
      key: "deadline",
      label: fr ? "À envoyer avant" : lang === "es" ? "Enviar antes de" : "Send before",
      value: formatDeadline(instructions.expiresAt, lang),
    });
  }
  return rows;
}

export function interacInstructionText(
  instructions: InteracInstructions,
  lang: "fr" | "en" | "es",
): string {
  return (lang === "fr" ? instructions.instructionsFr : instructions.instructionsEn) || "";
}
