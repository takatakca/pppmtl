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
          request.headers.get("x-webhook-signature") ??
          request.headers.get("x-up-signature") ??
          request.headers.get("x-clover-signature");
        const timestamp =
          request.headers.get("x-webhook-timestamp") ?? request.headers.get("x-up-timestamp");
        const deliveryId =
          request.headers.get("x-webhook-id") ??
          request.headers.get("idempotency-key") ??
          request.headers.get("x-idempotency-key");

        const { verifyWebhookRequest } = await import("@/lib/integration/core/webhook-security");
        const verification = verifyWebhookRequest({
          rawBody,
          signature,
          timestamp,
          secret,
          deliveryId: deliveryId ? `${provider}:${deliveryId}` : null,
        });

        if (!verification.ok) {
          if (verification.reason === "replayed") {
            logIntegrationEvent({
              provider,
              eventType: "webhook.duplicate",
              status: "received",
              payloadReference: "replay",
            });
            return Response.json({ received: true, duplicate: true });
          }
          logIntegrationEvent({
            provider,
            eventType: `webhook.${verification.reason}`,
            status: "rejected",
            payloadReference: "signature",
          });
          const status = verification.reason === "stale_timestamp" ? 400 : 401;
          return new Response("Rejected", { status });
        }

        const idempotencyKey =
          request.headers.get("idempotency-key") ?? request.headers.get("x-idempotency-key");
        if (idempotencyKey && !claimIdempotencyKey(`${provider}:${idempotencyKey}`)) {
          return Response.json({ received: true, duplicate: true });
        }

        const { urbanPiperWebhookAdapter } = await import(
          "@/lib/integration/providers/urbanpiper/webhook"
        );


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
