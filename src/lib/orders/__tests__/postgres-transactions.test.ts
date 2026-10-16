import { describe, expect, it } from "vitest";
import {
  attachCloverCheckoutSession,
  claimFulfillmentWork,
  finishFulfillmentWork,
  quarantineExpiredPrintWork,
  persistGuestOrderOnce,
  persistVerifiedCloverPayment,
  withPppTenantTransaction,
  type PppSqlClient,
  type PppSqlPool,
} from "../postgres-transactions.server";
import type { InternalOrder } from "../types";

const order: InternalOrder = {
  id: "ord_test_postgres_123",
  orderNumber: null,
  customerId: null,
  locationId: "loc-ndg-somerled",
  providerLocationId: "merchant_test",
  provider: "clover",
  orderType: "PICKUP",
  items: [],
  subtotal: 1000,
  tax: null,
  total: null,
  paymentStatus: "UNPAID",
  status: "CREATED",
  providerStatus: null,
  providerOrderId: null,
  idempotencyKey: "guest-scope-test",
  customer: {
    customerId: null,
    takatakCustomerId: null,
    name: "Guest",
    phone: "5145550000",
    email: null,
    isGuest: true,
  },
  deliveryAddress: null,
  notes: "",
  failureCode: null,
  createdAt: "2026-10-16T00:00:00Z",
  updatedAt: "2026-10-16T00:00:00Z",
};

function fakeDb(rows: unknown[] = []) {
  const statements: { sql: string; params: readonly unknown[] }[] = [];
  let released = false;
  const client: PppSqlClient = {
    async query<Row>(sql: string, params: readonly unknown[] = []) {
      statements.push({ sql, params });
      return { rows: rows as Row[] };
    },
    release() {
      released = true;
    },
  };
  const pool: PppSqlPool = { async connect() { return client; } };
  return { pool, statements, isReleased: () => released };
}

