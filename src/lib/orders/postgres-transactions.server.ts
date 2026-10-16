/**
 * PPPMTL PostgreSQL transaction boundary — SERVER ONLY.
 *
 * A database client/pool is injected here so this module does not provision a
 * service, embed credentials, or silently turn on real Clover charges.
 * The caller MUST obtain tenantId from verified TAKATAK membership/product
 * authorization (never from the request body, URL, or an unverified cookie).
 *
 * There is intentionally no production pool wiring in this file. Live checkout
 * remains fail-closed until the complete durable order + webhook/outbox path
 * is connected, migration-tested, and reviewed (issue #6).
 */
import type { InternalOrder } from "./types";

export interface PppSqlResult<Row> {
  rows: Row[];
  rowCount?: number | null;
}

export interface PppSqlClient {
  query<Row = Record<string, unknown>>(
    statement: string,
    values?: readonly unknown[],
  ): Promise<PppSqlResult<Row>>;
  release(): void;
}

export interface PppSqlPool {
  connect(): Promise<PppSqlClient>;
}

export interface PersistedPppOrder {
  id: string;
  order_document: InternalOrder;
}

export interface VerifiedCloverPayment {
  checkoutSessionId: string;
  paymentId: string;
  deliveryKey: string;
  payloadDigest: string;
  result: "APPROVED" | "DECLINED";
}

export interface RecordedPayment {
  order_id: string;
  newly_processed: boolean;
}

function validateTenantId(tenantId: string): string {
  // Validation is not authorization; authentication is an external prerequisite.
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(tenantId)) {
    throw new Error("Invalid verified PPPMTL tenant identifier");
  }
  return tenantId;
}

