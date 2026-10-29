/**
 * DoorDash marketplace channel. Storefront links only — order and menu sync
 * belong to Food Hub once the direct integration is authorized; PPP still only exposes links.
 */

import type { MarketplaceChannel } from "./types";
import { locationById } from "@/config/locations";

export const doorDashChannel: MarketplaceChannel = {
  id: "doordash",
  label: "DoorDash",
  managedBy: "foodhub",
  storefrontUrl: (locationId: string) => locationById(locationId)?.ordering.doorDash ?? null,
};
