import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/api/public/webhooks/provider";
import {
  adaptersFor,
  orderingAdaptersForLocation,
  providerHealth,
  marketplaceChannels,
} from "@/lib/integration/core/registry";
import { locationIntegrationMappings } from "@/config/integration-locations";
import { foodhubBridgeConfigured, foodhubAdapters } from "@/lib/integration/providers/foodhub/bridge";
import {
  credentialPresence,
  INTEGRATION_ENV_KEYS,
} from "@/lib/integration/core/credentials.server";

const route = Route as unknown as {
  options: {
    server: {
      handlers: {
        POST: (context: { request: Request }) => Promise<Response>;
      };
    };
  };
};

afterEach(() => vi.unstubAllEnvs());

describe("owner-directed retirement of UrbanPiper", () => {
  it("rejects its legacy public webhook before reading even an enormous body", async () => {
    const body = "x".repeat(4 * 1024 * 1024);
    const response = await route.options.server.handlers.POST({
      request: new Request(
        "https://pppmtl.com/api/public/webhooks/provider?provider=urbanpiper",
        { method: "POST", body },
      ),
    });
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("Integration retired");
  });

  it("does not register the retired provider or select it for any PPP store", () => {
    expect(adaptersFor("urbanpiper" as never)).toBeUndefined();
    expect(providerHealth("loc-ndg-somerled").map((x) => x.provider)).toEqual([
      "foodhub",
      "clover",
    ]);
    expect(locationIntegrationMappings.every((m) => ["foodhub", "clover"].includes(m.orderingProvider))).toBe(true);
    for (const m of locationIntegrationMappings) {
      if (m.orderingProvider === "foodhub") {
        expect(m.providerLocationId).toBeNull();
        expect(orderingAdaptersForLocation(m.locationId)?.provider).toBe("foodhub");
      }
    }
    expect(marketplaceChannels.every((channel) => channel.managedBy === "foodhub")).toBe(true);
  });

  it("cannot revive a retired vendor from leftover environment secrets", () => {
    vi.stubEnv("URBANPIPER_API_KEY", "obsolete-do-not-use");
    vi.stubEnv("URBANPIPER_API_URL", "https://example.invalid");
    vi.stubEnv("URBANPIPER_WEBHOOK_SECRET", "obsolete-do-not-use");
    expect(INTEGRATION_ENV_KEYS.every((key) => !key.startsWith("URBANPIPER_"))).toBe(true);
    expect(credentialPresence()).not.toHaveProperty("URBANPIPER_API_KEY");
    expect(credentialPresence()).not.toHaveProperty("URBANPIPER_WEBHOOK_SECRET");
  });

  it("Food Hub remains safely unavailable until a signed durable bridge exists", async () => {
    expect(foodhubBridgeConfigured("loc-saint-leonard")).toBe(false);
    const menu = await foodhubAdapters.menu!.fetchMenu("loc-saint-leonard");
    expect(menu.ok).toBe(false);
    const orders = await foodhubAdapters.orders!.listOrders({
      takatakCustomerId: "unverified",
      externalCustomerId: null,
      preferredName: null,
      email: null,
      phone: null,
      phoneVerified: false,
    });
    expect(orders.ok).toBe(false);
  });
});
