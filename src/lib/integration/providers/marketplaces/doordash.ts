/**
 * DoorDash marketplace channel. Storefront links only — order and menu sync
 * belong to the aggregator, never to the PPP frontend.
 */

import type { MarketplaceChannel } from "./types";
import { locationById } from "@/config/locations";

export const doorDashChannel: MarketplaceChannel = {
  id: "doordash",
  label: "DoorDash",
  aggregatedBy: "urbanpiper",
  storefrontUrl: (locationId: string) => locationById(locationId)?.ordering.doorDash ?? null,
};
