import { beforeEach, describe, expect, it } from "vitest";
import {
  computeWebhookSignature,
  isFreshTimestamp,
  resetWebhookReplayForTests,
  verifyWebhookRequest,
  WEBHOOK_TOLERANCE_MS,
} from "@/lib/integration/core/webhook-security";
import {
  firstConnectionMapping,
  isConnectionEnabledFor,
  isLocationMapped,
  locationIntegrationMappings,
} from "@/config/integration-locations";

describe("phase 1 location mapping", () => {
  it("prepares exactly one store for the first connection", () => {
    const phase1 = locationIntegrationMappings.filter((m) => m.connectionPhase === 1);
    expect(phase1).toHaveLength(1);
    expect(phase1[0]!.internalId).toBe("PPP-NDG");
    expect(phase1[0]!.address).toContain("6280");
  });

  it("keeps Food Hub unmapped until its verified store identity exists", () => {
    const ndg = firstConnectionMapping()!;
    expect(ndg.foodhubLocationCode).toBeNull();
    expect(ndg.providerLocationId).toBeNull();
    expect(isLocationMapped(ndg.locationId)).toBe(false);
  });

  it("does not enable other locations", () => {
    for (const m of locationIntegrationMappings) {
      if (m.internalId === "PPP-NDG") continue;
      expect(isConnectionEnabledFor(m.locationId)).toBe(false);
    }
  });
});

describe("webhook security", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ event: "ORDER_ACCEPTED", order_id: 1 });

  beforeEach(() => resetWebhookReplayForTests());

  it("rejects a missing secret", () => {
    const r = verifyWebhookRequest({
      rawBody: body,
      signature: "abc",
      timestamp: null,
      secret: undefined,
    });
    expect(r).toEqual({ ok: false, reason: "missing_secret" });
  });

  it("rejects a missing or wrong signature", () => {
    expect(
      verifyWebhookRequest({ rawBody: body, signature: null, timestamp: null, secret }),
    ).toEqual({ ok: false, reason: "missing_signature" });
    expect(
      verifyWebhookRequest({ rawBody: body, signature: "deadbeef", timestamp: null, secret }),
    ).toEqual({ ok: false, reason: "invalid_signature" });
  });

  it("accepts a correctly signed payload once and refuses the replay", () => {
    const signature = computeWebhookSignature(body, secret);
    const first = verifyWebhookRequest({ rawBody: body, signature, timestamp: null, secret });
    expect(first.ok).toBe(true);
    const second = verifyWebhookRequest({ rawBody: body, signature, timestamp: null, secret });
    expect(second).toEqual({ ok: false, reason: "replayed" });
  });

  it("rejects a stale timestamp", () => {
    const now = Date.now();
    const stale = String(now - WEBHOOK_TOLERANCE_MS - 1000);
    const signature = computeWebhookSignature(body, secret, stale);
    expect(
      verifyWebhookRequest({ rawBody: body, signature, timestamp: stale, secret, now }),
    ).toEqual({ ok: false, reason: "stale_timestamp" });
    expect(isFreshTimestamp(String(now), now)).toBe(true);
  });

  it("requires a timestamp when the provider must send one", () => {
    const signature = computeWebhookSignature(body, secret);
    expect(
      verifyWebhookRequest({
        rawBody: body,
        signature,
        timestamp: null,
        secret,
        requireTimestamp: true,
      }),
    ).toEqual({ ok: false, reason: "missing_timestamp" });
  });
});

describe("first-party Food Hub connection gates", () => {
  it("reports every unmapped Food Hub store as disconnected", async () => {
    const { foodhubBridgeConfigured, foodhubAdapters } =
      await import("@/lib/integration/providers/foodhub/bridge");
    const ndg = firstConnectionMapping()!;
    expect(foodhubBridgeConfigured(ndg.locationId)).toBe(false);
    expect(foodhubAdapters.orders?.status(ndg.locationId).available).toBe(false);
    const result = await foodhubAdapters.menu!.fetchMenu(ndg.locationId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
  });

  it("never guesses a store mapping for an unknown location", () => {
    expect(isLocationMapped("loc-does-not-exist")).toBe(false);
    expect(locationIntegrationMappings.some((m) => m.locationId === "loc-does-not-exist")).toBe(
      false,
    );
  });
});
