/**
 * BMO on real PostgreSQL as the limited role: the BMO connection survives a restart, is sealed at rest and stays in
 * its tenant; a durable Interac order is requested through BMO and BMO's push sends it to Clover once.
 * Runs only with PPP_TEST_DATABASE_URL (CI database job, migrations 0001–0004).
 */
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { menuItems } from "@/data/menu";
import { resetCloverCachesForTests } from "@/lib/integration/providers/clover/api.server";
import { defaultSelections, toggleChoice } from "@/lib/modifiers";
import {
  closePppDatabaseForTests,
  pppDatabasePool,
  pppTenantId,
} from "@/lib/orders/database.server";
import { loadDurableOrder } from "@/lib/orders/durable-orders.server";
import { resetIdempotencyForTests } from "@/lib/orders/idempotency";
import { createOrder, submitOrder } from "@/lib/orders/order-service";
import { resetOrderStoreForTests } from "@/lib/orders/order-store.server";
import { withPppTenantTransaction } from "@/lib/orders/postgres-transactions.server";
import {
  bmoConnection,
  finishBmoConnect,
  resetBmoTokensForTests,
  startBmoConnect,
} from "../oauth.server";
import { handleBmoPush } from "../push.server";

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

const SIGNING = "s".repeat(40);
const adminCookie = () => {
  const payload = `${Math.floor(Date.now() / 1000) + 3600}.${randomBytes(16).toString("hex")}`;
  return `ppp_admin_session=${payload}.${createHmac("sha256", SIGNING).update(payload).digest("hex")}`;
};
const plain = (data: unknown) => ({ SECURE: { encrypted: false, data } });
const databaseUrl = process.env["PPP_TEST_DATABASE_URL"];