/** A pooled connection is never shared with other tenants within a transaction. */
export async function withPppTenantTransaction<T>(
  pool: PppSqlPool,
  verifiedServerTenantId: string,
  task: (client: PppSqlClient) => Promise<T>,
): Promise<T> {
  const tenant = validateTenantId(verifiedServerTenantId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // SET LOCAL cannot take a bound placeholder. set_config(..., true) has the
    // identical transaction-local effect without interpolating tenant input.
    await client.query("SELECT set_config('ppp.tenant_id', $1, true)", [tenant]);
    const value = await task(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Keep the original database failure, but always release this client.
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Insert once; repeated attempts return the original immutable order.
 * Only a server-validated checkout draft, with guest identity scrubbed until
 * real TAKATAK verification exists, should reach this function.
 */
export async function persistGuestOrderOnce(
  pool: PppSqlPool,
  verifiedServerTenantId: string,
  order: InternalOrder,
): Promise<InternalOrder> {
  if (
    !order.customer.isGuest ||
    order.customerId ||
    order.customer.customerId ||
    order.customer.takatakCustomerId
  ) {
    throw new Error("Unverified customer identity cannot be persisted");
  }
  return withPppTenantTransaction(pool, verifiedServerTenantId, async (client) => {
    const result = await client.query<PersistedPppOrder>(
      "SELECT id, order_document FROM ppp.create_order_once($1,$2,$3,$4,$5::jsonb,NULL::text)",
      [order.id, order.locationId, order.provider, order.idempotencyKey, JSON.stringify(order)],
    );
    const persisted = result.rows[0];
    if (!persisted || persisted.id !== persisted.order_document.id) {
      throw new Error("Durable order write did not return a matching document");
    }
    return persisted.order_document;
  });
}

/** A checkout session must be durably associated with the pending order before redirect. */
export async function attachCloverCheckoutSession(
  pool: PppSqlPool,
  verifiedServerTenantId: string,
  orderId: string,
  sessionId: string,
  paymentUrl: string,
): Promise<InternalOrder> {
  const url = new URL(paymentUrl);
  if (
    url.protocol !== "https:" ||
    !/(^|\.)clover\.com$/.test(url.hostname) ||
    !sessionId.trim()
  ) {
    throw new Error("Refusing an untrusted Clover checkout destination");
  }
  return withPppTenantTransaction(pool, verifiedServerTenantId, async (client) => {
    const result = await client.query<PersistedPppOrder>(
      `UPDATE ppp.orders
         SET provider_order_id = $2,
             order_status = 'SUBMITTED',
             order_document = jsonb_set(
               jsonb_set(
                 jsonb_set(order_document, '{providerOrderId}', to_jsonb($2::text), true),
                 '{paymentUrl}', to_jsonb($3::text), true
               ),
               '{status}', '"SUBMITTED"'::jsonb, true
             ),
             updated_at = now()
       WHERE id = $1
         AND tenant_id = current_setting('ppp.tenant_id', true)
         AND provider = 'clover'
         AND payment_status = 'UNPAID'
         AND order_status IN ('CREATED', 'SUBMITTED')
         AND (provider_order_id IS NULL OR provider_order_id = $2)
       RETURNING id, order_document`,
      [orderId, sessionId, paymentUrl],
    );
    const updated = result.rows[0];
    if (!updated) throw new Error("Checkout session could not be durably linked");
    return updated.order_document;
  });
}

/**
 * This operation MUST receive a previously HMAC-, merchant- and type-verified
 * Clover event. It creates a durable, deduplicated title outbox intent, but
 * does NOT print; the separate worker/recovery flow is not yet implemented.
 */
export async function persistVerifiedCloverPayment(
  pool: PppSqlPool,
  verifiedServerTenantId: string,
  verifiedEvent: VerifiedCloverPayment,
): Promise<RecordedPayment> {
  if (
    !verifiedEvent.checkoutSessionId ||
    !verifiedEvent.paymentId ||
    !verifiedEvent.deliveryKey ||
    !/^[a-f0-9]{64}$/.test(verifiedEvent.payloadDigest) ||
    !["APPROVED", "DECLINED"].includes(verifiedEvent.result)
  ) {
    throw new Error("Invalid verified Clover payment event");
  }
  return withPppTenantTransaction(pool, verifiedServerTenantId, async (client) => {
    const response = await client.query<RecordedPayment>(
      "SELECT order_id, newly_processed FROM ppp.record_verified_clover_payment($1,$2,$3,$4,$5)",
      [
        verifiedEvent.checkoutSessionId,
        verifiedEvent.paymentId,
        verifiedEvent.deliveryKey,
        verifiedEvent.payloadDigest,
        verifiedEvent.result,
      ],
    );
    const result = response.rows[0];
    if (!result || !result.order_id) throw new Error("Payment event was not persisted");
    return result;
  });
}

/**
 * Server-side worker queue operations (requires PostgreSQL migration 0003).
 * These are database primitives, NOT a background process. No live worker is
 * started and no external Clover call is performed by these functions.
 */
export type FulfillmentEffect = "CLOVER_TITLE" | "CLOVER_PRINT" | "CUSTOMER_NOTIFICATION";

export interface ClaimedFulfillmentWork {
  id: string | number;
  tenant_id: string;
  order_id: string;
  effect: FulfillmentEffect;
  dedup_key: string;
  payload: Record<string, unknown>;
  attempts: number;
  lease_token: string;
}

export async function claimFulfillmentWork(
  pool: PppSqlPool,
  verifiedServerTenantId: string,
  limit = 10,
  leaseSeconds = 90,
): Promise<ClaimedFulfillmentWork[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50 ||
      !Number.isSafeInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 600) {
    throw new Error("Invalid fulfillment lease parameters");
  }
  return withPppTenantTransaction(pool, verifiedServerTenantId, async (client) => {
    const response = await client.query<ClaimedFulfillmentWork>(
      "SELECT * FROM ppp.claim_due_fulfillment($1::integer, $2::integer)",
      [limit, leaseSeconds],
    );
    if (response.rows.some((row) => !row.lease_token)) {
      throw new Error("Database returned an unfenced fulfillment claim");
    }
    return response.rows;
  });
}

export interface FulfillmentOutcome {
  id: string | number;
  leaseToken: string;
  success: boolean;
  retryable: boolean;
  error?: string;
  enablePrint?: boolean;
}

/**
 * An ambiguous print result must NOT be retried: 0003 always moves failed
 * print calls to FAILED/manual review even when retryable is requested.
 * enablePrint is only legal for a *confirmed successful* Clover title.
 */
export async function finishFulfillmentWork(
  pool: PppSqlPool,
  verifiedServerTenantId: string,
  outcome: FulfillmentOutcome,
): Promise<"DONE" | "RETRY" | "FAILED"> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    outcome.leaseToken,
  )) {
    throw new Error("Invalid fulfillment fencing token");
  }
  if (outcome.enablePrint && !outcome.success) {
    throw new Error("Cannot queue print without a confirmed title");
  }
  return withPppTenantTransaction(pool, verifiedServerTenantId, async (client) => {
    const result = await client.query<{ state: "DONE" | "RETRY" | "FAILED" }>(
      "SELECT ppp.finish_fulfillment($1::bigint,$2::uuid,$3::boolean,$4::boolean,$5::text,$6::boolean) AS state",
      [
        outcome.id,
        outcome.leaseToken,
        outcome.success,
        outcome.retryable,
        outcome.error?.slice(0, 500) ?? null,
        outcome.enablePrint ?? false,
      ],
    );
    const state = result.rows[0]?.state;
    if (state !== "DONE" && state !== "RETRY" && state !== "FAILED") {
      throw new Error("Fulfillment completion not confirmed");
    }
    return state;
  });
}

/** Operator review required: do not automatically re-print an expired ticket. */
export async function quarantineExpiredPrintWork(
  pool: PppSqlPool,
  verifiedServerTenantId: string,
): Promise<number> {
  return withPppTenantTransaction(pool, verifiedServerTenantId, async (client) => {
    const response = await client.query<{ count: number }>(
      "SELECT ppp.quarantine_expired_prints() AS count",
    );
    const value = Number(response.rows[0]?.count);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("Print quarantine count is invalid");
    }
    return value;
  });
}
