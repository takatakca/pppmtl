/**
 * The single integration entry point used by the app.
 *
 * Today: the menu comes from the verified local catalog; order submission and
 * order history have no provider, so they report `available: false`. Swapping
 * in Food Hub / Clover later means providing new adapters here —
 * no screen changes.
 */

import { menuRepository } from "@/lib/menu-repository";
import type {
  CustomerOrderAdapter,
  IntegrationStatus,
  MenuSyncAdapter,
  OrderAdapter,
  OrderingIntegration,
} from "@/lib/integration/types";

export * from "@/lib/integration/types";

const unavailable = (): IntegrationStatus => ({
  provider: "local",
  available: false,
  reasonEn: "Online ordering is completed by phone or a delivery app for now.",
  reasonFr: "La commande en ligne se termine par téléphone ou une app de livraison pour l'instant.",
});

const localMenu: MenuSyncAdapter = {
  status: () => ({
    provider: "local",
    available: true,
    reasonEn: "Verified in-house catalog.",
    reasonFr: "Catalogue vérifié à l'interne.",
  }),
  getMenu: async (locationId) => ({
    locationId,
    categories: menuRepository.getCategories(locationId),
    items: menuRepository.getItems(locationId),
    syncedAt: null,
  }),
  getAvailability: async (locationId) =>
    Object.fromEntries(menuRepository.getItems(locationId).map((i) => [i.id, i.isAvailable])),
};

const noOrderProvider: OrderAdapter = {
  status: unavailable,
  quote: async () => ({ status: "unavailable", detail: unavailable() }),
  submit: async () => ({ status: "unavailable", detail: unavailable() }),
};

const noCustomerOrders: CustomerOrderAdapter = {
  status: () => ({
    provider: "local",
    available: false,
    reasonEn: "Order history starts once online ordering is live.",
    reasonFr: "L'historique commence dès que la commande en ligne sera active.",
  }),
  listOrders: async () => [],
  getOrder: async () => null,
};

export const orderingIntegration: OrderingIntegration = {
  menu: localMenu,
  orders: noOrderProvider,
  customerOrders: noCustomerOrders,
};

/** Which provider serves a given storefront. Per-location by design. */
export function orderingSourceFor(locationId: string): IntegrationStatus {
  void locationId;
  return orderingIntegration.orders.status(locationId);
}
