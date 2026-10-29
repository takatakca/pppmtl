/**
 * Uber Eats marketplace channel.
 *
 * Marketplaces are NOT called from PPP. They are aggregated by the ordering
 * engine (TAKATAK Food Hub) and, for the customer, they are simply
 * storefront links owned by `src/config/locations.ts`.
 */

import type { MarketplaceChannel } from "./types";
import { locationById } from "@/config/locations";

export const uberEatsChannel: MarketplaceChannel = {
  id: "uber_eats",
  label: "Uber Eats",
  managedBy: "foodhub",
  storefrontUrl: (locationId: string) => locationById(locationId)?.ordering.uberEats ?? null,
};
