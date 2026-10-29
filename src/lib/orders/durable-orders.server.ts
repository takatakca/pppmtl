/**
 * Durable PPP orders in PostgreSQL. SERVER ONLY.
 *
 * Used for Clover orders whenever DATABASE_URL is set (database.server.ts). PostgreSQL is then the source of
 * truth; the in-memory store is this process's cache.
 *
 *   1. The order is written before Clover is asked for a payment page.
 *   2. The Clover checkout session is linked before the customer is redirected, so every payment Clover can
 *      report belongs to a stored order.
 *   3. A verified webhook marks the order paid and queues ONE title task in the same transaction.
 *   4. The kitchen outbox titles the Clover order, then prints it once. Retries survive restarts; an uncertain
 *      print goes to manual review, never to a second ticket.
 */
import { logIntegrationEvent } from "@/lib/integration/core/logging";
import { pppDatabasePool, pppTenantId } from "./database.server";
import {
  attachCloverCheckoutSession,
  persistGuestOrderOnce,
  persistVerifiedCloverPayment,
  withPppTenantTransaction,
  type RecordedPayment,
  type VerifiedCloverPayment,
} from "./postgres-transactions.server";
import type { CloverFulfillmentBatchResult } from "./clover-fulfillment-worker.server";
import type { InternalOrder } from "./types";

/** A stored document as the rest of the site reads it: a paid order has no payment page left. */
function fromStored(document: InternalOrder): InternalOrder {
  if (document.paymentStatus !== "PAID") return document;
  return {
    ...document,
    paymentUrl: null,
    providerStatus:
      !document.providerStatus || document.providerStatus === "awaiting_payment"
        ? "paid"
        : document.providerStatus,
  };
}

/** Insert once. Returns the stored order: a different id means this cart was already ordered. */
export async function persistNewOrder(order: InternalOrder): Promise<InternalOrder> {
  return fromStored(await persistGuestOrderOnce(await pppDatabasePool(), pppTenantId(), order));
}

/** Link the Clover session (and Clover's prices) to the stored order before the customer is redirected. */
export async function linkCheckoutSession(order: InternalOrder): Promise<InternalOrder> {
  if (!order.providerOrderId || !order.paymentUrl) {
    throw new Error("A Clover checkout session and payment page are required");
  }
  return fromStored(
    await attachCloverCheckoutSession(
      await pppDatabasePool(),
      pppTenantId(),
      order.id,
      order.providerOrderId,
      order.paymentUrl,
      {
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        providerStatus: order.providerStatus,
      },
    ),
  );
}

/**
 * Mirror FAILED / CANCELLED on an order that was never paid. A paid order is changed in Clover only.
 * The order also gives up its idempotency key, so the same cart ordered again becomes a new order.
 */
export async function recordUnpaidOutcome(order: InternalOrder): Promise<void> {
  if (order.status !== "FAILED" && order.status !== "CANCELLED") return;
  await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (client) =>
    client.query(
      `UPDATE ppp.orders
          SET order_status = $2,
              idempotency_key = idempotency_key || ':' || lower($2) || ':' || id,
              order_document = order_document || $3::jsonb,
              updated_at = now()
        WHERE id = $1
          AND tenant_id = current_setting('ppp.tenant_id', true)
          AND payment_status = 'UNPAID'
          AND order_status IN ('CREATED', 'SUBMITTED')`,
      [
        order.id,
        order.status,
        JSON.stringify({ status: order.status, failureCode: order.failureCode }),
      ],
    ),
  );
}

export async function loadDurableOrder(orderId: string): Promise<InternalOrder | null> {
  const result = await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (client) =>
    client.query<{ order_document: InternalOrder }>(
      `SELECT order_document FROM ppp.orders
        WHERE id = $1 AND tenant_id = current_setting('ppp.tenant_id', true)`,
      [orderId],
    ),
  );
  const document = result.rows[0]?.order_document;
  return document ? fromStored(document) : null;
}

export async function listDurableOrders(limit: number): Promise<InternalOrder[]> {
  const result = await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (client) =>
    client.query<{ order_document: InternalOrder }>(
      `SELECT order_document FROM ppp.orders
        WHERE tenant_id = current_setting('ppp.tenant_id', true)
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit],
    ),
  );
  return result.rows.map((row) => fromStored(row.order_document));
}

export interface StoredCheckout {
  orderId: string;
  paymentStatus: string;
  providerPaymentId: string | null;
}

/** The stored order a Clover checkout session belongs to, or null when the session is not this site's. */
export async function findStoredCheckout(sessionId: string): Promise<StoredCheckout | null> {
  const result = await withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), (client) =>
    client.query<{ id: string; payment_status: string; provider_payment_id: string | null }>(
      `SELECT id, payment_status, provider_payment_id FROM ppp.orders
        WHERE tenant_id = current_setting('ppp.tenant_id', true)
          AND provider = 'clover' AND provider_order_id = $1`,
      [sessionId],
    ),
  );
  const row = result.rows[0];
  return row
    ? {
        orderId: row.id,
        paymentStatus: row.payment_status,
        providerPaymentId: row.provider_payment_id,
      }
    : null;
}

/** Only for an event whose Clover signature and merchant were already verified. */
export async function recordVerifiedPayment(
  event: VerifiedCloverPayment,
): Promise<RecordedPayment> {
  return persistVerifiedCloverPayment(await pppDatabasePool(), pppTenantId(), event);
}

/**
 * Work the kitchen outbox until it is empty (title, then the print the title queues). At most `rounds`
 * batches; whatever is left is retried by the background loop.
 */
export async function runCloverFulfillment(rounds = 3): Promise<CloverFulfillmentBatchResult> {
  const { processPppCloverFulfillmentBatch } = await import("./clover-fulfillment-worker.server");
  const pool = await pppDatabasePool();
  const total: CloverFulfillmentBatchResult = {
    claimed: 0,
    done: 0,
    retry: 0,
    manualReview: 0,
    quarantinedPrints: 0,
  };
  for (let round = 0; round < rounds; round += 1) {
    const batch = await processPppCloverFulfillmentBatch(pool, pppTenantId());
    total.claimed += batch.claimed;
    total.done += batch.done;
    total.retry += batch.retry;
    total.manualReview += batch.manualReview;
    total.quarantinedPrints += batch.quarantinedPrints;
    if (batch.claimed === 0) break;
  }
  if (total.manualReview > 0 || total.quarantinedPrints > 0) {
    logIntegrationEvent({
      provider: "clover",
      eventType: "kitchen.manual_review_required",
      status: "error",
      payloadReference: "fulfillment_outbox",
      detail: `${total.manualReview} failed, ${total.quarantinedPrints} uncertain print(s)`,
    });
  }
  return total;
}

const LOOP_MS = 30_000;
let loop: ReturnType<typeof setInterval> | null = null;
let running = false;

/** Retries titles left by a Clover outage or a restart. Started once at server boot. */
export function startCloverFulfillmentLoop(): void {
  if (loop) return;
  loop = setInterval(() => {
    if (running) return;
    running = true;
    runCloverFulfillment()
      .catch((error: unknown) =>
        console.error(
          "[ppp-db] kitchen outbox run failed:",
          error instanceof Error ? error.message : error,
        ),
      )
      .finally(() => {
        running = false;
      });
  }, LOOP_MS);
  loop.unref?.();
}
