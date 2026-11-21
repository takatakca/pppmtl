/** MontrealHub phone app: the current state of the orders this phone holds receipt tokens for. */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/v1/orders/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { jsonResponse, readJson } = await import("@/lib/mobile/mobile-api.server");
        const { mobileStatus } = await import("@/lib/mobile/mobile-orders.server");
        return jsonResponse(await mobileStatus(await readJson(request)));
      },
    },
  },
});
