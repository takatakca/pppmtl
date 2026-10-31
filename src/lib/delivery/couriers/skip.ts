/**
 * SkipTheDishes: no quote, no booking API.
 *
 * Research 2026-10-31: Skip offers a white-label courier service for orders taken on a restaurant's own website
 * ("SkipGo", https://secretsauce.skipthedishes.com/?p=4109): flat fee per order, set up with Skip's partner team,
 * and connected through Skip-approved middleware (Smooth Commerce, Eigen, Deliverect). Skip publishes no public
 * developer API or documentation for requesting a courier, so this site never quotes or books Skip. Staff book in
 * Skip's restaurant portal and record the booking here, so the order still shows who delivers it.
 */
import { skipPortalUrl } from "@/config/delivery-dispatch";
import { COURIER_LABELS, type CourierOption } from "./types";

export function skipOption(portalUrl: string | undefined = undefined): CourierOption {
  const url = portalUrl?.trim();
  return {
    provider: "skip",
    label: COURIER_LABELS.skip,
    availability: "manual",
    reason:
      "Not available — book in the Skip portal (Skip has no public courier API), then record it here.",
    quoteId: null,
    feeCents: null,
    currency: null,
    pickupEta: null,
    dropoffEta: null,
    distanceMeters: null,
    expiresAt: null,
    sandbox: false,
    manualUrl: url && /^https:\/\//.test(url) ? url : skipPortalUrl,
    badges: [],
  };
}
