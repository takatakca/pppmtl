/**
 * schema.org for a franchise brand: one Restaurant per kitchen (same NAP as the Google profiles), the brand's Menu
 * with every dish and its price, opening hours, and sameAs links to its Google profile and live delivery-app pages.
 */
import {
  KITCHENS,
  brandOrigin,
  brandPhone,
  liveLinks,
  orderLinkUrl,
  type Brand,
  type ExtraItem,
} from "@/config/brands";
import {
  brandKeywords,
  brandSeo,
  googleMapsUrl,
  itemForClover,
  primaryOrderUrl,
} from "@/lib/brand/facts";
import type { MenuItem } from "@/data/menu";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function abs(origin: string, path: string) {
  return path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

function menuItemLd(origin: string, item: MenuItem) {
  return {
    "@type": "MenuItem",
    name: item.nameFr,
    ...(item.descriptionFr ? { description: item.descriptionFr } : {}),
    ...(item.image ? { image: abs(origin, item.image) } : {}),
    ...(item.price !== null
      ? { offers: { "@type": "Offer", price: item.price.toFixed(2), priceCurrency: "CAD" } }
      : {}),
  };
}

/** A dish not in Clover yet: same MenuItem, one Offer per size. */
function extraItemLd(item: ExtraItem) {
  return {
    "@type": "MenuItem",
    name: item.nameFr,
    offers: item.sizes.map((size) => ({
      "@type": "Offer",
      ...(size.labelFr ? { name: size.labelFr } : {}),
      price: size.price.toFixed(2),
      priceCurrency: "CAD",
    })),
  };
}

export function brandJsonLd(brand: Brand) {
  const origin = brandOrigin(brand);
  const phone = brandPhone(brand);
  const heroImages = brand.heroItems
    .map(itemForClover)
    .filter((i): i is MenuItem => i !== null && Boolean(i.image))
    .map((i) => abs(origin, i.image));
  const order = primaryOrderUrl(origin);

  const restaurants = brand.kitchens.map(({ kitchen: id, googleCid }) => {
    const k = KITCHENS[id];
    const links = liveLinks(brand, id).map((l) => orderLinkUrl(l, "fr"));
    return {
      "@type": "Restaurant",
      "@id": `${origin}/#${id}`,
      name: brand.name,
      ...(brand.alternateNames?.length ? { alternateName: brand.alternateNames } : {}),
      description: brandSeo(brand).description,
      keywords: brandKeywords(brand).join(", "),
      url: `${origin}/`,
      telephone: phone.e164,
      ...(heroImages.length ? { image: heroImages } : {}),
      servesCuisine: ["Fast food", ...brand.cuisine.fr],
      priceRange: "$",
      address: {
        "@type": "PostalAddress",
        streetAddress: k.street,
        addressLocality: k.city,
        addressRegion: k.region,
        postalCode: k.postalCode,
        addressCountry: "CA",
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: DAYS,
          opens: k.hours.opens,
          closes: k.hours.closes,
        },
      ],
      hasMenu: { "@id": `${origin}/#menu` },
      acceptsReservations: false,
      ...(googleCid ? { hasMap: googleMapsUrl(googleCid) } : {}),
      sameAs: [...(googleCid ? [googleMapsUrl(googleCid)] : []), ...links],
      // Clover online ordering is pickup at NDG only.
      potentialAction: [...(id === "ndg" ? [order.url] : []), ...links].map((target) => ({
        "@type": "OrderAction",
        target: { "@type": "EntryPoint", urlTemplate: target },
        deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModePickUp"],
      })),
    };
  });

  const menu = {
    "@type": "Menu",
    "@id": `${origin}/#menu`,
    name: `Menu ${brand.name}`,
    inLanguage: "fr-CA",
    hasMenuSection: brand.menu.map((rail) => ({
      "@type": "MenuSection",
      name: rail.title.fr,
      hasMenuItem: [
        ...rail.items
          .map(itemForClover)
          .filter((i): i is MenuItem => i !== null)
          .map((i) => menuItemLd(origin, i)),
        ...(rail.extras ?? []).map(extraItemLd),
      ],
    })),
  };

  const website = {
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    url: `${origin}/`,
    name: brand.name,
    inLanguage: ["fr-CA", "en-CA"],
  };

  return { "@context": "https://schema.org", "@graph": [website, ...restaurants, menu] };
}

/** The all-brands page: one list of the restaurants of a kitchen. */
export function kitchenListJsonLd(origin: string, brands: Brand[], kitchenLabel: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Restaurants · cuisine ${kitchenLabel}`,
    url: `${origin}/marques`,
    itemListElement: brands.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${brandOrigin(b)}/`,
      name: b.name,
    })),
  };
}
