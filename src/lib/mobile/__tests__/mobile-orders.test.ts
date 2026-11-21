import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { created: unknown[]; submitted: unknown[] } = { created: [], submitted: [] };
const order = (id: string) => ({
  id,
  orderNumber: "W-1",
  locationId: "loc-ndg-somerled",
  status: "SUBMITTED",
  orderType: "PICKUP",
  createdAt: "2026-11-21T00:00:00.000Z",
  subtotal: 1000,
  tax: 150,
  tip: 0,
  deliveryFee: 0,
  total: 1150,
  customer: { name: "Test", phone: "5145550000", email: null, takatakCustomerId: null },
  deliveryAddress: null,
  notes: "",
  paymentStatus: "UNPAID",
  paymentUrl: "https://checkout.clover.com/x",
  paymentMethod: "CARD",
  interac: null,
  items: [],
});

vi.mock("@/lib/orders/order-service", () => ({
  validateOrder: () => ({ valid: true, errors: [] }),
  createOrder: (request: unknown, scope: string) => {
    calls.created.push({ request, scope });
    return { ok: true, data: order("ord_phone12345") };
  },
  submitOrder: async (id: string, options: unknown) => {
    calls.submitted.push({ id, options });
    return { ok: true, data: order(id) };
  },
  getOrderById: async (id: string) => (id === "ord_phone12345" ? order(id) : null),
  cancelOrder: async (id: string) => ({ ok: true, data: { ...order(id), status: "CANCELLED" } }),
}));

import { mobileCancel, mobilePlace, mobileStatus } from "@/lib/mobile/mobile-orders.server";

const input = {
  locationId: "loc-ndg-somerled",
  orderType: "PICKUP",
  lines: [{ itemId: "x", quantity: 1, notes: "", selections: {} }],
  customer: {
    customerId: "forged",
    takatakCustomerId: "forged-sub",
    name: "Test",
    phone: "5145550000",
    email: null,
    isGuest: false,
  },
  deliveryAddress: null,
  notes: "",
  tip: 0,
  paymentMethod: "card",
};

describe("MontrealHub phone orders", () => {
  beforeEach(() => {
    calls.created.length = 0;
    calls.submitted.length = 0;
    process.env["PPP_ORDER_ACCESS_SECRET"] = "s".repeat(40);
  });

  it("refuses to take an order without the signing key", async () => {
    delete process.env["PPP_ORDER_ACCESS_SECRET"];
    const result = await mobilePlace(input, "app:x");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("provider_unavailable");
    expect(calls.created).toHaveLength(0);
  });

  it("places a guest order (claimed identities dropped) that pays back to the app", async () => {
    const result = await mobilePlace(input, "app:device");
    expect(result.ok).toBe(true);
    expect(result.order?.paymentUrl).toContain("clover");
    const created = calls.created[0] as {
      request: { customer: Record<string, unknown> };
      scope: string;
    };
    expect(created.scope).toBe("app:device");
    expect(created.request.customer["takatakCustomerId"]).toBeNull();
    expect(created.request.customer["customerId"]).toBeNull();
    expect(created.request.customer["isGuest"]).toBe(true);
    expect(calls.submitted[0]).toEqual({ id: "ord_phone12345", options: { returnTo: "app" } });
    expect(result.token).toBeTruthy();
  });

  it("shows an order only to the phone holding its receipt token", async () => {
    const placed = await mobilePlace(input, "app:device");
    const token = placed.token as string;
    expect((await mobileStatus({ orders: [{ id: "ord_phone12345", token }] })).orders).toHaveLength(
      1,
    );
    expect(
      (await mobileStatus({ orders: [{ id: "ord_phone12345", token: "x.y" }] })).orders,
    ).toHaveLength(0);
    const cancelled = await mobileCancel({ id: "ord_phone12345", token: "x.y", reason: "" });
    expect(cancelled.error?.code).toBe("order_not_found");
    const ok = await mobileCancel({ id: "ord_phone12345", token, reason: "changed my mind" });
    expect(ok.order?.status).toBe("CANCELLED");
  });
});
