import type { Location, OrderMode } from "@/data/menu";

export type ChannelKind = "direct" | "phone" | "marketplace" | "surplus";

export interface OrderChannel {
  id: string;
  label: string;
  kind: ChannelKind;
  href: string | null;
  /** Direct channels are always promoted above marketplaces. */
  priority: number;
}

/**
 * Resolves the ordering shortcuts for a location. Direct ordering always ranks
 * first; marketplaces are secondary and never replace the direct CTA.
 */
export function orderChannels(location: Location | null, mode: OrderMode): OrderChannel[] {
  if (!location) return [];
  const l = location.links;
  const direct = mode === "pickup" ? l.directPickupUrl : l.directDeliveryUrl;
  const list: OrderChannel[] = [
    { id: "direct", label: "PPP Direct", kind: "direct", href: direct, priority: 0 },
    {
      id: "phone",
      label: "Call the restaurant",
      kind: "phone",
      href: l.phoneOrderNumber ? `tel:${l.phoneOrderNumber}` : null,
      priority: 1,
    },
    { id: "ubereats", label: "Uber Eats", kind: "marketplace", href: l.uberEatsUrl, priority: 2 },
    { id: "doordash", label: "DoorDash", kind: "marketplace", href: l.doorDashUrl, priority: 3 },
    { id: "skip", label: "SkipTheDishes", kind: "marketplace", href: l.skipUrl, priority: 4 },
    {
      id: "tgtg",
      label: "Too Good To Go",
      kind: "surplus",
      href: l.tooGoodToGoUrl,
      priority: 5,
    },
  ];
  return list.sort((a, b) => a.priority - b.priority);
}

export function marketplaceChannels(location: Location | null, mode: OrderMode) {
  return orderChannels(location, mode).filter((c) => c.kind === "marketplace");
}
