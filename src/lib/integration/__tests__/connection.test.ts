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
  missingProviderFields,
} from "@/config/integration-locations";

describe("phase 1 location mapping", () => {
  it("prepares exactly one store for the first connection", () => {
    const phase1 = locationIntegrationMappings.filter((m) => m.connectionPhase === 1);
    expect(phase1).toHaveLength(1);
    expect(phase1[0]!.internalId).toBe("PPP-NDG");
    expect(phase1[0]!.address).toContain("6280");
  });

  it("keeps every provider field empty until UrbanPiper supplies them", () => {
    const ndg = firstConnectionMapping()!;
    expect(ndg.urbanPiperLocationId).toBeNull();
    expect(ndg.urbanPiperStoreId).toBeNull();
    expect(ndg.organizationId).toBeNull();
    expect(ndg.merchantId).toBeNull();
    expect(missingProviderFields(ndg)).toHaveLength(4);
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

describe("provider gating without credentials", () => {
  it("blocks menu sync and ordering for every store", async () => {
    const { urbanPiperConfigured, urbanPiperReadiness } = await import(
      "@/lib/integration/providers/urbanpiper/config.server"
    );
    const { syncLocationMenu } = await import(
      "@/lib/integration/providers/urbanpiper/menu-sync"
    );
    const { urbanPiperOrderingConfigured } = await import(
      "@/lib/integration/providers/urbanpiper/order-submit"
    );

    const ndg = firstConnectionMapping()!;
    expect(urbanPiperConfigured(ndg.locationId)).toBe(false);
    expect(urbanPiperOrderingConfigured(ndg.locationId)).toBe(false);
    expect(urbanPiperReadiness(ndg.locationId).connected).toBe(false);

    const sync = await syncLocationMenu(ndg.locationId);
    expect(sync.ok).toBe(false);
    if (!sync.ok) expect(sync.code).toBe("not_configured");
  });

  it("fails fast on an unknown store", async () => {
    const { syncLocationMenu } = await import(
      "@/lib/integration/providers/urbanpiper/menu-sync"
    );
    const result = await syncLocationMenu("loc-does-not-exist");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid_request");
  });
});
