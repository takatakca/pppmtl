/**
 * SkipTheDishes marketplace channel. Storefront links only — order and menu
 * sync belong to Food Hub once the direct integration is authorized; PPP still only exposes links.
 */

import type { MarketplaceChannel } from "./types";
import { locationById } from "@/config/locations";

export const skipChannel: MarketplaceChannel = {
  id: "skip",
  label: "SkipTheDishes",
  managedBy: "foodhub",
  storefrontUrl: (locationId: string) => locationById(locationId)?.ordering.skip ?? null,
};
