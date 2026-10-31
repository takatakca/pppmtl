/**
 * Where the dispatch record lives: inside the order's `order_document.dispatch`. SERVER ONLY.
 *
 * With DATABASE_URL (production) every change is ONE transaction: the order row is locked
 * (SELECT … FOR UPDATE), the change is computed, then written with jsonb_set. Two tablets pressing "Book" at
 * the same moment are serialised by that lock, so only one courier is booked. No new table, function or grant
 * is needed: the runtime role ppp_app already has SELECT/UPDATE on ppp.orders (docs/DB_ROLLOUT.md), and the
 * order's tenant row-level security still applies. Other writers (payment webhook, checkout link) use
 * jsonb_set / `||` on their own keys, so they never erase the dispatch key.
 *
 * Without DATABASE_URL (local dev, sandbox) the in-memory order store is used instead.
 */
import {
  durableOrderStoreConfigured,
  pppDatabasePool,
  pppTenantId,
} from "@/lib/orders/database.server";
import { getOrder, listAllOrders, saveOrder } from "@/lib/orders/order-store.server";
import { withPppTenantTransaction } from "@/lib/orders/postgres-transactions.server";
import type { InternalOrder } from "@/lib/orders/types";
import { readDispatch, type DispatchChange, type DispatchState } from "./dispatch-state";

/** An order as the dispatch code reads it: the stored document may carry `dispatch`. */
export type DispatchOrder = InternalOrder & { dispatch?: unknown };

export type DispatchMutation = (order: DispatchOrder, state: DispatchState) => DispatchChange;

export type MutateResult =
  | { ok: true; order: DispatchOrder; state: DispatchState }
  | { ok: false; error: string; notFound: boolean };

export function dispatchOf(order: DispatchOrder): DispatchState {
  return readDispatch(order.dispatch);
}

async function mutateDurable(
  orderId: string,
  mutate: DispatchMutation,
): Promise<MutateResult | null> {
  return withPppTenantTransaction(await pppDatabasePool(), pppTenantId(), async (client) => {
    const read = await client.query<{ order_document: DispatchOrder }>(
      `SELECT order_document FROM ppp.orders
        WHERE id = $1 AND tenant_id = current_setting('ppp.tenant_id', true)
        FOR UPDATE`,
      [orderId],
    );
    const document = read.rows[0]?.order_document;
    if (!document) return null;
    const change = mutate(document, dispatchOf(document));
    if (!change.ok) return { ok: false, error: change.error, notFound: false };
    await client.query(
      `UPDATE ppp.orders
          SET order_document = jsonb_set(order_document, '{dispatch}', $2::jsonb, true),
              updated_at = now()
        WHERE id = $1 AND tenant_id = current_setting('ppp.tenant_id', true)`,
      [orderId, JSON.stringify(change.state)],
    );
    return { ok: true, order: { ...document, dispatch: change.state }, state: change.state };
  });
}

function mutateMemory(orderId: string, mutate: DispatchMutation): MutateResult {
  const order = getOrder(orderId) as DispatchOrder | null;
  if (!order) return { ok: false, error: "Order not found.", notFound: true };
  const change = mutate(order, dispatchOf(order));
  if (!change.ok) return { ok: false, error: change.error, notFound: false };
  const next: DispatchOrder = {
    ...order,
    dispatch: change.state,
    updatedAt: new Date().toISOString(),
  };
  saveOrder(next);
  return { ok: true, order: next, state: change.state };
}

/** Change an order's dispatch atomically. A database error propagates (the caller answers 503 / retry). */
export async function mutateOrderDispatch(
  orderId: string,
  mutate: DispatchMutation,
): Promise<MutateResult> {
  if (durableOrderStoreConfigured()) {
    const durable = await mutateDurable(orderId, mutate);
    if (durable) {
      // Keep this process's cached copy in step (order-service reads refresh it from the database anyway).
      if (durable.ok && getOrder(orderId)) saveOrder(durable.order);
      return durable;
    }
  }
  return mutateMemory(orderId, mutate);
}

/**
 * The order whose live dispatch is this provider delivery (webhooks). `orderNumber` is a fallback for an Uber
 * booking whose answer never arrived: Uber's webhook carries our order number as `external_id`.
 */
export async function findOrderForDelivery(
  externalId: string,
  orderNumber: string | null = null,
): Promise<DispatchOrder | null> {
  if (durableOrderStoreConfigured()) {
    const result = await withPppTenantTransaction(
      await pppDatabasePool(),
      pppTenantId(),
      (client) =>
        client.query<{ order_document: DispatchOrder }>(
          `SELECT order_document FROM ppp.orders
            WHERE tenant_id = current_setting('ppp.tenant_id', true)
              AND created_at > now() - interval '14 days'
              AND (order_document->'dispatch'->'active'->>'externalId' = $1
                   OR ($2::text IS NOT NULL AND order_document->>'orderNumber' = $2::text))
            ORDER BY (order_document->'dispatch'->'active'->>'externalId' = $1) DESC NULLS LAST,
                     created_at DESC
            LIMIT 1`,
          [externalId, orderNumber],
        ),
    );
    const found = result.rows[0]?.order_document;
    if (found) return found;
  }
  const local = listAllOrders(500) as DispatchOrder[];
  return (
    local.find((o) => dispatchOf(o).active?.externalId === externalId) ??
    (orderNumber ? (local.find((o) => o.orderNumber === orderNumber) ?? null) : null)
  );
}
