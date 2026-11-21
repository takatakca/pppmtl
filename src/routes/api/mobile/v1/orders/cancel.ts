/** MontrealHub phone app: cancel an order not paid yet (receipt token required). */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/v1/orders/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { jsonResponse, readJson } = await import("@/lib/mobile/mobile-api.server");
        const { mobileCancel } = await import("@/lib/mobile/mobile-orders.server");
        return jsonResponse(await mobileCancel(await readJson(request)));
      },
    },
  },
});
