/**
 * MontrealHub phone app: the menu, the restaurants and the checkout rules, as JSON (public data only).
 * See src/lib/mobile/mobile-api.server.ts and mobile/README.md.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/v1/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { mobileCatalog, requestOrigin } = await import("@/lib/mobile/mobile-api.server");
        const { orderAccessConfigured } = await import("@/lib/security/order-access.server");
        const { interacRequestsEnabled } = await import("@/lib/payments/interac-config.server");
        const { cloverCheckoutConfigured } =
          await import("@/lib/integration/providers/clover/config.server");
        const { NDG_LOCATION_ID } = await import("@/config/locations");
        const body = mobileCatalog(requestOrigin(request), {
          onlineOrdering: orderAccessConfigured() && cloverCheckoutConfigured(NDG_LOCATION_ID),
          interac: interacRequestsEnabled(),
        });
        return new Response(JSON.stringify(body), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=120",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});
