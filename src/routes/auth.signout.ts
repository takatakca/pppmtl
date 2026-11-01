/** Sign the customer out of pppmtl.com (their TAKATAK session on takatak.ca is unchanged). */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/signout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { signOutTakatak } = await import("@/lib/security/takatak-auth.server");
        return signOutTakatak(request);
      },
    },
  },
});
