/** Start of "Sign in with TAKATAK": sends the customer to takatak.ca (src/lib/security/takatak-auth.server.ts). */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/takatak/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { startTakatakSignIn } = await import("@/lib/security/takatak-auth.server");
        return startTakatakSignIn(request);
      },
    },
  },
});
