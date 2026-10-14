/** Lightweight server liveness endpoint for Coolify. No secrets, order details, or credentials are exposed.
 * A 200 here proves the TanStack/Nitro request handler is reachable, NOT that Clover is configured.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { status: "ok", service: "pppmtl" },
          {
            headers: {
              "Cache-Control": "no-store",
              "X-Robots-Tag": "noindex, nofollow",
            },
          },
        ),
    },
  },
});
