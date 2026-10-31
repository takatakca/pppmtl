/**
 * DoorDash Drive delivery status webhook. Register in the DoorDash Developer Portal → Webhooks:
 *   https://pppmtl.com/api/public/webhooks/doordash   (authentication: Basic, value = DOORDASH_WEBHOOK_SECRET)
 * Authorization check and status mapping: src/lib/delivery/webhooks.server.ts.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/doordash")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleDoorDashWebhook } = await import("@/lib/delivery/webhooks.server");
        return handleDoorDashWebhook(request);
      },
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
