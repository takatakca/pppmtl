/**
 * Provider webhook receiver (UrbanPiper / Clover / payment events).
 *
 * Security is enforced here, not by routing:
 * - HMAC signature verification against the provider webhook secret
 * - idempotency key so duplicate deliveries are ignored
 * - event logging with payload references only (never raw payloads)
 *
 * Returns 503 until a webhook secret is configured, so nothing can be
 * accepted from an unverified caller.
 */

import { createFileRoute } from "@tanstack/react-router";

type ProviderSlug = "urbanpiper" | "clover";

function providerFromRequest(request: Request): ProviderSlug | null {
  const value = new URL(request.url).searchParams.get("provider");
  return value === "urbanpiper" || value === "clover" ? value : null;
}

export const Route = createFileRoute("/api/public/webhooks/provider")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provider = providerFromRequest(request);
        if (!provider) return new Response("Unknown provider", { status: 400 });

        const secret =
          provider === "urbanpiper"
            ? process.env["URBANPIPER_WEBHOOK_SECRET"]
            : process.env["CLOVER_WEBHOOK_SECRET"];

        const { logIntegrationEvent, claimIdempotencyKey } =
          await import("@/lib/integration/core/logging");

        if (!secret) {
          logIntegrationEvent({
            provider,
            eventType: "webhook.rejected",
            status: "rejected",
            payloadReference: "no-secret",
            detail: "Webhook secret not configured",
          });
          return new Response("Webhook not configured", { status: 503 });
        }

        const rawBody = await request.text();
        const signature =
          request.headers.get("x-webhook-signature") ?? request.headers.get("x-clover-signature");

        const { urbanPiperWebhookAdapter } =
          await import("@/lib/integration/providers/urbanpiper/webhook");

        if (!urbanPiperWebhookAdapter.verifySignature(rawBody, signature, secret)) {
          logIntegrationEvent({
            provider,
            eventType: "webhook.invalid_signature",
            status: "rejected",
            payloadReference: "signature",
          });
          return new Response("Invalid signature", { status: 401 });
        }

        const idempotencyKey =
          request.headers.get("idempotency-key") ?? request.headers.get("x-idempotency-key");
        if (idempotencyKey && !claimIdempotencyKey(`${provider}:${idempotencyKey}`)) {
          return Response.json({ received: true, duplicate: true });
        }

        const parsed = urbanPiperWebhookAdapter.parseEvent(rawBody);
        if (!parsed.ok) {
          logIntegrationEvent({
            provider,
            eventType: "webhook.unparsable",
            status: "error",
            payloadReference: "body",
          });
          return new Response("Invalid payload", { status: 400 });
        }

        // ORDER_ACCEPTED / ORDER_PREPARING / ORDER_READY / ORDER_COMPLETED /
        // ORDER_CANCELLED map into the universal PPP lifecycle. Unknown events
        // are logged and ignored — never guessed into a status.
        const { statusForEvent, statusForProviderStatus } =
          await import("@/lib/orders/status-mapping");
        const status =
          statusForEvent(parsed.data.eventType) ??
          (parsed.data.status ? statusForProviderStatus(parsed.data.status) : null);

        let applied = false;
        if (status && parsed.data.externalOrderId) {
          const { applyProviderStatusUpdate } = await import("@/lib/orders/order-service");
          applied = Boolean(
            applyProviderStatusUpdate(
              parsed.data.externalOrderId,
              status,
              parsed.data.status ?? parsed.data.eventType,
            ),
          );
        }

        logIntegrationEvent({
          provider,
          eventType: parsed.data.eventType,
          status: applied ? "processed" : "received",
          payloadReference: parsed.data.payloadReference,
          ...(status ? { detail: `mapped:${status}` } : { detail: "unmapped event" }),
        });

        return Response.json({ received: true, applied });
      },

      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
