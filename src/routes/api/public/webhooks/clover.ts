/**
 * Clover Hosted Checkout webhook, at a plain address for the Clover dashboard:
 *   https://pppmtl.com/api/public/webhooks/clover
 * (`/api/public/webhooks/provider?provider=clover` does the same.) Signature, payment and the single print in Clover
 * are handled in `src/lib/integration/providers/clover/webhook.ts`.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/clover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCloverHostedCheckoutWebhook } =
          await import("@/lib/integration/providers/clover/webhook");
        return handleCloverHostedCheckoutWebhook(request);
      },
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
