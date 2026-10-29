import { describe, expect, it } from "vitest";
import {
  locationIntegrationMappings,
  isLocationMapped,
  mappingForLocation,
} from "@/config/integration-locations";
import { adaptersFor } from "@/lib/integration/core/registry";
import { foodhubAdapters } from "@/lib/integration/providers/foodhub/bridge";
import {
  computeWebhookSignature,
  verifyWebhookRequest,
  resetWebhookReplayForTests,
} from "@/lib/integration/core/webhook-security";

describe("PPP first-party Food Hub location mapping", () => {
  it("keeps our internal identifiers independent of vendor stores", () => {
    expect(locationIntegrationMappings.length).toBeGreaterThan(0);
    for (const location of locationIntegrationMappings) {
      expect(location.internalId.startsWith("PPP-")).toBe(true);
      expect(location.providerLocationId).toBeNull();
      expect(isLocationMapped(location.locationId)).toBe(false);
      expect(mappingForLocation(location.locationId)?.internalId).toBe(location.internalId);
      expect(["foodhub", "clover"]).toContain(location.orderingProvider);
    }
  });

  it("has no retired vendor adapter and does not fake Food Hub connectivity", async () => {
    expect(adaptersFor("urbanpiper")).toBeUndefined();
    expect(adaptersFor("foodhub")?.provider).toBe("foodhub");
    expect(foodhubAdapters.orders?.status("loc-ndg-somerled").available).toBe(false);
    const result = await foodhubAdapters.orders!.getOrder("unverified");
    expect(result.ok).toBe(false);
  });
});

describe("generic signed event verification (no network)", () => {
  it("accepts one correctly signed event and rejects a replay", () => {
    resetWebhookReplayForTests();
    const secret = "unit-test-first-party-secret";
    const body = JSON.stringify({ event: "order.ready", order_id: "test" });
    const signature = computeWebhookSignature(body, secret);
    expect(
      verifyWebhookRequest({ rawBody: body, signature, timestamp: null, secret }),
    ).toEqual({ ok: true });
    expect(
      verifyWebhookRequest({ rawBody: body, signature, timestamp: null, secret }),
    ).toEqual({ ok: false, reason: "replayed" });
  });
});
