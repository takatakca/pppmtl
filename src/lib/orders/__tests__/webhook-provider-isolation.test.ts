import { beforeEach, describe, expect, it } from "vitest";
import { applyCloverPayment, applyProviderStatusUpdate } from "../order-service";
import { getOrder, resetOrderStoreForTests, saveOrder } from "../order-store.server";
import type { InternalOrder } from "../types";
import type { IntegrationProviderId } from "@/lib/integration/core/contracts";

function recordedOrder(
  id: string,
  provider: IntegrationProviderId,
  providerOrderId: string,
): InternalOrder {
  const now = "2026-10-28T20:00:00.000Z";
  return {
    id,
    orderNumber: null,
    customerId: null,
    locationId: "loc-ndg-somerled",
    providerLocationId: "PPP-NDG",
    provider,
    orderType: "PICKUP",
    items: [],
    subtotal: 0,
    tax: null,
    total: null,
    paymentStatus: provider === "clover" ? "UNPAID" : "PAY_AT_RESTAURANT",
    status: "CREATED",
    providerStatus: null,
    providerOrderId,
    idempotencyKey: id,
    customer: {
      customerId: null,
      takatakCustomerId: null,
      name: null,
      phone: null,
      email: null,
      isGuest: true,
    },
    deliveryAddress: null,
    notes: "",
    failureCode: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("signed provider callback cannot cross a provider boundary", () => {
  beforeEach(() => resetOrderStoreForTests());

  it("updates only the provider that owns a matching external order id", () => {
    // Two unrelated providers may independently issue the same order id.
    saveOrder(recordedOrder("ord_clover_one", "clover", "SESSION_COLLISION"));
    saveOrder(recordedOrder("ord_hub_two", "foodhub", "SESSION_COLLISION"));

    const updated = applyProviderStatusUpdate(
      "foodhub",
      "SESSION_COLLISION",
      "ACCEPTED",
      "accepted",
    );
    expect(updated?.id).toBe("ord_hub_two");
    expect(getOrder("ord_hub_two")?.status).toBe("ACCEPTED");
    expect(getOrder("ord_clover_one")?.status).toBe("CREATED");
    expect(getOrder("ord_clover_one")?.paymentStatus).toBe("UNPAID");
  });

  it("Clover payment touches its own order, never an Food Hub order with the same id", () => {
    saveOrder(recordedOrder("ord_hub_two", "foodhub", "SESSION_COLLISION"));
    saveOrder(recordedOrder("ord_clover_one", "clover", "SESSION_COLLISION"));
    const payment = applyCloverPayment("SESSION_COLLISION", "PAY_CLOVER", true);
    expect(payment?.id).toBe("ord_clover_one");
    expect(getOrder("ord_clover_one")?.paymentStatus).toBe("PAID");
    expect(getOrder("ord_hub_two")?.paymentStatus).toBe("PAY_AT_RESTAURANT");
    expect(getOrder("ord_hub_two")?.status).toBe("CREATED");
  });

  it("rejects replacing an already linked Clover payment with a different payment", () => {
    saveOrder({
      ...recordedOrder("ord_clover_one", "clover", "SESSION1"),
      providerPaymentId: "PAY_ORIGINAL",
      paymentStatus: "PAID",
      status: "ACCEPTED",
    });
    expect(applyCloverPayment("SESSION1", "PAY_FORGED", true)).toBeNull();
    expect(getOrder("ord_clover_one")?.providerPaymentId).toBe("PAY_ORIGINAL");
    expect(getOrder("ord_clover_one")?.paymentStatus).toBe("PAID");
    expect(applyCloverPayment("SESSION1", "PAY_ORIGINAL", true)?.id).toBe("ord_clover_one");
  });

  it("does not automatically revive cancelled or failed Clover orders", () => {
    saveOrder({
      ...recordedOrder("ord_clover_cancel", "clover", "SESSION_CANCEL"),
      status: "CANCELLED",
    });
    saveOrder({
      ...recordedOrder("ord_clover_failed", "clover", "SESSION_FAILED"),
      status: "FAILED",
    });
    expect(applyCloverPayment("SESSION_CANCEL", "PAY_CANCEL", true)).toBeNull();
    expect(applyCloverPayment("SESSION_FAILED", "PAY_FAILED", true)).toBeNull();
    expect(getOrder("ord_clover_cancel")?.paymentStatus).toBe("UNPAID");
    expect(getOrder("ord_clover_failed")?.paymentStatus).toBe("UNPAID");
  });

  it("fails closed on missing or wrong-provider ids", () => {
    saveOrder(recordedOrder("ord_hub_only", "foodhub", "FOODHUB_ONLY"));
    expect(applyCloverPayment("FOODHUB_ONLY", "PAY_UNRELATED", true)).toBeNull();
    expect(applyProviderStatusUpdate("foodhub", "MISSING", "ACCEPTED", "accepted")).toBeNull();
    expect(getOrder("ord_hub_only")?.status).toBe("CREATED");
  });
});
