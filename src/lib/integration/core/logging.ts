/**
 * integration_events — structured, redacted event log.
 *
 * There is no PPP database, so events are kept in a bounded in-memory ring and
 * mirrored to the server console. Payloads are NEVER stored: only a reference
 * (hash/id). Card data, passwords and tokens must never reach this module.
 */

import type { IntegrationProviderId } from "./contracts";

export type IntegrationEventStatus = "received" | "processed" | "rejected" | "error";

export interface IntegrationEvent {
  id: string;
  provider: IntegrationProviderId;
  eventType: string;
  receivedAt: string;
  status: IntegrationEventStatus;
  /** Opaque pointer to the payload (provider event id or body hash). */
  payloadReference: string;
  detail?: string;
}

const MAX_EVENTS = 200;
const events: IntegrationEvent[] = [];
const seenIdempotencyKeys = new Map<string, string>();

const SENSITIVE = /(card|cvv|pan|password|secret|token|authorization|api[_-]?key)/i;

/** Defensive scrub: refuses to log anything that smells like a credential. */
export function safeDetail(detail: string): string {
  return SENSITIVE.test(detail) ? "[redacted]" : detail.slice(0, 240);
}

export function logIntegrationEvent(
  event: Omit<IntegrationEvent, "id" | "receivedAt"> & { receivedAt?: string },
): IntegrationEvent {
  const record: IntegrationEvent = {
    id: `evt_${Date.now().toString(36)}_${events.length.toString(36)}`,
    receivedAt: event.receivedAt ?? new Date().toISOString(),
    provider: event.provider,
    eventType: event.eventType,
    status: event.status,
    payloadReference: event.payloadReference,
    ...(event.detail ? { detail: safeDetail(event.detail) } : {}),
  };
  events.push(record);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  console.info("[integration_events]", JSON.stringify(record));
  return record;
}

export function recentIntegrationEvents(limit = 25): IntegrationEvent[] {
  return events.slice(-limit).reverse();
}

/** Returns false when the key was already handled (duplicate delivery). */
export function claimIdempotencyKey(key: string): boolean {
  if (seenIdempotencyKeys.has(key)) return false;
  seenIdempotencyKeys.set(key, new Date().toISOString());
  if (seenIdempotencyKeys.size > MAX_EVENTS) {
    const oldest = seenIdempotencyKeys.keys().next().value;
    if (oldest) seenIdempotencyKeys.delete(oldest);
  }
  return true;
}

export function resetIntegrationLogForTests(): void {
  events.length = 0;
  seenIdempotencyKeys.clear();
}
