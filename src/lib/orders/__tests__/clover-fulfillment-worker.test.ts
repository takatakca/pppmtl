import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InternalOrder } from "../types";
import type {
  ClaimedFulfillmentWork,
  PppSqlClient,
  PppSqlPool,
} from "../postgres-transactions.server";
import { processPppCloverFulfillmentBatch } from "../clover-fulfillment-worker.server";
import {
  orderForPayment,
  printCloverOrder,
  titleCloverOrder,
} from "@/lib/integration/providers/clover/api.server";
import { printWebOrders, siteBaseUrl } from "@/lib/integration/providers/clover/config.server";

vi.mock("@/lib/integration/providers/clover/api.server", () => ({
  orderForPayment: vi.fn(),
  printCloverOrder: vi.fn(),
  titleCloverOrder: vi.fn(),
}));

vi.mock("@/lib/integration/providers/clover/config.server", () => ({
  printWebOrders: vi.fn(),
  siteBaseUrl: vi.fn(),
}));

const leaseToken = "a4a17b63-4b77-4a31-834e-4d771451b332";
const work: ClaimedFulfillmentWork = {
  id: "5",
  tenant_id: "ppp_ci_worker_a",
  order_id: "ord_ci_worker_a_00001",
  effect: "CLOVER_TITLE",
  dedup_key: "SESSION1",
  payload: { paymentId: "PAY1" },
  attempts: 1,
  lease_token: leaseToken,
};

const paidOrder: InternalOrder = {
  id: work.order_id,
  orderNumber: "PPP-ABC12",
  customerId: null,
  locationId: "loc-ndg-somerled",
  providerLocationId: "MTEST",
  provider: "clover",
  orderType: "PICKUP",
  items: [],
  subtotal: 1000,
  tax: 150,
  total: 1150,
  paymentStatus: "PAID",
  status: "ACCEPTED",
  providerStatus: "paid",
  providerOrderId: "SESSION1",
  providerPaymentId: "PAY1",
  idempotencyKey: "dedup_test",
  customer: {
    customerId: null,
    takatakCustomerId: null,
    isGuest: true,
    name: "Marie",
    phone: "5145550000",
    email: null,
  },
  deliveryAddress: null,
  notes: "",
  failureCode: null,
  createdAt: "2026-10-16T00:00:00Z",
  updatedAt: "2026-10-16T00:00:00Z",
};

function dbFixture(
  task: ClaimedFulfillmentWork | null = work,
  saved: InternalOrder | null = paidOrder,
  completion = "DONE",
  expired = 0,
) {
  const queries: { sql: string; args: readonly unknown[] }[] = [];
  const client: PppSqlClient = {
    async query<Row>(sql: string, args: readonly unknown[] = []) {
      queries.push({ sql, args });
      let rows: unknown[] = [];
      if (sql.includes("ppp.quarantine_expired_prints")) rows = [{ count: expired }];
      else if (sql.includes("ppp.claim_due_fulfillment")) rows = task ? [task] : [];
      else if (sql.includes("SELECT order_document FROM ppp.orders"))
        rows = saved ? [{ order_document: saved }] : [];
      else if (sql.includes("ppp.finish_fulfillment")) rows = [{ state: completion }];
      return { rows: rows as Row[] };
    },
    release() {},
  };
  const pool: PppSqlPool = { async connect() { return client; } };
  return { pool, queries };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(printWebOrders).mockReturnValue(true);
  vi.mocked(siteBaseUrl).mockReturnValue("https://pppmtl.com");
  vi.mocked(orderForPayment).mockResolvedValue({
    orderId: "CLOVER_ORDER1",
    title: "🌐 Site web · PPP-ABC12 · Marie",
    printed: false,
    customerFirstName: "Marie",
    customerPhone: "5145550000",
  });
  vi.mocked(titleCloverOrder).mockResolvedValue(true);
  vi.mocked(printCloverOrder).mockResolvedValue(true);
});

describe("Clover fulfillment batch (mocked DB and provider)", () => {
  it("marks an already titled order done and safely schedules print", async () => {
    const db = dbFixture();
    const summary = await processPppCloverFulfillmentBatch(db.pool, work.tenant_id);
    expect(summary).toEqual({
      claimed: 1,
      done: 1,
      retry: 0,
      manualReview: 0,
      quarantinedPrints: 0,
    });
    expect(titleCloverOrder).not.toHaveBeenCalled();
    expect(printCloverOrder).not.toHaveBeenCalled();
    const finish = db.queries.find((q) => q.sql.includes("ppp.finish_fulfillment"));
    expect(finish?.args[5]).toBe(true);
  });

  it("rejects a missing persisted payment association without Clover side effects", async () => {
    const db = dbFixture(work, { ...paidOrder, providerPaymentId: "ANOTHER_PAYMENT" }, "FAILED");
    const summary = await processPppCloverFulfillmentBatch(db.pool, work.tenant_id);
    expect(summary.manualReview).toBe(1);
    expect(orderForPayment).not.toHaveBeenCalled();
    expect(titleCloverOrder).not.toHaveBeenCalled();
    expect(printCloverOrder).not.toHaveBeenCalled();
  });

  it("never duplicates a print that Clover already reports as printed", async () => {
    vi.mocked(orderForPayment).mockResolvedValue({
      orderId: "CLOVER_ORDER1",
      title: "🌐 Site web · PPP-ABC12 · Marie",
      printed: true,
      customerFirstName: "Marie",
      customerPhone: "5145550000",
    });
    const db = dbFixture({ ...work, effect: "CLOVER_PRINT" });
    const summary = await processPppCloverFulfillmentBatch(db.pool, work.tenant_id);
    expect(summary.done).toBe(1);
    expect(printCloverOrder).not.toHaveBeenCalled();
  });

  it("does not retry a physical print with an uncertain response", async () => {
    vi.mocked(printCloverOrder).mockResolvedValue(false);
    const db = dbFixture({ ...work, effect: "CLOVER_PRINT" }, paidOrder, "FAILED");
    const summary = await processPppCloverFulfillmentBatch(db.pool, work.tenant_id);
    expect(summary.manualReview).toBe(1);
    expect(printCloverOrder).toHaveBeenCalledTimes(1);
    const finish = db.queries.find((q) => q.sql.includes("ppp.finish_fulfillment"));
    expect(finish?.args[3]).toBe(false);
    expect(finish?.args[5]).toBe(false);
  });

  it("counts expired print claims without automatically reprinting", async () => {
    const db = dbFixture(null, paidOrder, "DONE", 2);
    const summary = await processPppCloverFulfillmentBatch(db.pool, work.tenant_id);
    expect(summary.quarantinedPrints).toBe(2);
    expect(summary.claimed).toBe(0);
    expect(orderForPayment).not.toHaveBeenCalled();
  });
});
