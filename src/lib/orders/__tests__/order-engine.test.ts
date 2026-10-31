import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeSubtotal, canTransition, type OrderDraft, type OrderItem } from "../types";
import { validateOrderDraft } from "../validation";
import { deriveIdempotencyKey, claimOrderKey, resetIdempotencyForTests } from "../idempotency";
import { statusForEvent, statusForProviderStatus, normalizeEventName } from "../status-mapping";
import { orderToUniversalDraft, draftToUniversalDraft } from "../order-mapping";
import { classifyProviderFailure, orderError } from "../errors";
import { mapDraftToUrbanPiperOrder } from "@/lib/integration/providers/urbanpiper/mapping";
import { createOrder, getOrderById, listCustomerOrders, validateOrder } from "../order-service";
import { resetOrderStoreForTests, saveOrder } from "../order-store.server";
import { menuItems } from "@/data/menu";
import { menuRepository } from "@/lib/menu-repository";
import { restaurantLocations } from "@/config/locations";
import { groupMin } from "@/lib/modifiers";
import type { InternalOrder } from "../types";

const item = (over: Partial<OrderItem> = {}): OrderItem => ({
  lineId: "l1",
  productId: "pizza-pepperoni",
  providerProductId: "UP-PEP",
  name: "Pepperoni",
  quantity: 2,
  unitPrice: 1499,
  modifiers: [
    {
      groupId: "size",
      choiceId: "large",
      providerModifierId: "UP-LG",
      label: "Size: Large",
      priceDelta: 300,
    },
  ],
  notes: "",
  ...over,
});

const draft = (over: Partial<OrderDraft> = {}): OrderDraft => ({
  locationId: "ndg",
  orderType: "PICKUP",
  items: [item()],
  customer: {
    customerId: null,
    takatakCustomerId: null,
    name: "Mathieu",
    phone: "5145550000",
    email: null,
    isGuest: true,
  },
  deliveryAddress: null,
  notes: "",
  ...over,
});

const mapped = { locationKnown: true, locationMapped: true };

describe("cart -> order", () => {
  it("prices lines including modifier deltas", () => {
    expect(computeSubtotal([item()])).toBe((1499 + 300) * 2);
  });

  it("ignores unpriced lines instead of inventing a price", () => {
    expect(computeSubtotal([item({ unitPrice: null })])).toBe(0);
  });
});

describe("validation", () => {
  it("accepts a complete pickup order at a mapped store", () => {
    expect(validateOrderDraft(draft(), mapped).valid).toBe(true);
  });

  it("refuses an empty cart", () => {
    const report = validateOrderDraft(draft({ items: [] }), mapped);
    expect(report.errors.map((e) => e.code)).toContain("empty_cart");
  });

  it("refuses zero, fractional, non-finite and excessive quantities", () => {
    for (const quantity of [0, -1, 1.5, NaN, Infinity, 51]) {
      const report = validateOrderDraft(draft({ items: [item({ quantity })] }), mapped);
      expect(
        report.errors.map((e) => e.code),
        String(quantity),
      ).toContain("menu_changed");
    }
    expect(validateOrderDraft(draft({ items: [item({ quantity: 50 })] }), mapped).valid).toBe(true);
  });

  it("refuses delivery without an address", () => {
    const report = validateOrderDraft(draft({ orderType: "DELIVERY" }), mapped);
    expect(report.errors.map((e) => e.code)).toContain("missing_address");
  });

  it("refuses an unmapped location", () => {
    const report = validateOrderDraft(draft(), { locationKnown: true, locationMapped: false });
    expect(report.errors.map((e) => e.code)).toContain("location_not_mapped");
  });

  it("refuses a sold-out item", () => {
    const report = validateOrderDraft(draft(), {
      ...mapped,
      availability: { "pizza-pepperoni": false },
    });
    expect(report.errors.map((e) => e.code)).toContain("item_unavailable");
  });

  it("refuses order types that are not open", () => {
    const report = validateOrderDraft(draft({ orderType: "KIOSK" }), mapped);
    expect(report.errors.map((e) => e.code)).toContain("unsupported_order_type");
  });

  it("requires a name and a phone number", () => {
    const report = validateOrderDraft(
      draft({
        customer: {
          customerId: null,
          takatakCustomerId: null,
          name: "",
          phone: "",
          email: null,
          isGuest: true,
        },
      }),
      mapped,
    );
    const codes = report.errors.map((e) => e.code);
    expect(codes).toContain("missing_name");
    expect(codes).toContain("missing_phone");
  });
});

