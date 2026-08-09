/**
 * Single customer-facing registry of every external PPP destination.
 *
 * Canonical business truth (address / phone / brand) lives in
 * `src/config/business.ts`. Nothing here may override it: marketplaces and
 * directories are links, never authority.
 */

export type OrderingProvider = "direct" | "uber_eats" | "doordash" | "skip";
export type SocialProvider = "facebook" | "instagram" | "tiktok" | "x" | "google";

export interface OrderingChannelConfig {
  id: Exclude<OrderingProvider, "direct">;
  name: string;
  /** The restaurant's storefront on that marketplace — where an order is placed. */
  orderingUrl: string;
  /** That marketplace's own help/support destination — never the storefront. */
  supportUrl: string;
  /** Where a placed order can be tracked on that marketplace, if different from supportUrl. */
  trackingUrl: string;
  /** Local brand asset. null renders the branded-text fallback card. */
  logo: string | null;
  labelEn: string;
  labelFr: string;
}

/** Strips marketing/tracking params while keeping the store path intact. */
function clean(url: string) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (/^(srsltid|utm_|_t$|_r$|mibextid|pl$|fbclid|gclid|s$|t$)/i.test(key)) {
        u.searchParams.delete(key);
      }
    }
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}

export const orderingChannels: OrderingChannelConfig[] = [
  {
    id: "uber_eats",
    name: "Uber Eats",
    orderingUrl: clean(
      "https://www.ubereats.com/ca/store/ppp-pizzeria-ndg/3Ek_uhIPUpylCMrvapJt6Q?srsltid=AfmBOoqNFJmEOTNhfhIsmjqGmN7LomjbmipFI7KLPdHpQRT-WlOUzqNN",
    ),
    supportUrl: "https://help.uber.com/ubereats",
    trackingUrl: "https://www.ubereats.com/orders",
    logo: "/brands/uber-eats.svg",
    labelEn: "Order on Uber Eats",
    labelFr: "Commander sur Uber Eats",
  },
  {
    id: "doordash",
    name: "DoorDash",
    orderingUrl: clean(
      "https://www.doordash.com/en-CA/store/ppp-pizzeria-montr%C3%A9al-28040070/112031546/?srsltid=AfmBOoqojNGmDjaRfibExpfxYCx1T7_LCVAKWw0zeN3oS9FAAFp9kIXm",
    ),
    supportUrl: "https://help.doordash.com/en-ca/consumers",
    trackingUrl: "https://www.doordash.com/orders/",
    logo: "/brands/doordash.svg",
    labelEn: "Order on DoorDash",
    labelFr: "Commander sur DoorDash",
  },
  {
    id: "skip",
    name: "SkipTheDishes",
    orderingUrl: "https://www.skipthedishes.com/ppp-somerled",
    supportUrl: "https://www.skipthedishes.com/contact-us",
    trackingUrl: "https://www.skipthedishes.com/account/orders",
    logo: "/brands/skip.svg",
    labelEn: "Order on Skip",
    labelFr: "Commander sur Skip",
  },
];

export const externalPresence = {
  ordering: {
    direct: null as string | null,
    uberEats: orderingChannels[0]!.orderingUrl,
    doorDash: orderingChannels[1]!.orderingUrl,
    skip: orderingChannels[2]!.orderingUrl,
  },
  social: {
    facebook: clean("https://www.facebook.com/pppmtl.com1?mibextid=ZbWKwL"),
    facebookNdg: "https://www.facebook.com/pppmtlndg/",
    instagram: "https://www.instagram.com/ppp_pizzeria/",
    tiktok: clean("https://www.tiktok.com/@ppp.montralnord?_t=8k3XdsH9KxZ&_r=1"),
    x: clean("https://x.com/pppmtlnord?t=0ECqmxBgyFs-cuqJ2NcEtg&s=09"),
  },
  discovery: {
    google: "https://share.google/HFn24inA7Rv5e5KPP",
    birdeye:
      "https://reviews.birdeye.com/ppp-pizzeria-montreal-notre-dame-de-grace-178422350318628",
    restoEnLigne:
      "https://restoenligne.com/en/restaurants/home/ppp-pizzeria-montreal-notre-dame-de-grace",
  },
  /**
   * Owner-supplied URLs that describe older Montréal-Nord / Hochelaga
   * identities. Retained on purpose, never shown as NDG ordering or NDG truth.
   */
  legacy: {
    yelpMontrealNord: "https://www.yelp.ca/biz/ppp-mtl-montr%C3%A9al",
    trustindexMontrealNord: "https://www.trustindex.io/reviews/pppmtl.com",
    tripadvisorLegacy:
      "https://www.tripadvisor.com/Restaurant_Review-g155032-d27418420-Reviews-PPP_PIZZERIA_Montreal-Montreal_Quebec.html",
    tooGoodToGoMontrealNord:
      "https://www.toogoodtogo.com/fr-ca/find/montreal/ppppizzeriamontrealnord/other/75sacsurprise-143507182468351041",
    orderOnlineHochelaga: "https://order.online/store/ppp-pizzeria-hochelaga-33598081",
    setmoreMontrealNord: "https://pppmtl.setmore.com/",
  },
} as const;

/** Brand social profiles safe to publish in NDG structured data. */
export const currentBrandSameAs = [
  externalPresence.social.facebook,
  externalPresence.social.facebookNdg,
  externalPresence.social.instagram,
  externalPresence.social.tiktok,
  externalPresence.social.x,
];
