/** takatak.ca sends the customer back here with a one-time code (register this exact address in TAKATAK's OAuth Server). */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/takatak/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { finishTakatakSignIn } = await import("@/lib/security/takatak-auth.server");
        return finishTakatakSignIn(request);
      },
    },
  },
});
