/**
 * The live Clover menu, normalised exactly like src/data/clover/inventory.snapshot.json: public menu data only
 * (names, prices, options, availability), never the merchant id, a token, a cost or a staff-only item.
 * Checkout prices every cart from this live menu, so the committed snapshot the site shows must match it:
 *   curl -s https://pppmtl.com/api/public/clover-menu > src/data/clover/inventory.snapshot.json
 * Clover is read at most every 5 minutes (shared cache with checkout).
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/clover-menu")({
  server: {
    handlers: {
      GET: async () => {
        const { fetchLiveInventory } =
          await import("@/lib/integration/providers/clover/api.server");
        const inventory = await fetchLiveInventory();
        if (!inventory) {
          return new Response("Live Clover menu unavailable", {
            status: 503,
            headers: { "Cache-Control": "no-store" },
          });
        }
        return new Response(`${JSON.stringify(inventory, null, 1)}\n`, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      },
    },
  },
});