describe("PPPMTL PostgreSQL transaction boundary", () => {
  it("uses parameterized SET LOCAL tenant scope and commits before releasing", async () => {
    const db = fakeDb();
    await withPppTenantTransaction(db.pool, "tenant_valid-1", async () => "ok");
    expect(db.statements.map((entry) => entry.sql)).toEqual([
      "BEGIN",
      "SELECT set_config('ppp.tenant_id', $1, true)",
      "COMMIT",
    ]);
    expect(db.statements[1]?.params).toEqual(["tenant_valid-1"]);
    expect(db.isReleased()).toBe(true);
  });

  it("rolls back and releases the connection after an error", async () => {
    const db = fakeDb();
    await expect(
      withPppTenantTransaction(db.pool, "tenant_one", async () => {
        throw new Error("Database operation failed");
      }),
    ).rejects.toThrow("Database operation failed");
    expect(db.statements.map((entry) => entry.sql).at(-1)).toBe("ROLLBACK");
    expect(db.isReleased()).toBe(true);
  });

  it("rejects unscoped or malformed tenant IDs before opening a DB connection", async () => {
    for (const tenantId of ["", "a';DROP TABLE ppp.orders;--", "white space"]) {
      const db = fakeDb();
      await expect(withPppTenantTransaction(db.pool, tenantId, async () => 1)).rejects.toThrow(
        "Invalid verified PPPMTL tenant identifier",
      );
      expect(db.statements).toEqual([]);
    }
  });

  it("persists a server-scrubbed guest order using SQL idempotency", async () => {
    const db = fakeDb([{ id: order.id, order_document: order }]);
    const stored = await persistGuestOrderOnce(db.pool, "tenant_one", order);
    expect(stored.id).toBe(order.id);
    expect(db.statements[2]?.sql).toContain("ppp.create_order_once");
    expect(db.statements[2]?.params[3]).toBe(order.idempotencyKey);
    expect(db.isReleased()).toBe(true);
  });

  it("rejects a user-claimed TAKATAK customer before saving a guest order", async () => {
    const db = fakeDb();
    await expect(
      persistGuestOrderOnce(db.pool, "tenant_one", {
        ...order,
        customer: { ...order.customer, takatakCustomerId: "other-person" },
      }),
    ).rejects.toThrow("Unverified customer identity");
    expect(db.statements).toEqual([]);
  });

  it("rejects a forged non-guest account until TAKATAK authentication is wired", async () => {
    const db = fakeDb();
    await expect(
      persistGuestOrderOnce(db.pool, "tenant_one", {
        ...order,
        customer: { ...order.customer, isGuest: false },
      }),
    ).rejects.toThrow("Unverified customer identity");
    expect(db.statements).toEqual([]);
  });

  it("rejects checkout redirects outside Clover and binds the legitimate session", async () => {
    const db = fakeDb([{ id: order.id, order_document: { ...order, status: "SUBMITTED" } }]);
    await expect(
      attachCloverCheckoutSession(
        db.pool,
        "tenant_one",
        order.id,
        "session_id",
        "https://checkout.clover.com.evil.example/pay",
      ),
    ).rejects.toThrow("untrusted Clover");
    expect(db.statements).toEqual([]);

    const saved = await attachCloverCheckoutSession(
      db.pool,
      "tenant_one",
      order.id,
      "session_id",
      "https://checkout.clover.com/pay/session_id",
    );
    expect(saved.status).toBe("SUBMITTED");
    expect(db.statements[2]?.sql).toContain("provider_order_id = $2");
    expect(db.statements[2]?.params[1]).toBe("session_id");
  });

  it("records previously verified Clover payment through transactional SQL", async () => {
    const db = fakeDb([{ order_id: order.id, newly_processed: true }]);
    const saved = await persistVerifiedCloverPayment(db.pool, "tenant_one", {
      checkoutSessionId: "session_id",
      paymentId: "payment_id",
      deliveryKey: "clover:payment_id:session_id:APPROVED",
      payloadDigest: "a".repeat(64),
      result: "APPROVED",
    });
    expect(saved).toEqual({ order_id: order.id, newly_processed: true });
    expect(db.statements[2]?.sql).toContain("ppp.record_verified_clover_payment");
  });

  it("refuses malformed payment digests before connecting", async () => {
    const db = fakeDb();
    await expect(
      persistVerifiedCloverPayment(db.pool, "tenant_one", {
        checkoutSessionId: "session_id",
        paymentId: "payment_id",
        deliveryKey: "delivery",
        payloadDigest: "short",
        result: "APPROVED",
      }),
    ).rejects.toThrow("Invalid verified Clover payment");
    expect(db.statements).toEqual([]);
  });
  it("claims work with a bounded, tenant-scoped fencing lease", async () => {
    const db = fakeDb([
      { id: "5", lease_token: "a4a17b63-4b77-4a31-834e-4d771451b332", effect: "CLOVER_TITLE" },
    ]);
    const tasks = await claimFulfillmentWork(db.pool, "ppp_tenant", 3, 120);
    expect(tasks[0]?.lease_token).toBe("a4a17b63-4b77-4a31-834e-4d771451b332");
    expect(db.statements[2]?.sql).toContain("ppp.claim_due_fulfillment");
    expect(db.statements[2]?.params).toEqual([3, 120]);
    expect(db.isReleased()).toBe(true);
  });

  it("rejects invalid lease counts without touching the database", async () => {
    const db = fakeDb();
    await expect(claimFulfillmentWork(db.pool, "ppp_tenant", 0)).rejects.toThrow(
      "Invalid fulfillment lease parameters",
    );
    await expect(claimFulfillmentWork(db.pool, "ppp_tenant", 10, 5)).rejects.toThrow(
      "Invalid fulfillment lease parameters",
    );
    expect(db.statements).toEqual([]);
  });

  it("uses the fencing token when confirming a title and enabling its print intent", async () => {
    const db = fakeDb([{ state: "DONE" }]);
    const status = await finishFulfillmentWork(db.pool, "ppp_tenant", {
      id: "5",
      leaseToken: "a4a17b63-4b77-4a31-834e-4d771451b332",
      success: true,
      retryable: false,
      enablePrint: true,
    });
    expect(status).toBe("DONE");
    expect(db.statements[2]?.sql).toContain("ppp.finish_fulfillment");
    expect(db.statements[2]?.params[5]).toBe(true);
  });

  it("cannot enable a print intent for a failed title or with a fabricated lease token", async () => {
    const db = fakeDb();
    await expect(finishFulfillmentWork(db.pool, "ppp_tenant", {
      id: "5",
      leaseToken: "a4a17b63-4b77-4a31-834e-4d771451b332",
      success: false,
      retryable: true,
      enablePrint: true,
    })).rejects.toThrow("Cannot queue print");
    await expect(finishFulfillmentWork(db.pool, "ppp_tenant", {
      id: "5",
      leaseToken: "not-a-valid-token",
      success: true,
      retryable: false,
    })).rejects.toThrow("Invalid fulfillment fencing token");
    expect(db.statements).toEqual([]);
  });

  it("quarantines uncertain printed tickets for manual review", async () => {
    const db = fakeDb([{ count: 2 }]);
    const count = await quarantineExpiredPrintWork(db.pool, "ppp_tenant");
    expect(count).toBe(2);
    expect(db.statements[2]?.sql).toContain("ppp.quarantine_expired_prints");
  });

});
