/**
 * Courier dispatch settings for website DELIVERY orders. Non-secret, safe to import anywhere.
 *
 * The restaurant (not the customer) books the courier after Clover confirmed payment: DoorDash Drive,
 * Uber Direct, SkipTheDishes (manual, no public API) or the restaurant's own driver.
 * Credentials are server env vars only (docs/integrations/couriers.md).
 */
import { pppBusiness } from "@/config/business";
import { RESTAURANT_COORDS } from "@/config/delivery";

export const dispatchPickup = {
  businessName: "PPP Pizzeria — NDG",
  street: pppBusiness.address.line1,
  city: pppBusiness.address.city,
  province: pppBusiness.address.province,
  postalCode: pppBusiness.address.postalCode,
  country: "CA" as const,
  phoneE164: pppBusiness.phone.e164,
  /**
   * The checkout's RESTAURANT_COORDS (OpenStreetMap node 4368685572, 6280 Av. Somerled). Sent to Uber Direct,
   * which recommends coordinates in some regions (https://developer.uber.com/docs/deliveries/get-started), and
   * used to show how far a courier is from the restaurant.
   */
  latitude: RESTAURANT_COORDS.lat,
  longitude: RESTAURANT_COORDS.lng,
  instructions: "Commande du site web — demandez au comptoir / Website order — ask at the counter.",
};

/** Language DoorDash uses for the customer's delivery updates (en-US, fr-CA or es-US). */
export const dispatchLocale = "fr-CA" as const;

/**
 * SkipTheDishes publishes no public courier API. Its white-label courier service (SkipGo) is booked with
 * Skip's partner team or through Skip-approved middleware, not by this site. Staff book it in Skip's
 * restaurant portal, then record it here. Login address as given by ChowNow's Skip integration guide
 * (https://get.chownow.com/restaurant-support/how-to-integrate-with-skipthedishes/); the owner should
 * confirm it, or override it with SKIP_PORTAL_URL.
 */
export const skipPortalUrl = "https://restaurants.skipthedishes.com/user/login";
export const skipGoInfoUrl = "https://secretsauce.skipthedishes.com/?p=4109";

/** DoorDash quotes must be accepted within 5 minutes (https://developer.doordash.com/en-US/docs/drive/how_to/quote_deliveries). */
export const DOORDASH_QUOTE_TTL_MS = 5 * 60_000;

/** Largest courier tip staff may add when booking (cents). */
export const MAX_COURIER_TIP_CENTS = 10_000;
