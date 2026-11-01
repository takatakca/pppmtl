import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptFromBmo, encryptForBmo } from "../crypto";
import {
  bmoPhone,
  buildRequestForPayment,
  buildRequestStatusQuery,
  readPaymentStatus,
  readRequestReply,
  rfpOutcome,
} from "../messages";

const keys = () =>
  generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

describe("BMO payload encryption", () => {
  const pair = keys();

  it("round-trips a message: AES-256-GCM body, RSA-OAEP wrapped key, SHA-256 key hash", () => {
    const message = { hello: "PPP", amount: 19.49 };
    const { cryptoKey, body } = encryptForBmo(message, {
      publicKeyPem: pair.publicKey,
      keyId: "ppp-key-1",
    });
    const parts = cryptoKey.split(".");
    expect(parts).toHaveLength(5);
    expect(Buffer.from(parts[0]!, "base64").toString()).toBe("ppp-key-1");
    expect(Buffer.from(parts[3]!, "base64")).toHaveLength(12);
    expect(body.SECURE.encrypted).toBe(true);
    expect(String(body.SECURE.data)).not.toContain("PPP");
    expect(decryptFromBmo(body, cryptoKey, pair.privateKey)).toEqual({ ok: true, message });
  });

  it("refuses a tampered key hash or ciphertext, and opens a plain envelope", () => {
    const { cryptoKey, body } = encryptForBmo(
      { a: 1 },
      { publicKeyPem: pair.publicKey, keyId: "k" },
    );
    const parts = cryptoKey.split(".");
    const badHash = [
      parts[0],
      parts[1],
      Buffer.alloc(32).toString("base64"),
      parts[3],
      parts[4],
    ].join(".");
    expect(decryptFromBmo(body, badHash, pair.privateKey)).toMatchObject({ ok: false });
    const data = Buffer.from(String(body.SECURE.data), "base64");
    data[0] = data[0]! ^ 0xff;
    const tampered = { SECURE: { encrypted: true, data: data.toString("base64") } };
    expect(decryptFromBmo(tampered, cryptoKey, pair.privateKey)).toMatchObject({ ok: false });
    expect(decryptFromBmo({ SECURE: { encrypted: false, data: '{"x":2}' } }, null, null)).toEqual({
      ok: true,
      message: { x: 2 },
    });
    expect(decryptFromBmo({ nope: 1 }, cryptoKey, pair.privateKey)).toMatchObject({ ok: false });
  });

  it("supports sha256 OAEP when BMO uses it", () => {
    const { cryptoKey, body } = encryptForBmo(
      { a: 1 },
      { publicKeyPem: pair.publicKey, keyId: "k", oaepHash: "sha256" },
    );
    expect(decryptFromBmo(body, cryptoKey, pair.privateKey, "sha256")).toEqual({
      ok: true,
      message: { a: 1 },
    });
    expect(decryptFromBmo(body, cryptoKey, pair.privateKey, "sha1")).toMatchObject({ ok: false });
  });
});