describe("malformed browser checkout payloads", () => {
  it("rejects invalid runtime JSON without throwing or creating an order", () => {
    const validShape = {
      locationId: "ndg",
      orderType: "PICKUP",
      lines: [],
      customer: { name: "Guest", phone: "5145550101" },
      deliveryAddress: null,
      notes: "",
    };
    const malformed: unknown[] = [
      null,
      [],
      { ...validShape, lines: null },
      { ...validShape, lines: new Array(101).fill(null) },
      { ...validShape, customer: null },
      { ...validShape, customer: { name: 123, phone: "5145550101" } },
      { ...validShape, deliveryAddress: 7 },
      { ...validShape, notes: 7 },
      { ...validShape, lines: [null] },
      { ...validShape, lines: [{ itemId: "pizza", quantity: 1, notes: 4, selections: {} }] },
    ];
    for (const candidate of malformed) {
      const request = candidate as Parameters<typeof validateOrder>[0];
      expect(() => validateOrder(request)).not.toThrow();
      expect(validateOrder(request).errors[0]?.code).toBe("menu_changed");
      expect(() => createOrder(request)).not.toThrow();
      expect(createOrder(request).ok).toBe(false);
    }
  });
});

describe("pre-launch checkout catalog isolation and bounded input", () => {
  const availableProduct = () => {
    const product = menuItems.find(
      (candidate) =>
        candidate.isAvailable && !candidate.modifierGroups?.some((group) => groupMin(group) > 0),
    );
    if (!product) throw new Error("Expected an available no-required-options menu item");
    return product;
  };
  const requestFor = (product = availableProduct()) => ({
    locationId: product.locationIds[0]!,
    orderType: "PICKUP" as const,
    lines: [{ itemId: product.id, quantity: 1, notes: "", selections: {} }],
    customer: {
      customerId: null,
      takatakCustomerId: null,
      name: "Test Customer",
      phone: "5145550001",
      email: null,
      isGuest: true,
    },
    deliveryAddress: null,
    notes: "",
  });

  it("rejects products that the merchant marked sold out before creating an order", () => {
    const product = availableProduct();
    const spy = vi
      .spyOn(menuRepository, "getItem")
      .mockImplementation((id) => (id === product.id ? { ...product, isAvailable: false } : null));
    try {
      const request = requestFor(product);
      expect(validateOrder(request).errors.map((e) => e.code)).toContain("item_unavailable");
      const created = createOrder(request);
      expect(created.ok).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects an otherwise valid product submitted to a different restaurant", () => {
    const product = availableProduct();
    const other = restaurantLocations.find(
      (location) => !product.locationIds.includes(location.id),
    );
    if (!other) throw new Error("Expected another real PPP location");
    const request = { ...requestFor(product), locationId: other.id };
    expect(validateOrder(request).errors.map((e) => e.code)).toContain("item_unavailable");
    expect(createOrder(request).ok).toBe(false);
  });

  it("takes Clover delivery only to a served postal code, before any checkout session", () => {
    const delivery = (deliveryAddress: string | null) => ({
      ...requestFor(),
      orderType: "DELIVERY" as const,
      deliveryAddress,
    });
    const codes = (address: string | null) =>
      validateOrder(delivery(address)).errors.map((e) => e.code);
    expect(codes("123 Test Street, Montreal")).toContain("outside_delivery_area");
    expect(codes("1 rue Sainte-Catherine, Montréal, QC H2X 1Z4")).toContain(
      "outside_delivery_area",
    );
    expect(codes(null)).toContain("missing_address");
    expect(codes("5800 Av. Monkland, Montréal, QC H4A 1G1")).not.toContain("outside_delivery_area");
    expect(createOrder(delivery("123 Test Street, Montreal")).ok).toBe(false);
  });

  it("refuses a malformed or excessive tip at the API boundary", () => {
    for (const tip of [-1, 1.5, Number.NaN, 200_01, "500"]) {
      const request = { ...requestFor(), tip } as unknown as Parameters<typeof validateOrder>[0];
      expect(validateOrder(request).valid).toBe(false);
    }
  });

  it("rejects oversized untrusted customer fields and modifier maps at the API boundary", () => {
    const baseline = requestFor();
    const malformed = [
      { ...baseline, customer: { ...baseline.customer, name: "A".repeat(121) } },
      { ...baseline, customer: { ...baseline.customer, phone: "9".repeat(41) } },
      { ...baseline, customer: { ...baseline.customer, email: "a".repeat(255) } },
      { ...baseline, notes: "n".repeat(481) },
      { ...baseline, deliveryAddress: "x".repeat(501) },
      { ...baseline, lines: [{ ...baseline.lines[0]!, itemId: "x".repeat(129) }] },
      { ...baseline, lines: [{ ...baseline.lines[0]!, notes: "x".repeat(241) }] },
      {
        ...baseline,
        lines: [
          {
            ...baseline.lines[0]!,
            selections: Object.fromEntries(
              Array.from({ length: 101 }, (_, i) => [`group-${i}`, "choice"]),
            ),
          },
        ],
      },
    ];
    for (const input of malformed) {
      expect(validateOrder(input).errors[0]?.code).toBe("menu_changed");
      expect(createOrder(input).ok).toBe(false);
    }
  });
});

describe("idempotency", () => {
  beforeEach(resetIdempotencyForTests);

  it("derives the same key for the same order in the same window", () => {
    const now = Date.now();
    expect(deriveIdempotencyKey(draft(), now)).toBe(deriveIdempotencyKey(draft(), now));
  });

  it("ignores line ordering", () => {
    const now = Date.now();
    const a = draft({ items: [item({ productId: "a" }), item({ productId: "b" })] });
    const b = draft({ items: [item({ productId: "b" }), item({ productId: "a" })] });
    expect(deriveIdempotencyKey(a, now)).toBe(deriveIdempotencyKey(b, now));
  });

  it("changes when the cart changes", () => {
    const now = Date.now();
    const other = draft({ items: [item({ quantity: 5 })] });
    expect(deriveIdempotencyKey(draft(), now)).not.toBe(deriveIdempotencyKey(other, now));
  });

  it("returns the first order id on a duplicate submission", () => {
    const key = deriveIdempotencyKey(draft());
    expect(claimOrderKey(key, "ord_1").fresh).toBe(true);
    const second = claimOrderKey(key, "ord_2");
    expect(second.fresh).toBe(false);
    expect(second.orderId).toBe("ord_1");
  });
});

describe("status mapping", () => {
  it("maps canonical webhook events", () => {
    expect(statusForEvent("ORDER_ACCEPTED")).toBe("ACCEPTED");
    expect(statusForEvent("order.preparing")).toBe("PREPARING");
    expect(statusForEvent("order-ready")).toBe("READY");
    expect(statusForEvent("ORDER_COMPLETED")).toBe("COMPLETED");
    expect(statusForEvent("ORDER_CANCELLED")).toBe("CANCELLED");
  });

  it("returns null for unknown events instead of guessing", () => {
    expect(normalizeEventName("something.else")).toBeNull();
    expect(statusForEvent("something.else")).toBeNull();
  });

  it("maps provider status vocabulary", () => {
    expect(statusForProviderStatus("Food Ready")).toBe("READY");
    expect(statusForProviderStatus("In Kitchen")).toBe("PREPARING");
    expect(statusForProviderStatus("Rejected")).toBe("FAILED");
    expect(statusForProviderStatus("mystery")).toBeNull();
  });

  it("never moves a status backwards or past a terminal state", () => {
    expect(canTransition("CREATED", "PREPARING")).toBe(true);
    expect(canTransition("READY", "PREPARING")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("PREPARING", "CANCELLED")).toBe(true);
  });
});

describe("order mapping", () => {
  const order: InternalOrder = {
    id: "ord_1",
    orderNumber: null,
    customerId: null,
    locationId: "ndg",
    providerLocationId: "UP-NDG",
    provider: "urbanpiper",
    orderType: "DELIVERY",
    items: [item()],
    subtotal: computeSubtotal([item()]),
    tax: null,
    total: null,
    paymentStatus: "PAY_AT_RESTAURANT",
    status: "CREATED",
    providerStatus: null,
    providerOrderId: null,
    idempotencyKey: "k",
    customer: draft().customer,
    deliveryAddress: "6280 Av. Somerled",
    notes: "ring twice",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failureCode: null,
  };

  it("keeps provider product and modifier ids on every line", () => {
    const universal = orderToUniversalDraft(order);
    expect(universal.lines[0]?.externalProductId).toBe("UP-PEP");
    expect(universal.lines[0]?.modifiers[0]?.externalChoiceId).toBe("UP-LG");
  });

  it("routes to the provider store id and the right fulfilment type", () => {
    const payload = mapDraftToUrbanPiperOrder(orderToUniversalDraft(order), "UP-NDG");
    expect(payload.store_ref_id).toBe("UP-NDG");
    expect(payload.order_type).toBe("delivery");
    expect(payload.address).toBe("6280 Av. Somerled");
    expect(payload.items[0]?.ref_id).toBe("UP-PEP");
  });

  it("maps a pickup draft without an address", () => {
    const payload = mapDraftToUrbanPiperOrder(draftToUniversalDraft(draft()), "UP-NDG");
    expect(payload.order_type).toBe("pickup");
    expect(payload.address).toBeNull();
  });
});

describe("errors", () => {
  it("speaks human in three languages", () => {
    const err = orderError("menu_changed");
    expect(err.messageEn).toBe("Something changed with your order. Please review it.");
    expect(err.messageFr.length).toBeGreaterThan(0);
    expect(err.messageEs.length).toBeGreaterThan(0);
  });

  it("classifies provider failures without leaking them", () => {
    expect(classifyProviderFailure("ETIMEDOUT calling hub")).toBe("timeout");
    expect(classifyProviderFailure("store closed")).toBe("location_closed");
    expect(classifyProviderFailure("item sold out")).toBe("item_unavailable");
    expect(classifyProviderFailure("500 internal")).toBe("provider_error");
  });
});

describe("order lookup", () => {
  beforeEach(() => {
    resetIdempotencyForTests();
    resetOrderStoreForTests();
  });

  const sampleOrder = (over: Partial<InternalOrder> = {}): InternalOrder => ({
    id: `ord_${Math.random().toString(36).slice(2, 8)}`,
    orderNumber: null,
    customerId: null,
    locationId: "ndg",
    providerLocationId: null,
    provider: "local",
    orderType: "PICKUP",
    items: [item()],
    subtotal: computeSubtotal([item()]),
    tax: null,
    total: null,
    paymentStatus: "PAY_AT_RESTAURANT",
    status: "CREATED",
    providerStatus: null,
    providerOrderId: null,
    idempotencyKey: `k_${Math.random().toString(36).slice(2, 8)}`,
    customer: {
      customerId: null,
      takatakCustomerId: null,
      name: "Mathieu",
      phone: "5145550000",
      email: null,
      isGuest: true,
    },
    deliveryAddress: null,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failureCode: null,
    ...over,
  });

  it("reads a saved order back by id", async () => {
    const order = sampleOrder({
      id: "ord_lookup_1",
      customer: { ...sampleOrder().customer, phone: "5145550001" },
    });
    saveOrder(order);

    const found = await getOrderById("ord_lookup_1");
    expect(found).not.toBeNull();
    expect(found?.customer.phone).toBe("5145550001");
  });

  it("finds orders by phone when no customer id is set", () => {
    saveOrder(
      sampleOrder({
        id: "ord_a",
        customer: { ...sampleOrder().customer, phone: "5145550002" },
      }),
    );
    saveOrder(
      sampleOrder({
        id: "ord_b",
        customer: { ...sampleOrder().customer, phone: "5145550002" },
      }),
    );

    const matches = listCustomerOrders(null, "5145550002");
    expect(matches.length).toBe(2);
    expect(matches.every((o) => o.customer.phone === "5145550002")).toBe(true);
  });

  it("does not leak one customer's phone orders to another phone", () => {
    saveOrder(
      sampleOrder({
        id: "ord_c",
        customer: { ...sampleOrder().customer, phone: "5145550003" },
      }),
    );
    saveOrder(
      sampleOrder({
        id: "ord_d",
        customer: { ...sampleOrder().customer, phone: "5145550004" },
      }),
    );

    expect(listCustomerOrders(null, "5145550003").length).toBe(1);
    expect(listCustomerOrders(null, "5145550004").length).toBe(1);
    expect(listCustomerOrders(null, "5145559999").length).toBe(0);
  });
});