describe.skipIf(!databaseUrl)("BMO Interac on PostgreSQL", () => {
  let calls: Array<{ url: string; method: string }>;
  let tenant: string;

  beforeEach(() => {
    resetOrderStoreForTests();
    resetIdempotencyForTests();
    resetCloverCachesForTests();
    resetBmoTokensForTests();
    calls = [];
    tenant = `test_${randomUUID().slice(0, 12)}`;
    const env: Record<string, string> = {
      DATABASE_URL: databaseUrl!,
      PPP_TENANT_ID: tenant,
      CLOVER_ENV: "sandbox",
      CLOVER_MERCHANT_ID: "MTEST",
      CLOVER_ECOMM_PRIVATE_KEY: "priv_test",
      CLOVER_WEBHOOK_SECRET: "whsec_test",
      CLOVER_API_TOKEN: "rest_test",
      INTERAC_REQUESTS_ENABLED: "true",
      PPP_ORDER_ACCESS_SECRET: "o".repeat(40),
      PPP_ADMIN_ACCESS_TOKEN: "a".repeat(40),
      PPP_ADMIN_SESSION_SECRET: SIGNING,
      BMO_CLIENT_ID: "bmo-client",
      BMO_CLIENT_SECRET: "bmo-secret",
      BMO_CREDITOR_ACCOUNT: "00012-1234567",
      BMO_PAYLOAD_ENCRYPTION: "off",
      BMO_PUSH_SECRET: "push-secret-value",
    };
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        calls.push({ url: u, method: init?.method ?? "GET" });
        const json = (status: number, data: unknown) =>
          new Response(JSON.stringify(data), {
            status,
            headers: { "content-type": "application/json" },
          });
        if (u.endsWith("/oauth20/token")) {
          return json(200, {
            access_token: "access-token-plain",
            refresh_token: "refresh-token-plain",
            expires_in: 900,
          });
        }
        if (u.includes("creditor-payment-activation-request")) {
          return json(
            200,
            plain({
              creditorPaymentActivationRequestStatusReportV07: {
                originalGroupInformationAndStatus: { groupStatus: "ACTC" },
                originalPaymentInformationAndStatus: [
                  { transactionInformationAndStatus: [{ transactionStatus: "ACTC" }] },
                ],
              },
            }),
          );
        }
        if (u.endsWith("/v3/merchants/MTEST/orders") && init?.method === "POST")
          return json(200, { id: "CLOVERPG1" });
        if (u.includes("/orders/CLOVERPG1/bulk_line_items")) return json(200, { elements: [] });
        if (u.includes("/print_event")) return json(200, { state: "DONE" });
        return json(401, {});
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await closePppDatabaseForTests();
  });

  async function connect() {
    const start = startBmoConnect(
      new Request("https://pppmtl.com/auth/bmo/connect", { headers: { cookie: adminCookie() } }),
    );
    const state = new URL(start.headers.get("location")!).searchParams.get("state");
    const flow = start.headers.get("set-cookie")!.split(";")[0]!;
    const back = await finishBmoConnect(
      new Request(`https://pppmtl.com/auth/bmo/callback?code=C1&state=${state}`, {
        headers: { cookie: flow },
      }),
    );
    expect(back.headers.get("location")).toBe("/admin/interac?bmo=connected");
  }

  it("keeps the BMO connection across a restart, sealed, and only for its own tenant", async () => {
    await connect();
    resetBmoTokensForTests(); // the process restarts: memory is gone
    expect((await bmoConnection()).connected).toBe(true);
    const stored = await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (c) =>
      c.query<{ sealed_document: string }>(
        "SELECT sealed_document FROM ppp.integration_tokens WHERE provider = 'bmo'",
      ),
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0]!.sealed_document).not.toContain("access-token-plain");
    expect(stored.rows[0]!.sealed_document).not.toContain("refresh-token-plain");

    vi.stubEnv("PPP_TENANT_ID", `other_${randomUUID().slice(0, 8)}`);
    resetBmoTokensForTests();
    expect((await bmoConnection()).connected).toBe(false);
  });

  it("a durable Interac order is requested through BMO, and BMO's push sends it to Clover once", async () => {
    await connect();
    const made = createOrder({
      locationId: "loc-ndg-somerled",
      orderType: "PICKUP",
      lines: [{ itemId: PITA, quantity: 1, notes: "", selections: pitaCombo() }],
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
      tip: 0,
      paymentMethod: "interac",
    });
    if (!made.ok) throw new Error(made.error.code);
    const submitted = await submitOrder(made.data.id);
    if (!submitted.ok) throw new Error(submitted.error.code);
    resetOrderStoreForTests(); // only PostgreSQL knows the order now

    const stored = await loadDurableOrder(made.data.id);
    expect(stored?.interac).toMatchObject({
      status: "requested",
      by: "BMO",
      bmo: { status: "ACTC" },
    });
    const e2e = made.data.id.replace(/^ord_/, "");
    const notice = (status: string) =>
      handleBmoPush(
        new Request("https://pppmtl.com/api/public/webhooks/bmo", {
          method: "POST",
          headers: { "x-api-key": "push-secret-value", "content-type": "application/json" },
          body: JSON.stringify(
            plain({
              customerPaymentStatusReportV10: {
                originalPaymentInformationAndStatus: [
                  {
                    transactionInformationAndStatus: [
                      {
                        originalEndToEndIdentification: e2e,
                        transactionStatus: status,
                        originalTransactionReference: {
                          amount: { instructedAmount: { amount: stored!.interac!.amount / 100 } },
                        },
                      },
                    ],
                  },
                ],
              },
            }),
          ),
        }),
      );
    const [a, b] = await Promise.all([notice("ACSC"), notice("ACSC")]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const after = await loadDurableOrder(made.data.id);
    expect(after).toMatchObject({
      paymentStatus: "PAID",
      interac: { status: "sent_to_kitchen", cloverOrderId: "CLOVERPG1" },
    });
    expect(
      calls.filter((c) => c.url.endsWith("/v3/merchants/MTEST/orders") && c.method === "POST"),
    ).toHaveLength(1);
    expect(calls.filter((c) => c.url.includes("/print_event"))).toHaveLength(1);
  });
});
