/**
 * Address, phone and distance helpers for courier dispatch. Pure, no I/O.
 *
 * The checkout stores the delivery address as one line (deliveryAddressLine, src/config/delivery.ts):
 *   "<street>, App. <unit>, <city>, QC <postal code> — <instructions>"   (unit and instructions optional)
 * Couriers need it split: Uber Direct takes a structured address
 * (https://developer.uber.com/docs/deliveries/get-started), DoorDash Drive a comma-separated line
 * (https://developer.doordash.com/en-US/api/drive/). Both want phone numbers in E.164 (+1…).
 */
import { distanceKm, postalCodeOf } from "@/config/delivery";
import type { DispatchAddress } from "./types";

const PROVINCES: Record<string, string> = {
  qc: "QC",
  québec: "QC",
  quebec: "QC",
  "qué.": "QC",
  on: "ON",
  ontario: "ON",
};

const UNIT_PREFIX =
  /^(?:app\.?|apt\.?|appartement|apartment|unit[ée]?|suite|bureau|logement|log\.?|#)\s*(.+)$/i;
/** Where the postal code starts at the end of the last part; postalCodeOf (src/config/delivery.ts) validates it. */
const TRAILING_POSTAL = /[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\s*$/;
/** " — " (em dash) separates the instructions; an en dash is accepted too. */
const INSTRUCTIONS_SEPARATOR = /\s+[—–]\s+/;

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Split the checkout's one-line address. Null when it cannot be read with confidence. */
export function parseDeliveryAddress(raw: string | null | undefined): DispatchAddress | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.length > 600) return null;

  const separator = INSTRUCTIONS_SEPARATOR.exec(text);
  const addressPart = separator ? text.slice(0, separator.index) : text;
  const instructions = separator ? clean(text.slice(separator.index + separator[0].length)) : "";

  const parts = addressPart
    .split(",")
    .map(clean)
    .filter((p) => p.length > 0);
  if (parts.length > 0 && /^canada$/i.test(parts[parts.length - 1] ?? "")) parts.pop();
  if (parts.length < 2) return null;

  // Last part: "QC H3X 2B6", "Québec H3X2B6" or just "H3X 2B6". The checkout's postalCodeOf validates it.
  const last = parts.pop() ?? "";
  const at = last.search(TRAILING_POSTAL);
  const postalCode = at >= 0 ? postalCodeOf(last.slice(at)) : null;
  if (!postalCode) return null;
  let province = "QC";
  let city: string | undefined;
  const before = clean(last.slice(0, at));
  if (before) {
    const known = PROVINCES[before.toLowerCase()];
    if (known) province = known;
    else if (/^[A-Za-z]{2}$/.test(before)) province = before.toUpperCase();
    else city = before; // "Montréal H3X 2B6"
  }

  if (!city) city = parts.pop();
  const street = parts.shift();
  if (!street || !city || !/\d/.test(street)) return null;

  const unitParts = parts.map((p) => UNIT_PREFIX.exec(p)?.[1]?.trim() ?? p).filter(Boolean);
  return {
    street,
    unit: unitParts.length ? unitParts.join(" ") : null,
    city,
    province,
    postalCode,
    country: "CA",
    instructions: instructions || null,
  };
}

/** "6280 Av. Somerled, Montréal, QC H3X 2B6, Canada" — the unit is sent separately. */
export function addressOneLine(address: DispatchAddress): string {
  return `${address.street}, ${address.city}, ${address.province} ${address.postalCode}, Canada`;
}

/** Unit + customer instructions, as one note for the courier. */
export function dropoffNote(address: DispatchAddress): string {
  return [address.unit ? `App./Apt ${address.unit}` : "", address.instructions ?? ""]
    .filter(Boolean)
    .join(" — ");
}

/**
 * North American number to E.164 (+1XXXXXXXXXX). Null when it is not a valid NANP number:
 * area code and exchange cannot start with 0 or 1.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

/** "Marie Tremblay" → { given: "Marie", family: "Tremblay" }. */
export function splitName(name: string): { given: string; family: string } {
  const parts = clean(name).split(" ");
  const given = parts.shift() ?? "";
  return { given, family: parts.join(" ") };
}

/** Straight-line distance in whole metres (the checkout's haversine, src/config/delivery.ts). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return Math.round(distanceKm(a, b) * 1000);
}

/** Short text for the courier apps; providers cap notes (Uber: 280 characters). */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
