/**
 * SkipTheDishes marketplace channel. Storefront links only — order and menu
 * sync belong to the aggregator, never to the PPP frontend.
 */

import type { MarketplaceChannel } from "./types";
import { locationById } from "@/config/locations";

export const skipChannel: MarketplaceChannel = {
  id: "skip",
  label: "SkipTheDishes",
  aggregatedBy: "urbanpiper",
  storefrontUrl: (locationId: string) => locationById(locationId)?.ordering.skip ?? null,
};
