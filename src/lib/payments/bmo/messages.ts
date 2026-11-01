/**
 * BMO "Instant Payments - CA" (Interac e-Transfer) messages, built and read as plain JSON. Pure: no I/O.
 * Spec: developer.bmo.com, Instant Payments - CA 4.3.1 (ISO 20022 JSON):
 *   POST …/creditor-payment-activation-request          pain.013 in → pain.014 out   (Request money)
 *   POST …/get-request-for-payment-transaction          camt.005 in → pain.002 out   (status of a request)
 *   Push Notifications 1.1.0  POST <our url>             pain.002 in                   (status updates)
 * Values BMO's spec leaves open are named constants below, to confirm on the sandbox.
 */

/** "Debtor agent" of a request: the customer's bank is unknown when the request is sent (Interac ISO usage). */
export const DEBTOR_AGENT_NOT_PROVIDED = "NOTPROVIDED";
/** BMO's institution number (x-fapi-financial-id "001"); overridable with BMO_CREDITOR_AGENT_ID. */
export const BMO_INSTITUTION = "001";

/** ISO 20022 statuses (BMO FAQ): ACSC / ACCC = settled (money received); RJCT / CANC = refused or cancelled. */
const PAID = new Set(["ACSC", "ACCC"]);
const FAILED = new Set(["RJCT", "CANC"]);
export type RfpOutcome = "paid" | "failed" | "pending";
export function rfpOutcome(status: string | null | undefined): RfpOutcome {
  const s = (status ?? "").trim().toUpperCase();
  return PAID.has(s) ? "paid" : FAILED.has(s) ? "failed" : "pending";
}

const cut = (value: string, max: number) => value.trim().slice(0, max);

/** "(514) 555-0100" → "+1-5145550100" (the spec's phone pattern); null when not a Canadian/US number. */
export function bmoPhone(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `+1-${d}` : null;
}

/** Cents → the spec's 2-decimal number. */
export const toAmount = (cents: number) => Math.round(cents) / 100;

export interface RequestForPaymentInput {
  /** Unique per message, ≤ 35. */
  messageId: string;
  /** Our reference for this request (the order), ≤ 35; comes back in every status. */
  endToEndId: string;
  createdAt: Date;
  expiresAt: Date;
  amountCents: number;
  creditor: { name: string; accountId: string; agentId?: string };
  debtor: { name: string; email: string | null; phone: string | null };
  /** What the customer reads on the Interac request, ≤ 140. */
  description: string;
  /** Where Interac sends the customer back after paying. */
  returnUrl?: string | null;
  /** True: Interac does not e-mail/text the customer; we show the payment link ourselves. */
  suppressResponderNotifications?: boolean;
}

/** pain.013 CreditorPaymentActivationRequest for one Interac money request. */
export function buildRequestForPayment(input: RequestForPaymentInput) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("amount must be positive cents");
  }
  const email = input.debtor.email?.trim() || null;
  const mobile = bmoPhone(input.debtor.phone);
  if (!email && !mobile) throw new Error("the customer needs an e-mail or a mobile number");
  const condition = {
    amountModificationAllowed: false,
    earlyPaymentAllowed: true,
    guaranteedPaymentRequested: false,
  };
  const iso = (d: Date) => d.toISOString();
  return {
    creditorPaymentActivationRequestV07: {
      groupHeader: {
        messageIdentification: cut(input.messageId, 35),
        creationDateTime: iso(input.createdAt),
        numberOfTransactions: "1",
        controlSum: toAmount(input.amountCents).toFixed(2),
        initiatingParty: { name: cut(input.creditor.name, 140) },
      },
      paymentInformation: [
        {
          paymentInformationIdentification: cut(input.messageId, 35),
          paymentMethod: "TRF",
          requestedExecutionDate: { dateTime: iso(input.createdAt) },
          expiryDate: { dateTime: iso(input.expiresAt) },
          paymentCondition: condition,
          debtor: {
            name: cut(input.debtor.name || "Client", 140),
            contactDetails: {
              ...(email ? { emailAddress: cut(email, 2048) } : {}),
              ...(mobile ? { mobileNumber: mobile } : {}),
            },
          },
          debtorAgent: {
            financialInstitutionIdentification: {
              clearingSystemMemberIdentification: {
                memberIdentification: DEBTOR_AGENT_NOT_PROVIDED,
              },
            },
          },
          creditTransferTransaction: [
            {
              paymentIdentification: {
                instructionIdentification: cut(input.endToEndId, 35),
                endToEndIdentification: cut(input.endToEndId, 35),
              },
              paymentCondition: condition,
              amount: {
                instructedAmount: { amount: toAmount(input.amountCents), currency: "CAD" },
              },
              chargeBearer: "SLEV",
              creditorAgent: {
                financialInstitutionIdentification: {
                  clearingSystemMemberIdentification: {
                    memberIdentification: input.creditor.agentId || BMO_INSTITUTION,
                  },
                },
              },
              creditor: { name: cut(input.creditor.name, 140) },
              creditorAccount: {
                identification: { other: { identification: cut(input.creditor.accountId, 34) } },
                currency: "CAD",
              },
              remittanceInformation: { unstructured: [cut(input.description, 140)] },
            },
          ],
        },
      ],
      supplementaryData: [
        {
          envelope: {
            document: {
              suppressResponderNotifications: input.suppressResponderNotifications ?? false,
              ...(input.returnUrl ? { returnURL: input.returnUrl } : {}),
            },
          },
        },
      ],
    },
  };
}

