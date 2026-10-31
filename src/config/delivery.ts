/**
 * Website delivery (owner decision 2026-10-31): pppmtl.com takes delivery orders for a flat fee; once Clover confirms
 * the payment, the restaurant books a courier (DoorDash, Uber or its own driver) from its back end.
 *
 * Isomorphic and pure: the checkout uses it to guide the customer, the server re-checks every rule.
 * The served area is a list of postal-code areas (FSA, the first 3 characters) around NDG — TO CONFIRM WITH THE OWNER.
 */
import { restaurantLocations } from "@/config/locations";

/** Flat delivery fee, cents. Taxable (TPS + TVQ), like the food it delivers. */
export const DELIVERY_FEE_CENTS = 500;

/** Stores (location slugs) that take delivery orders on the website. */
export const DELIVERY_LOCATION_SLUGS = ["ndg"];

/** True when this store (location id) takes website delivery orders. */
export function websiteDeliveryAt(locationId: string | null | undefined): boolean {
  const slug = restaurantLocations.find((l) => l.id === locationId)?.slug;
  return Boolean(slug && DELIVERY_LOCATION_SLUGS.includes(slug));
}

/** PPP NDG, 6280 Av. Somerled — OpenStreetMap node 4368685572 (nominatim.openstreetmap.org, 2026-10-31). */
export const RESTAURANT_COORDS = { lat: 45.47059, lng: -73.63531 };

/** Postal-code areas served from NDG (about 6 km). */
export const DELIVERY_FSAS = [
  "H3X", // Hampstead / NDG (the restaurant)
  "H4A", // NDG
  "H4B", // NDG / Loyola
  "H4V", // NDG south
  "H4W", // Côte-Saint-Luc
  "H4X", // Montréal-Ouest
  "H3W", // Côte-des-Neiges / Snowdon
  "H3S", // Côte-des-Neiges
  "H3T", // Côte-des-Neiges / Université de Montréal
  "H3Y", // Westmount
  "H3Z", // Westmount
  "H4C", // Saint-Henri
];

/** Distance shown to the customer as a guide; the postal code decides. */
export const DELIVERY_RADIUS_KM = 6;

/** Canadian postal code anywhere in a text ("h3x2b6", "H3X 2B6"), normalised "H3X 2B6", or null. */
export function postalCodeOf(text: string | null | undefined): string | null {
  const m = /\b([ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z])\s?(\d[ABCEGHJ-NPRSTV-Z]\d)\b/i.exec(
    text ?? "",
  );
  return m ? `${m[1]} ${m[2]}`.toUpperCase() : null;
}

export function deliversTo(postalCode: string | null): boolean {
  return Boolean(postalCode && DELIVERY_FSAS.includes(postalCode.slice(0, 3).toUpperCase()));
}

/** Straight-line distance (haversine), km. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** The one-line address the kitchen ticket, the courier and Clover read. */
export function deliveryAddressLine(a: {
  street: string;
  unit?: string;
  city?: string;
  postalCode: string;
  instructions?: string;
}): string {
  const where = [
    a.street.trim(),
    a.unit?.trim() ? `App. ${a.unit.trim()}` : "",
    `${(a.city ?? "").trim() || "Montréal"}, QC ${postalCodeOf(a.postalCode) ?? a.postalCode.trim()}`,
  ]
    .filter(Boolean)
    .join(", ");
  const note = a.instructions?.trim();
  return (note ? `${where} — ${note}` : where).slice(0, 300);
}
