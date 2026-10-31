/**
 * PPP internal order -> provider-neutral draft.
 *
 * Provider adapters take the universal draft and shape their own payload, so
 * this file never mentions UrbanPiper. Pure and fully testable.
 */

import type {
  UniversalCustomerRef,
  UniversalOrderDraft,
  UniversalOrderLine,
  UniversalOrderType,
} from "@/lib/integration/core/contracts";
import type { InternalOrder, OrderDraft, OrderItem, OrderType } from "./types";
import { computeSubtotal } from "./types";

function universalOrderType(type: OrderType): UniversalOrderType {
  return type === "DELIVERY" ? "DELIVERY" : "PICKUP";
}

function mapLine(item: OrderItem): UniversalOrderLine {
  return {
    productId: item.productId,
    externalProductId: item.providerProductId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    modifiers: item.modifiers.map((m) => ({
      groupId: m.groupId,
      choiceId: m.choiceId,
      externalChoiceId: m.providerModifierId,
      priceDelta: m.priceDelta,
    })),
    notes: item.notes,
  };
}

function mapCustomer(order: InternalOrder | OrderDraft): UniversalCustomerRef {
  return {
    takatakCustomerId: order.customer.takatakCustomerId,
    externalCustomerId: null,
    preferredName: order.customer.name,
    email: order.customer.email,
    phone: order.customer.phone,
    phoneVerified: false,
  };
}

export function orderToUniversalDraft(order: InternalOrder): UniversalOrderDraft {
  return {
    locationId: order.locationId,
    orderType: universalOrderType(order.orderType),
    lines: order.items.map(mapLine),
    customer: mapCustomer(order),
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    ...(order.tip ? { tip: order.tip } : {}),
    ...(order.deliveryFee ? { deliveryFee: order.deliveryFee } : {}),
  };
}

export function draftToUniversalDraft(draft: OrderDraft): UniversalOrderDraft {
  return {
    locationId: draft.locationId,
    orderType: universalOrderType(draft.orderType),
    lines: draft.items.map(mapLine),
    customer: mapCustomer(draft),
    deliveryAddress: draft.deliveryAddress,
    notes: draft.notes,
  };
}

/** Every line keeps its provider product id, or is flagged as unmapped. */
export function unmappedProductIds(order: InternalOrder): string[] {
  return order.items.filter((i) => i.providerProductId === null).map((i) => i.productId);
}

export function draftSubtotal(draft: OrderDraft): number {
  return computeSubtotal(draft.items);
}