/** camt.005 GetTransaction: the status of one request, by our end-to-end id. */
export function buildRequestStatusQuery(input: {
  messageId: string;
  endToEndId: string;
  now: Date;
}) {
  return {
    getTransactionV08: {
      messageHeader: {
        messageIdentification: cut(input.messageId, 35),
        creationDateTime: input.now.toISOString(),
      },
      transactionQueryDefinition: {
        queryType: "ALLL",
        transactionCriteria: {
          newCriteria: {
            searchCriteria: [
              { paymentSearch: { endToEndIdentification: [cut(input.endToEndId, 35)] } },
            ],
          },
        },
      },
    },
  };
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
const arr = (v: unknown): unknown[] =>
  Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v as Json) : [];
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** A message may arrive bare or still wrapped in { SECURE: { data } } / { data }. */
function unwrap(message: unknown, root: string): Json | null {
  let m = obj(message);
  for (let i = 0; i < 3 && !m[root]; i += 1)
    m = obj(m["SECURE"] ? obj(m["SECURE"])["data"] : m["data"]);
  return m[root] ? obj(m[root]) : null;
}

function reasonOf(list: unknown): string | null {
  const first = obj(arr(list)[0]);
  const reason = obj(first["reason"]);
  const extra = arr(first["additionalInformation"]).filter((x) => typeof x === "string");
  const text = [str(reason["code"]), str(reason["proprietary"]), ...extra]
    .filter(Boolean)
    .join(" · ");
  return text ? text.slice(0, 200) : null;
}

export interface RequestReply {
  /** Status of the request itself (ACTC = accepted and sent to the customer; RJCT = refused). */
  status: string | null;
  reason: string | null;
  reference: string | null;
}

/** pain.014 (reply to Request money). */
export function readRequestReply(message: unknown): RequestReply | null {
  const report = unwrap(message, "creditorPaymentActivationRequestStatusReportV07");
  if (!report) return null;
  const group = obj(report["originalGroupInformationAndStatus"]);
  const tx = obj(
    arr(
      obj(arr(report["originalPaymentInformationAndStatus"])[0])["transactionInformationAndStatus"],
    )[0],
  );
  return {
    status: str(tx["transactionStatus"]) ?? str(group["groupStatus"]),
    reason: reasonOf(tx["statusReasonInformation"]) ?? reasonOf(group["statusReasonInformation"]),
    reference: str(tx["clearingSystemReference"]),
  };
}

export interface PaymentStatus {
  endToEndId: string | null;
  status: string | null;
  reason: string | null;
  /** Cents, when the report carries the amount. */
  amountCents: number | null;
  /** Interac's payment page for this request, when BMO gives it back. */
  gatewayUrl: string | null;
}

/** pain.002 (status query answer or push notification): one entry per transaction. */
export function readPaymentStatus(message: unknown): PaymentStatus[] {
  const report = unwrap(message, "customerPaymentStatusReportV10");
  if (!report) return [];
  const group = obj(report["originalGroupInformationAndStatus"]);
  const out: PaymentStatus[] = [];
  for (const p of arr(report["originalPaymentInformationAndStatus"])) {
    const info = obj(p);
    const gateway = arr(info["supplementaryData"])
      .map((s) => str(obj(obj(obj(s)["envelope"])["Document"])["gatewayURL"]))
      .find(Boolean);
    for (const t of arr(info["transactionInformationAndStatus"])) {
      const tx = obj(t);
      const original = obj(tx["originalTransactionReference"]);
      const amount =
        obj(obj(original["amount"])["instructedAmount"])["amount"] ??
        obj(original["interbankSettlementAmount"])["amount"];
      out.push({
        endToEndId: str(tx["originalEndToEndIdentification"]),
        status:
          str(tx["transactionStatus"]) ??
          str(info["paymentInformationStatus"]) ??
          str(group["groupStatus"]),
        reason:
          reasonOf(tx["statusReasonInformation"]) ?? reasonOf(info["statusReasonInformation"]),
        amountCents:
          typeof amount === "number" && Number.isFinite(amount) ? Math.round(amount * 100) : null,
        gatewayUrl: gateway ?? null,
      });
    }
  }
  return out;
}
