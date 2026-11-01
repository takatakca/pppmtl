import { createHmac, generateKeyPairSync, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { menuItems } from "@/data/menu";
import { resetCloverCachesForTests } from "@/lib/integration/providers/clover/api.server";
import { defaultSelections, toggleChoice } from "@/lib/modifiers";
import { resetIdempotencyForTests } from "@/lib/orders/idempotency";
import { createOrder, submitOrder } from "@/lib/orders/order-service";
import { getOrder, resetOrderStoreForTests } from "@/lib/orders/order-store.server";
import { decryptFromBmo, encryptForBmo } from "../crypto";
import type { buildRequestForPayment } from "../messages";
import {
  bmoConnection,
  finishBmoConnect,
  resetBmoTokensForTests,
  startBmoConnect,
} from "../oauth.server";
import { handleBmoPush } from "../push.server";
import { pollBmoRequests, requestInteracViaBmo } from "../requests.server";

const pem = () =>
  generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
const bmoKeys = pem(); // BMO's pair: we encrypt requests with its public half
const ourKeys = pem(); // ours: BMO encrypts answers and pushes with our public half

const PITA = "pita-wrap-mixte-shish-taouk-shawarma";
function pitaCombo() {
  const groups = menuItems.find((i) => i.id === PITA)!.modifierGroups!;
  const group = (label: RegExp) => groups.find((g) => label.test(g.labelFr))!;
  const pick = (label: RegExp, choice: RegExp) =>
    group(label).choices.find((c) => choice.test(c.labelFr))!.id;
  let s = defaultSelections(groups);
  s = toggleChoice(s, group(/^Choix pita/), pick(/^Choix pita/, /^pita$/i));
  s = toggleChoice(s, group(/^Sauce incluse/), pick(/^Sauce incluse/, /ail/i));
  s = toggleChoice(s, group(/^Trio/), pick(/^Trio/, /^petite frite \+ pepsi$/i));
  return s;
}

const ADMIN_SIGNING = "s".repeat(40);
function adminCookie(): string {
  const until = Math.floor(Date.now() / 1000) + 3600;
  const payload = `${until}.${randomBytes(16).toString("hex")}`;
  return `ppp_admin_session=${payload}.${createHmac("sha256", ADMIN_SIGNING).update(payload).digest("hex")}`;
}

type Call = { url: string; body: string | null; headers: Record<string, string> };

describe("Interac through BMO Instant Payments (request money)", () => {
  let calls: Call[];
  let rfpReply: () => Response | Promise<Response>;
  let statusReply: () => unknown;

  const pain014 = (status: string) => ({
    creditorPaymentActivationRequestStatusReportV07: {
      originalGroupInformationAndStatus: { groupStatus: status },
      originalPaymentInformationAndStatus: [
        {
          transactionInformationAndStatus: [
            { transactionStatus: status, clearingSystemReference: "CA1REF" },
          ],
        },
      ],
    },
  });
  const pain002 = (endToEndId: string, status: string, amount?: number) => ({
    customerPaymentStatusReportV10: {
      originalGroupInformationAndStatus: {
        originalMessageIdentification: "x",
        originalMessageNameIdentification: "pain.013",
      },
      originalPaymentInformationAndStatus: [
        {
          originalPaymentInformationIdentification: "x",
          transactionInformationAndStatus: [
            {
              originalEndToEndIdentification: endToEndId,
              transactionStatus: status,
              ...(amount !== undefined
                ? {
                    originalTransactionReference: {
                      amount: { instructedAmount: { amount, currency: "CAD" } },
                    },
                  }
                : {}),
            },
          ],
          supplementaryData: [
            { envelope: { Document: { gatewayURL: "https://gateway.interac.ca/pay/abc" } } },
          ],
        },
      ],
    },
  });
  /** What BMO answers: encrypted for us. */
  const sealedForUs = (message: unknown) => {
    const { cryptoKey, body } = encryptForBmo(message, {
      publicKeyPem: ourKeys.publicKey,
      keyId: "ppp-key",
    });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json", "x-crypto-key": cryptoKey },
    });
  };

  beforeEach(() => {
    resetOrderStoreForTests();
    resetIdempotencyForTests();
    resetCloverCachesForTests();
    resetBmoTokensForTests();
    calls = [];
    rfpReply = () => sealedForUs(pain014("ACTC"));
    statusReply = () => null;
    const env: Record<string, string> = {
      DATABASE_URL: "",
      CLOVER_ENV: "sandbox",
      CLOVER_MERCHANT_ID: "MTEST",
      CLOVER_ECOMM_PRIVATE_KEY: "priv_test",
      CLOVER_WEBHOOK_SECRET: "whsec_test",
      CLOVER_API_TOKEN: "rest_test",
      INTERAC_REQUESTS_ENABLED: "true",
      INTERAC_ALERT_PHONE: "514 555 0199",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "tw-token",
      TWILIO_FROM_NUMBER: "+15145550000",
      PPP_ORDER_ACCESS_SECRET: "o".repeat(40),
      PPP_ADMIN_ACCESS_TOKEN: "a".repeat(40),
      PPP_ADMIN_SESSION_SECRET: ADMIN_SIGNING,
      BMO_CLIENT_ID: "bmo-client",
      BMO_CLIENT_SECRET: "bmo-secret",
      BMO_CREDITOR_ACCOUNT: "00012-1234567",
      BMO_ENCRYPTION_PUBLIC_KEY: bmoKeys.publicKey.replace(/\n/g, "\\n"),
      BMO_ENCRYPTION_KEY_ID: "bmo-key-1",
      BMO_PRIVATE_KEY: ourKeys.privateKey,
      BMO_PUSH_SECRET: "push-secret-value",
    };
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        const headers = (init?.headers ?? {}) as Record<string, string>;
        calls.push({ url: u, body: init?.body ? String(init.body) : null, headers });
        const json = (status: number, data: unknown) =>
          new Response(JSON.stringify(data), {
            status,
            headers: { "content-type": "application/json" },
          });
        if (u.includes("api.twilio.com")) return json(201, { sid: "SM1" });
        if (u.endsWith("/oauth20/token")) {
          return json(200, {
            access_token: `at-${calls.length}`,
            refresh_token: "rt-1",
            expires_in: 900,
            token_type: "Bearer",
          });
        }
        if (u.includes("creditor-payment-activation-request")) return rfpReply();
        if (u.includes("get-request-for-payment-transaction")) {
          const m = statusReply();
          return m ? sealedForUs(m) : json(404, { title: "Not found" });
        }
        if (u.endsWith("/v3/merchants/MTEST/orders") && init?.method === "POST")
          return json(200, { id: "CLOVERORDER1" });
        if (u.includes("/orders/CLOVERORDER1/bulk_line_items")) return json(200, { elements: [] });
        if (u.includes("/print_event")) return json(200, { state: "DONE" });
        return json(401, {});
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const rfpCalls = () => calls.filter((c) => c.url.includes("creditor-payment-activation-request"));
  const cloverCreates = () =>
    calls.filter(
      (c) => c.url.endsWith("/v3/merchants/MTEST/orders") && c.body?.includes('"state"'),
    );
  const prints = () => calls.filter((c) => c.url.includes("/print_event"));
  const texts = () =>
    calls
      .filter((c) => c.url.includes("api.twilio.com"))
      .map((c) => new URLSearchParams(c.body!).get("Body") ?? "");

  async function connectBmo() {
    const start = startBmoConnect(
      new Request("https://pppmtl.com/auth/bmo/connect", { headers: { cookie: adminCookie() } }),
    );
    const location = new URL(start.headers.get("location")!);
    const flow = start.headers.get("set-cookie")!.split(";")[0]!;
    const back = await finishBmoConnect(
      new Request(
        `https://pppmtl.com/auth/bmo/callback?code=CODE1&state=${location.searchParams.get("state")}`,
        {
          headers: { cookie: flow },
        },
      ),
    );
    expect(back.headers.get("location")).toBe("/admin/interac?bmo=connected");
  }

  async function place(over: Record<string, unknown> = {}) {
    const made = createOrder({
      locationId: "loc-ndg-somerled",
      orderType: "PICKUP",
      lines: [{ itemId: PITA, quantity: 2, notes: "", selections: pitaCombo() }],
      customer: {
        customerId: null,
        takatakCustomerId: null,
        name: "Marie Tremblay",
        phone: "(514) 555-0100",
        email: "marie@example.com",
        isGuest: true,
      },
      deliveryAddress: null,
      notes: "",
      tip: 300,
      paymentMethod: "interac",
      ...over,
    });
    if (!made.ok) throw new Error(made.error.code);
    const submitted = await submitOrder(made.data.id);
    if (!submitted.ok) throw new Error(submitted.error.code);
    return getOrder(made.data.id)!;
  }

  function push(message: unknown, secret = "push-secret-value") {
    const { cryptoKey, body } = encryptForBmo(message, {
      publicKeyPem: ourKeys.publicKey,
      keyId: "ppp-key",
    });
    return handleBmoPush(
      new Request("https://pppmtl.com/api/public/webhooks/bmo", {
        method: "POST",
        headers: {
          "x-api-key": secret,
          "x-crypto-key": cryptoKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
  }

  it("Connect BMO needs an admin session and a matching state, then keeps the tokens", async () => {
    const anonymous = startBmoConnect(new Request("https://pppmtl.com/auth/bmo/connect"));
    expect(anonymous.headers.get("location")).toBe("/admin/sign-in?next=/admin/interac");
    const start = startBmoConnect(
      new Request("https://pppmtl.com/auth/bmo/connect", { headers: { cookie: adminCookie() } }),
    );
    const to = new URL(start.headers.get("location")!);
    expect(to.origin + to.pathname).toBe(
      "https://open-api.bmofg.com/open-banking/commercial-sb/oauth20/authorize",
    );
    expect(to.searchParams.get("client_id")).toBe("bmo-client");
    expect(to.searchParams.get("redirect_uri")).toBe("https://pppmtl.com/auth/bmo/callback");
    expect(to.searchParams.get("scope")).toContain("bmo.tppinterac.payment-initiation.create");
    const flow = start.headers.get("set-cookie")!.split(";")[0]!;
    const wrong = await finishBmoConnect(
      new Request("https://pppmtl.com/auth/bmo/callback?code=C&state=forged", {
        headers: { cookie: flow },
      }),
    );
    expect(wrong.headers.get("location")).toBe("/admin/interac?bmo=failed");
    expect((await bmoConnection()).connected).toBe(false);
    await connectBmo();
    expect((await bmoConnection()).connected).toBe(true);
  });

  it("sends the encrypted request at once, and BMO's 'money received' push sends the order to Clover exactly once", async () => {
    await connectBmo();
    const order = await place();
    expect(rfpCalls()).toHaveLength(1);
    const call = rfpCalls()[0]!;
    expect(call.headers["Authorization"]).toMatch(/^Bearer at-/);
    expect(call.headers["x-api-key"]).toBe("bmo-client");
    expect(call.headers["x-client-id"]).toBe("bmo-client");
    const opened = decryptFromBmo(
      JSON.parse(call.body!),
      call.headers["x-crypto-key"]!,
      bmoKeys.privateKey,
    );
    expect(opened.ok).toBe(true);
    const sent = (opened as { message: ReturnType<typeof buildRequestForPayment> }).message
      .creditorPaymentActivationRequestV07;
    const info = sent.paymentInformation[0]!;
    const tx = info.creditTransferTransaction[0]!;
    expect(tx.amount.instructedAmount).toEqual({
      amount: order.interac!.amount / 100,
      currency: "CAD",
    });
    expect(tx.paymentIdentification.endToEndIdentification).toBe(order.id.replace(/^ord_/, ""));
    expect(info.debtor.contactDetails.emailAddress).toBe("marie@example.com");
    expect(tx.creditorAccount.identification.other.identification).toBe("00012-1234567");

    expect(getOrder(order.id)!.interac).toMatchObject({
      status: "requested",
      by: "BMO",
      bmo: { status: "ACTC", reference: "CA1REF" },
    });
    expect(texts().some((t) => t.includes("Demande Interac envoyée par BMO"))).toBe(true);
    expect(cloverCreates()).toHaveLength(0);

    expect(
      (
        await push(
          pain002(order.id.replace(/^ord_/, ""), "ACSC", order.interac!.amount / 100),
          "wrong",
        )
      ).status,
    ).toBe(401);
    const res = await push(
      pain002(order.id.replace(/^ord_/, ""), "ACSC", order.interac!.amount / 100),
    );
    expect(res.status).toBe(200);
    expect(getOrder(order.id)).toMatchObject({
      paymentStatus: "PAID",
      status: "ACCEPTED",
      interac: {
        status: "sent_to_kitchen",
        by: "BMO",
        bmo: { status: "ACSC", gatewayUrl: "https://gateway.interac.ca/pay/abc" },
      },
    });
    expect(cloverCreates()).toHaveLength(1);
    expect(prints()).toHaveLength(1);
    // BMO retries the same notification: nothing new happens.
    expect(
      (await push(pain002(order.id.replace(/^ord_/, ""), "ACSC", order.interac!.amount / 100)))
        .status,
    ).toBe(200);
    expect(cloverCreates()).toHaveLength(1);
    expect(prints()).toHaveLength(1);
  });

  it("the 60 s poll finds a paid request; a different amount is held for a person", async () => {
    await connectBmo();
    const a = await place();
    const b = await place({ tip: 500 });
    statusReply = () => pain002(a.id.replace(/^ord_/, ""), "ACCC", a.interac!.amount / 100);
    const first = await pollBmoRequests();
    expect(first.paid).toBe(1);
    expect(getOrder(a.id)).toMatchObject({
      paymentStatus: "PAID",
      interac: { status: "sent_to_kitchen" },
    });

    statusReply = () => pain002(b.id.replace(/^ord_/, ""), "ACSC", 1.0);
    await pollBmoRequests();
    expect(getOrder(b.id)).toMatchObject({
      paymentStatus: "UNPAID",
      interac: { status: "requested" },
    });
    expect(getOrder(b.id)!.interac!.error).toMatch(/BMO reports 1,00 \$ received/);
    expect(cloverCreates()).toHaveLength(1);
  });

  it("without a BMO connection, or when BMO refuses, the order waits for the manual steps and staff are told", async () => {
    const order = await place();
    expect(rfpCalls()).toHaveLength(0);
    expect(getOrder(order.id)!.interac).toMatchObject({
      status: "awaiting_request",
      bmo: { status: "error" },
    });
    expect(texts().some((t) => t.includes("BMO n'a pas pu l'envoyer"))).toBe(true);
    // Not resent by itself; a person taps "Send BMO request" once BMO is connected.
    expect(await requestInteracViaBmo(order.id)).toMatchObject({ ok: false });
    await connectBmo();
    expect(await requestInteracViaBmo(order.id, "Ali", { resend: true })).toMatchObject({
      ok: true,
    });
    expect(getOrder(order.id)!.interac).toMatchObject({
      status: "requested",
      by: "Ali",
      bmo: { status: "ACTC" },
    });

    rfpReply = () => sealedForUs(pain014("RJCT"));
    const refused = await place({ tip: 400 });
    expect(getOrder(refused.id)!.interac).toMatchObject({
      status: "awaiting_request",
      bmo: { status: "RJCT" },
    });
    expect(getOrder(refused.id)!.interac!.error).toMatch(/BMO refused/);
  });

  it("a timed-out request is never sent twice by itself: the poll asks BMO first", async () => {
    await connectBmo();
    rfpReply = () => {
      throw Object.assign(new Error("The operation timed out"), { name: "TimeoutError" });
    };
    const order = await place();
    expect(getOrder(order.id)!.interac).toMatchObject({
      status: "awaiting_request",
      bmo: { status: "sending" },
    });
    expect(await requestInteracViaBmo(order.id)).toMatchObject({ ok: false });
    expect(rfpCalls()).toHaveLength(1);
    // BMO did receive it: the status query (after the 2-minute window) adopts it.
    statusReply = () => pain002(order.id.replace(/^ord_/, ""), "ACTC");
    await pollBmoRequests(Date.now() + 3 * 60_000);
    expect(rfpCalls()).toHaveLength(1);
    expect(getOrder(order.id)!.interac).toMatchObject({
      status: "requested",
      bmo: { status: "ACTC" },
    });
  });
});
