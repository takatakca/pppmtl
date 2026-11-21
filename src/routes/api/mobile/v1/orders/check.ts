/** MontrealHub phone app: check a cart before paying (same rules as the website checkout). */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/v1/orders/check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { jsonResponse, readJson } = await import("@/lib/mobile/mobile-api.server");
        const { mobileCheck } = await import("@/lib/mobile/mobile-orders.server");
        return jsonResponse(await mobileCheck(await readJson(request)));
      },
    },
  },
});
