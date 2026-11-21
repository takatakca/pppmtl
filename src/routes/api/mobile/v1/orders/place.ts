/**
 * MontrealHub phone app: place an order. The server prices it again from Clover and answers with the order, the
 * Clover payment page (card) and a receipt token for this phone.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/v1/orders/place")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { deviceScope, errorBody, jsonResponse, readJson } =
          await import("@/lib/mobile/mobile-api.server");
        const { orderError } = await import("@/lib/orders/errors");
        const scope = deviceScope(request.headers.get("x-montrealhub-device"));
        if (!scope) return jsonResponse(errorBody(orderError("menu_changed")), 400);
        const { mobilePlace } = await import("@/lib/mobile/mobile-orders.server");
        return jsonResponse(await mobilePlace(await readJson(request), scope));
      },
    },
  },
});
