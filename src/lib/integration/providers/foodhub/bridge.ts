/**
 * First-party TAKATAK Food Hub bridge. No third-party aggregator is involved.
 *
 * What goes to Food Hub today (shared contract of 2026-10-29):
 *   - customer identity: phone verification, the customer projection, addresses, favourites (customer.functions.ts);
 *   - Interac e-Transfer website orders, held at Food Hub until the restaurant confirms the transfer
 *     (interac-orders.server.ts, through placeOrder -> order-service, like Clover).
 * Menu sync still does not come from Food Hub (Clover is the menu for NDG; the local catalog elsewhere), so the
 * menu capability stays truthfully unavailable. The checkout-service `orders` adapter below only reports status:
 * orders themselves are placed with placeOrder.
 */
import type { ProviderAdapterSet } from "@/lib/integration/core/adapter";
import type { CapabilityStatus } from "@/lib/integration/core/contracts";
import { notConfigured } from "@/lib/integration/core/contracts";
import { foodhubConfigured, foodhubLocationCode, interacAvailability } from "./config.server";

export const FOODHUB_WEBSITE_ORDER_INGRESS = "/api/foodhub/webhooks/website-order";

/** True when Interac orders from this store can reach Food Hub (URL + secret + owner switch + verified store code). */
export function foodhubBridgeConfigured(locationId: string): boolean {
  return interacAvailability(locationId, "PICKUP").available;
}

const MENU_EN = "Menus come from Clover (NDG) or the site catalog; Food Hub does not publish the menu yet.";
const MENU_FR =
  "Les menus viennent de Clover (NDG) ou du catalogue du site; Food Hub ne publie pas encore le menu.";

function ordersStatus(locationId: string): CapabilityStatus {
  const availability = interacAvailability(locationId, "PICKUP");
  const reason: Record<NonNullable<typeof availability.reason>, [string, string]> = {
    not_configured: [
      "Food Hub is not connected: FOODHUB_URL and FOODHUB_WEBSITE_ORDER_SECRET are not set.",
      "Food Hub n'est pas connecté : FOODHUB_URL et FOODHUB_WEBSITE_ORDER_SECRET ne sont pas définis.",
    ],
    not_enabled: [
      "Food Hub is connected; Interac e-Transfer orders wait for FOODHUB_INTERAC_ENABLED=true.",
      "Food Hub est connecté; les commandes Interac attendent FOODHUB_INTERAC_ENABLED=true.",
    ],
    location_not_mapped: [
      "This store has no verified Food Hub location code.",
      "Ce restaurant n'a pas de code d'emplacement Food Hub vérifié.",
    ],
    delivery_fee_unknown: ["", ""],
  };
  const [reasonEn, reasonFr] = availability.reason
    ? reason[availability.reason]
    : [
        `Interac e-Transfer orders go to Food Hub (${foodhubLocationCode(locationId) ?? "?"}) and wait for the transfer.`,
        `Les commandes Interac vont à Food Hub (${foodhubLocationCode(locationId) ?? "?"}) et attendent le virement.`,
      ];
  return {
    provider: "foodhub",
    capability: "orders",
    available: availability.available,
    reasonEn,
    reasonFr,
  };
}

function customersStatus(): CapabilityStatus {
  const available = foodhubConfigured();
  return {
    provider: "foodhub",
    capability: "customers",
    available,
    reasonEn: available
      ? "Phone verification and the customer account are served by Food Hub (TAKATAK identity)."
      : "Food Hub is not connected: phone verification and accounts stay closed.",
    reasonFr: available
      ? "La vérification par téléphone et le compte client sont servis par Food Hub (identité TAKATAK)."
      : "Food Hub n'est pas connecté : la vérification par téléphone et les comptes restent fermés.",
  };
}

const USE_PLACE_ORDER = "Food Hub orders are placed with placeOrder (Interac e-Transfer).";

export const foodhubAdapters: ProviderAdapterSet = {
  provider: "foodhub",
  menu: {
    provider: "foodhub",
    status: () => ({
      provider: "foodhub",
      capability: "menu",
      available: false,
      reasonEn: MENU_EN,
      reasonFr: MENU_FR,
    }),
    fetchMenu: async () => notConfigured("Food Hub does not publish the menu to this site."),
    fetchAvailability: async () => notConfigured("Food Hub does not publish availability to this site."),
  },
  orders: {
    provider: "foodhub",
    status: ordersStatus,
    quoteOrder: async () => ({ ok: false, code: "invalid_request", message: USE_PLACE_ORDER }),
    createOrder: async () => ({ ok: false, code: "invalid_request", message: USE_PLACE_ORDER }),
    submitOrder: async () => ({ ok: false, code: "invalid_request", message: USE_PLACE_ORDER }),
    getOrder: async () => ({
      ok: false,
      code: "invalid_request",
      message: "Read orders from the PPP order service.",
    }),
    listOrders: async () => ({ ok: true, data: [] }),
    cancelOrder: async () => ({
      ok: false,
      code: "invalid_request",
      message: "A held Interac order is cancelled by the restaurant in Food Hub.",
    }),
  },
  customers: {
    provider: "foodhub",
    status: customersStatus,
    upsertCustomer: async () =>
      notConfigured("Customers are created by phone verification, never pushed from the site."),
  },
};
