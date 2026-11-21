/**
 * Legacy provider webhook URL. Owner retired UrbanPiper from PPP Pizzeria.
 *
 * Never parse or authenticate an UrbanPiper payload. This endpoint rejects it
 * before the body is read, even when old credentials are still set on a server.
 * Clover keeps its own signed receiver and an alias here for existing setups.
 *
 * Food Hub has a separate first-party ingress; it is NOT this route.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/provider")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provider = new URL(request.url).searchParams.get("provider");
        if (provider === "urbanpiper") {
          return new Response("Integration retired", {
            status: 410,
            headers: { "cache-control": "no-store" },
          });
        }
        if (provider !== "clover") return new Response("Unknown provider", { status: 400 });

        const { handleCloverHostedCheckoutWebhook } =
          await import("@/lib/integration/providers/clover/webhook");
        return handleCloverHostedCheckoutWebhook(request);
      },
      GET: async () => new Response("Method not allowed", { status: 405 }),
    },
  },
});
