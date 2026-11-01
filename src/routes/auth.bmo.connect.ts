/** "Connect BMO" on the Interac tablet (admin session): sends the BMO business user to BMO's sign-in (src/lib/payments/bmo/oauth.server.ts). */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/bmo/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { startBmoConnect } = await import("@/lib/payments/bmo/oauth.server");
        return startBmoConnect(request);
      },
    },
  },
});
