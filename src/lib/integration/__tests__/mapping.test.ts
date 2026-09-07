import { describe, expect, it } from "vitest";
import {
  mapCategory,
  mapDraftToUrbanPiperOrder,
  mapModifierGroup,
  mapOrderStatus,
  mapProduct,
  toCents,
} from "@/lib/integration/providers/urbanpiper/mapping";
import { verifyHmacSignature } from "@/lib/integration/providers/urbanpiper/webhook";
import { createHmac } from "node:crypto";
import {
  locationIntegrationMappings,
  isLocationMapped,
  mappingForLocation,
} from "@/config/integration-locations";
import type { UniversalOrderDraft } from "@/lib/integration/core/contracts";

describe("menu mapping", () => {
  it("maps a category with a French fallback", () => {
    const c = mapCategory({ ref_id: "cat-1", title: "Pizza", sort_order: 3 });
    expect(c).toMatchObject({ id: "cat-1", externalId: "cat-1", slug: "pizza", nameFr: "Pizza" });
    expect(c.available).toBe(true);
    expect(c.sortOrder).toBe(3);
  });

  it("converts dollars to cents and keeps unknown prices null", () => {
    expect(toCents(12.5)).toBe(1250);
    expect(toCents(null)).toBeNull();
    expect(toCents(undefined)).toBeNull();
  });

  it("maps a product with prices in cents", () => {
    const p = mapProduct({
      ref_id: "itm-1",
      title: "Large Pepperoni",
      category_ref_id: "cat-1",
      price: 18.99,
      markup_price: 22.99,
      available: false,
    });
    expect(p.price).toBe(1899);
    expect(p.compareAtPrice).toBe(2299);
    expect(p.available).toBe(false);
    expect(p.categoryId).toBe("cat-1");
  });
});

describe("modifier mapping", () => {
  it("derives required/min/max from selectable counts", () => {
    const g = mapModifierGroup({
      ref_id: "grp-size",
      title: "Size",
      min_selectable: 1,
      max_selectable: 1,
      options: [{ ref_id: "sz-l", title: "Large", price: 3, default: true }],
    });
    expect(g.required).toBe(true);
    expect(g.minSelections).toBe(1);
    expect(g.maxSelections).toBe(1);
    expect(g.choices[0]).toMatchObject({ priceDelta: 300, isDefault: true, available: true });
  });

  it("treats a zero minimum as optional", () => {
    const g = mapModifierGroup({
      ref_id: "grp-top",
      title: "Toppings",
      min_selectable: 0,
      max_selectable: 5,
      options: [{ ref_id: "t-1", title: "Mushrooms" }],
    });
    expect(g.required).toBe(false);
    expect(g.maxSelections).toBe(5);
    expect(g.choices[0]!.priceDelta).toBeNull();
  });
});

describe("order mapping", () => {
  it("maps provider statuses to the universal lifecycle", () => {
    expect(mapOrderStatus("Placed")).toBe("CREATED");
    expect(mapOrderStatus("In Kitchen")).toBe("PREPARING");
    expect(mapOrderStatus("Food Ready")).toBe("READY");
    expect(mapOrderStatus("Cancelled")).toBe("CANCELLED");
    expect(mapOrderStatus("Something Else")).toBeNull();
  });

  it("maps a universal draft to the provider order payload", () => {
    const draft: UniversalOrderDraft = {
      locationId: "ndg",
      orderType: "DELIVERY",
      notes: "ring the bell",
      deliveryAddress: "6280 Av. Somerled",
      customer: {
        takatakCustomerId: "tk_1",
        externalCustomerId: null,
        preferredName: "Mathieu",
        email: null,
        phone: "+15140000000",
        phoneVerified: false,
      },
      lines: [
        {
          productId: "itm-1",
          externalProductId: "up-itm-1",
          quantity: 2,
          unitPrice: 1899,
          notes: "",
          modifiers: [
            { groupId: "grp-size", choiceId: "sz-l", externalChoiceId: "up-sz-l", priceDelta: 300 },
          ],
        },
      ],
    };
    const payload = mapDraftToUrbanPiperOrder(draft, "STORE-NDG");
    expect(payload.store_ref_id).toBe("STORE-NDG");
    expect(payload.order_type).toBe("delivery");
    expect(payload.customer.external_id).toBe("tk_1");
    expect(payload.items[0]!.ref_id).toBe("up-itm-1");
    expect(payload.items[0]!.options[0]!.ref_id).toBe("up-sz-l");
  });
});

describe("location mapping", () => {
  it("gives every PPP store an internal id and no invented provider id", () => {
    expect(locationIntegrationMappings.length).toBeGreaterThan(0);
    for (const m of locationIntegrationMappings) {
      expect(m.internalId.startsWith("PPP-")).toBe(true);
      expect(m.providerLocationId).toBeNull();
    }
  });

  it("reports unmapped stores as unmapped", () => {
    const first = locationIntegrationMappings[0]!;
    expect(mappingForLocation(first.locationId)?.internalId).toBe(first.internalId);
    expect(isLocationMapped(first.locationId)).toBe(false);
  });
});

describe("webhook verification", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ event: "order.status", order_id: 42, status: "Food Ready" });

  it("accepts a correct signature", () => {
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyHmacSignature(body, sig, secret)).toBe(true);
  });

  it("rejects a wrong, missing or malformed signature", () => {
    expect(verifyHmacSignature(body, "deadbeef", secret)).toBe(false);
    expect(verifyHmacSignature(body, null, secret)).toBe(false);
    expect(verifyHmacSignature(body, "abc", "")).toBe(false);
  });
});
