/**
 * UrbanPiper webhook verification + parsing. SERVER ONLY.
 * Pure logic (no env reads) so it can be unit tested.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookAdapter, WebhookEvent } from "@/lib/integration/core/adapter";
import type { IntegrationResult } from "@/lib/integration/core/contracts";
import { mapOrderStatus } from "./mapping";

export function verifyHmacSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const urbanPiperWebhookAdapter: WebhookAdapter = {
  provider: "urbanpiper",
  verifySignature: verifyHmacSignature,
  parseEvent(rawBody): IntegrationResult<WebhookEvent> {
    try {
      const payload = JSON.parse(rawBody) as {
        event?: string;
        order_id?: string | number;
        status?: string;
        id?: string;
      };
      if (!payload.event) {
        return { ok: false, code: "invalid_request", message: "Missing event type" };
      }
      return {
        ok: true,
        data: {
          provider: "urbanpiper",
          eventType: payload.event,
          externalOrderId: payload.order_id ? String(payload.order_id) : null,
          status: payload.status ? mapOrderStatus(payload.status) : null,
          receivedAt: new Date().toISOString(),
          payloadReference: payload.id
            ? String(payload.id)
            : `order:${payload.order_id ?? "unknown"}`,
        },
      };
    } catch {
      return { ok: false, code: "invalid_request", message: "Body is not valid JSON" };
    }
  },
};
