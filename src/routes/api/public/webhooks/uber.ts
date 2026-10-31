/**
 * Uber Direct webhook (event.delivery_status and event.courier_update). Register in the Uber Direct dashboard →
 * Developer → Webhooks:
 *   https://pppmtl.com/api/public/webhooks/uber   (copy its Webhook Signing Key into UBER_DIRECT_WEBHOOK_SECRET)
 * Signature check and status mapping: src/lib/delivery/webhooks.server.ts.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/uber")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleUberWebhook } = await import("@/lib/delivery/webhooks.server");
        return handleUberWebhook(request);
      },
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
