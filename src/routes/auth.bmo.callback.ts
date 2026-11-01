/** BMO's OAuth redirect. Register with BMO: <PUBLIC_SITE_URL>/auth/bmo/callback (src/lib/payments/bmo/oauth.server.ts). */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/bmo/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { finishBmoConnect } = await import("@/lib/payments/bmo/oauth.server");
        return finishBmoConnect(request);
      },
    },
  },
});
