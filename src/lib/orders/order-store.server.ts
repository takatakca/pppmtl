/**
 * Internal order store. SERVER ONLY.
 *
 * A bounded in-memory ring: this process's working copy. Clover orders are also
 * written to PostgreSQL when DATABASE_URL is set (durable-orders.server.ts), and
 * that copy is the one that survives a restart. Without it, production Clover
 * checkout stays off (clover/config.server.ts).
 */

import type { InternalOrder, OrderStatus } from "./types";
import { canTransition } from "./types";

const MAX_ORDERS = 500;
const orders = new Map<string, InternalOrder>();

function trim() {
  if (orders.size <= MAX_ORDERS) return;
  const oldest = orders.keys().next().value;
  if (oldest) orders.delete(oldest);
}

export function saveOrder(order: InternalOrder): InternalOrder {
  orders.set(order.id, order);
  trim();
  return order;
}

export function getOrder(id: string): InternalOrder | null {
  return orders.get(id) ?? null;
}

export function findOrderByProviderId(providerOrderId: string): InternalOrder | null {
  for (const order of orders.values()) {
    if (order.providerOrderId === providerOrderId) return order;
  }
  return null;
}

export function listOrdersForCustomer(customerId: string | null, phone: string | null) {
  return [...orders.values()]
    .filter((o) => {
      if (customerId && o.customerId === customerId) return true;
      if (phone && o.customer.phone === phone) return true;
      return false;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAllOrders(limit = 50): InternalOrder[] {
  return [...orders.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function updateOrder(id: string, patch: Partial<InternalOrder>): InternalOrder | null {
  const current = orders.get(id);
  if (!current) return null;
  const next: InternalOrder = { ...current, ...patch, updatedAt: new Date().toISOString() };
  orders.set(id, next);
  return next;
}

/** Refuses backwards or post-terminal moves so status can never regress. */
export function applyStatus(
  id: string,
  status: OrderStatus,
  providerStatus?: string,
): InternalOrder | null {
  const current = orders.get(id);
  if (!current) return null;
  if (!canTransition(current.status, status)) return current;
  return updateOrder(id, {
    status,
    ...(providerStatus ? { providerStatus } : {}),
  });
}

export function resetOrderStoreForTests(): void {
  orders.clear();
}
