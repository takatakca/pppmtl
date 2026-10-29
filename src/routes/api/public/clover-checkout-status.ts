/**
 * TEMPORARY diagnosis (2026-10-29): why Clover Hosted Checkout last refused to open a payment page on this server.
 * Clover's error type / field / message only, with e-mails, numbers and Clover ids masked (api.server.ts); no
 * customer data, no key. In memory: empty after a restart. Remove once live checkout is confirmed.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/clover-checkout-status")({
  server: {
    handlers: {
      GET: async () => {
        const { lastCheckoutRefusal } =
          await import("@/lib/integration/providers/clover/api.server");
        return Response.json(
          { lastRefusal: lastCheckoutRefusal() },
          { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
        );
      },
    },
  },
});
