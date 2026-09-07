/**
 * menu_sync_events — one record per menu synchronisation attempt.
 *
 * PPP has no database yet, so records live in a bounded in-memory ring and are
 * mirrored to the server console. The shape matches the future table 1:1, so
 * moving to storage is a repository swap.
 */

import type { IntegrationProviderId } from "./contracts";

export type MenuSyncStatus = "STARTED" | "SUCCESS" | "FAILED";

export interface MenuSyncEvent {
  id: string;
  provider: IntegrationProviderId;
  /** PPP location id (canonical registry), not a provider store id. */
  locationId: string;
  startedAt: string;
  completedAt: string | null;
  status: MenuSyncStatus;
  categoriesReceived: number;
  productsReceived: number;
  itemsUpdated: number;
  itemsRejected: number;
  errors: string[];
}

const MAX_EVENTS = 100;
const syncEvents: MenuSyncEvent[] = [];

export function startMenuSync(
  provider: IntegrationProviderId,
  locationId: string,
): MenuSyncEvent {
  const record: MenuSyncEvent = {
    id: `sync_${Date.now().toString(36)}_${syncEvents.length.toString(36)}`,
    provider,
    locationId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "STARTED",
    categoriesReceived: 0,
    productsReceived: 0,
    itemsUpdated: 0,
    itemsRejected: 0,
    errors: [],
  };
  syncEvents.push(record);
  if (syncEvents.length > MAX_EVENTS) syncEvents.splice(0, syncEvents.length - MAX_EVENTS);
  console.info("[menu_sync_events]", JSON.stringify({ id: record.id, status: record.status }));
  return record;
}

export function completeMenuSync(
  event: MenuSyncEvent,
  patch: Partial<Omit<MenuSyncEvent, "id" | "startedAt">> & { status: MenuSyncStatus },
): MenuSyncEvent {
  Object.assign(event, patch, { completedAt: new Date().toISOString() });
  console.info(
    "[menu_sync_events]",
    JSON.stringify({
      id: event.id,
      status: event.status,
      productsReceived: event.productsReceived,
      itemsUpdated: event.itemsUpdated,
      errors: event.errors.length,
    }),
  );
  return event;
}

export function recentMenuSyncEvents(limit = 20): MenuSyncEvent[] {
  return syncEvents.slice(-limit).reverse();
}

export function lastMenuSyncFor(locationId: string): MenuSyncEvent | null {
  for (let i = syncEvents.length - 1; i >= 0; i -= 1) {
    const event = syncEvents[i];
    if (event && event.locationId === locationId) return event;
  }
  return null;
}

export function resetMenuSyncLogForTests(): void {
  syncEvents.length = 0;
}
