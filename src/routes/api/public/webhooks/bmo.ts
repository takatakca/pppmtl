/**
 * BMO Push Notifications (Interac request-money status). Give BMO at onboarding:
 *   https://pppmtl.com/api/public/webhooks/bmo   (x-api-key or Authorization = BMO_PUSH_SECRET)
 * Decryption and status handling: src/lib/payments/bmo/push.server.ts.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/bmo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleBmoPush } = await import("@/lib/payments/bmo/push.server");
        return handleBmoPush(request);
      },
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
