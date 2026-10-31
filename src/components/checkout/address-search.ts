/**
 * Address search for the delivery form, from the browser, with free OpenStreetMap services (no key, no cost):
 *   - suggestions while typing: Photon (photon.komoot.io), which allows search-as-you-type at fair use;
 *   - "Use my location": the device's position, then ONE Nominatim reverse lookup per tap
 *     (nominatim.openstreetmap.org; its policy forbids autocomplete, allows this).
 * Data © OpenStreetMap contributors (ODbL) — the form shows the credit. Everything here fails soft: the customer can
 * always type the address by hand.
 */
import { RESTAURANT_COORDS, postalCodeOf } from "@/config/delivery";

export interface AddressSuggestion {
  /** One line for the list: "6280 Avenue Somerled, Montréal H3X 2B6". */
  label: string;
  street: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
}

/** Greater Montréal (west, south, east, north), so suggestions stay local. */
const MONTREAL_BBOX = "-73.99,45.39,-73.47,45.72";

type Props = Record<string, unknown>;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function fromParts(p: Props, lat: number, lng: number): AddressSuggestion | null {
  const street = [text(p["housenumber"] ?? p["house_number"]), text(p["street"] ?? p["road"])]
    .filter(Boolean)
    .join(" ");
  if (!street) return null;
  const city =
    text(p["city"]) || text(p["town"]) || text(p["village"]) || text(p["locality"]) || "Montréal";
  const postalCode = postalCodeOf(text(p["postcode"])) ?? "";
  return {
    label: [street, `${city}${postalCode ? ` ${postalCode}` : ""}`].join(", "),
    street,
    city,
    postalCode,
    lat,
    lng,
  };
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({
    q,
    limit: "6",
    lang: "fr",
    lat: String(RESTAURANT_COORDS.lat),
    lon: String(RESTAURANT_COORDS.lng),
    bbox: MONTREAL_BBOX,
  });
  try {
    const res = await fetch(`https://photon.komoot.io/api/?${params}`, signal ? { signal } : {});
    if (!res.ok) return [];
    const body = (await res.json()) as {
      features?: Array<{ properties?: Props; geometry?: { coordinates?: [number, number] } }>;
    };
    const seen = new Set<string>();
    return (body.features ?? []).flatMap((f) => {
      const [lng, lat] = f.geometry?.coordinates ?? [];
      if (typeof lat !== "number" || typeof lng !== "number" || !f.properties) return [];
      if (text(f.properties["countrycode"]).toUpperCase() !== "CA") return [];
      const s = fromParts(f.properties, lat, lng);
      if (!s || seen.has(s.label)) return [];
      seen.add(s.label);
      return [s];
    });
  } catch {
    return [];
  }
}

export function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export async function addressAt(lat: number, lng: number): Promise<AddressSuggestion | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "fr",
  });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { address?: Props };
    return body.address ? fromParts(body.address, lat, lng) : null;
  } catch {
    return null;
  }
}