describe("BMO request-money messages (pain.013 / camt.005 / pain.014 / pain.002)", () => {
  const input = {
    messageId: "PPPRFP1",
    endToEndId: "6cedc86645c046c78c44385b89d96f70",
    createdAt: new Date("2026-11-02T15:00:00Z"),
    expiresAt: new Date("2026-11-02T16:00:00Z"),
    amountCents: 1949,
    creditor: { name: "PPP Pizzeria", accountId: "00012-1234567" },
    debtor: { name: "Marie Tremblay", email: "marie@example.com", phone: "(514) 555-0100" },
    description: "PPP Pizzeria — commande PPP-96F70",
    returnUrl: "https://pppmtl.com/orders/ord_x",
  };

  it("builds one CAD request with the exact amount, our reference, the customer's contacts and no amount change", () => {
    const m = buildRequestForPayment(input).creditorPaymentActivationRequestV07;
    expect(m.groupHeader).toMatchObject({
      messageIdentification: "PPPRFP1",
      numberOfTransactions: "1",
      controlSum: "19.49",
    });
    const p = m.paymentInformation[0]!;
    expect(p.paymentMethod).toBe("TRF");
    expect(p.expiryDate.dateTime).toBe("2026-11-02T16:00:00.000Z");
    expect(p.debtor.contactDetails).toEqual({
      emailAddress: "marie@example.com",
      mobileNumber: "+1-5145550100",
    });
    const t = p.creditTransferTransaction[0]!;
    expect(t.paymentIdentification.endToEndIdentification).toBe(input.endToEndId);
    expect(t.amount.instructedAmount).toEqual({ amount: 19.49, currency: "CAD" });
    expect(t.paymentCondition.amountModificationAllowed).toBe(false);
    expect(t.creditorAccount.identification.other.identification).toBe("00012-1234567");
    expect(
      t.creditorAgent.financialInstitutionIdentification.clearingSystemMemberIdentification
        .memberIdentification,
    ).toBe("001");
    expect(t.remittanceInformation.unstructured[0]).toContain("PPP-96F70");
    expect(m.supplementaryData[0]!.envelope.document).toEqual({
      suppressResponderNotifications: false,
      returnURL: "https://pppmtl.com/orders/ord_x",
    });
  });

  it("refuses a request without an amount or a way to reach the customer, and caps ISO lengths", () => {
    expect(() => buildRequestForPayment({ ...input, amountCents: 0 })).toThrow();
    expect(() =>
      buildRequestForPayment({ ...input, debtor: { name: "X", email: null, phone: "12" } }),
    ).toThrow();
    const long = buildRequestForPayment({
      ...input,
      messageId: "M".repeat(60),
      description: "D".repeat(300),
    });
    expect(long.creditorPaymentActivationRequestV07.groupHeader.messageIdentification).toHaveLength(
      35,
    );
    expect(
      long.creditorPaymentActivationRequestV07.paymentInformation[0]!.creditTransferTransaction[0]!
        .remittanceInformation.unstructured[0],
    ).toHaveLength(140);
    expect(bmoPhone("+1 438 555 0101")).toBe("+1-4385550101");
    expect(bmoPhone("555-0101")).toBeNull();
  });

  it("asks for a request's status by its end-to-end id", () => {
    const q = buildRequestStatusQuery({ messageId: "Q1", endToEndId: "abc", now: new Date(0) });
    expect(
      q.getTransactionV08.transactionQueryDefinition.transactionCriteria.newCriteria
        .searchCriteria[0]!.paymentSearch.endToEndIdentification,
    ).toEqual(["abc"]);
  });

  it("reads BMO's answers: the request reply, and settled / refused statuses with amount and payment link", () => {
    expect(
      readRequestReply({
        creditorPaymentActivationRequestStatusReportV07: {
          originalGroupInformationAndStatus: { groupStatus: "ACTC" },
          originalPaymentInformationAndStatus: [
            {
              transactionInformationAndStatus: [
                { transactionStatus: "ACTC", clearingSystemReference: "CA1XyZ" },
              ],
            },
          ],
        },
      }),
    ).toEqual({ status: "ACTC", reason: null, reference: "CA1XyZ" });
    expect(readRequestReply({ other: 1 })).toBeNull();
    const statuses = readPaymentStatus({
      SECURE: {
        encrypted: false,
        data: {
          customerPaymentStatusReportV10: {
            originalGroupInformationAndStatus: { groupStatus: "ACCP" },
            originalPaymentInformationAndStatus: [
              {
                transactionInformationAndStatus: [
                  {
                    originalEndToEndIdentification: "abc",
                    transactionStatus: "ACSC",
                    originalTransactionReference: {
                      amount: { instructedAmount: { amount: 19.49, currency: "CAD" } },
                    },
                  },
                  {
                    originalEndToEndIdentification: "def",
                    transactionStatus: "RJCT",
                    statusReasonInformation: [
                      { reason: { code: "AC04" }, additionalInformation: ["Declined"] },
                    ],
                  },
                ],
                supplementaryData: [
                  { envelope: { Document: { gatewayURL: "https://gateway.interac.ca/x" } } },
                ],
              },
            ],
          },
        },
      },
    });
    expect(statuses).toEqual([
      {
        endToEndId: "abc",
        status: "ACSC",
        reason: null,
        amountCents: 1949,
        gatewayUrl: "https://gateway.interac.ca/x",
      },
      {
        endToEndId: "def",
        status: "RJCT",
        reason: "AC04 · Declined",
        amountCents: null,
        gatewayUrl: "https://gateway.interac.ca/x",
      },
    ]);
    expect(rfpOutcome("ACSC")).toBe("paid");
    expect(rfpOutcome("accc")).toBe("paid");
    expect(rfpOutcome("RJCT")).toBe("failed");
    expect(rfpOutcome("ACTC")).toBe("pending");
    expect(rfpOutcome(null)).toBe("pending");
  });
});
