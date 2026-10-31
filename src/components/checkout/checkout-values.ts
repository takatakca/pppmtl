/** Checkout form values and the rules on them (kept apart from the components). */
import { deliversTo, postalCodeOf } from "@/config/delivery";
import { MAX_TIP_CENTS, tipFromPercent } from "@/lib/pricing";

export interface DeliveryAddressValue {
  street: string;
  unit: string;
  city: string;
  postalCode: string;
  instructions: string;
  lat: number | null;
  lng: number | null;
}

export const EMPTY_DELIVERY_ADDRESS: DeliveryAddressValue = {
  street: "",
  unit: "",
  city: "Montréal",
  postalCode: "",
  instructions: "",
  lat: null,
  lng: null,
};

export type DeliveryAreaStatus = "incomplete" | "served" | "outside";

/** What the server will decide from the postal code (config/delivery.ts). */
export function deliveryAreaStatus(value: DeliveryAddressValue): DeliveryAreaStatus {
  const postal = postalCodeOf(value.postalCode);
  if (!value.street.trim() || !postal) return "incomplete";
  return deliversTo(postal) ? "served" : "outside";
}

export type TipChoice =
  { kind: "none" } | { kind: "percent"; percent: number } | { kind: "amount"; text: string };

/** Cents for a choice; an unreadable custom amount counts as no tip. */
export function tipCents(choice: TipChoice, subtotalCents: number): number {
  if (choice.kind === "percent") return tipFromPercent(subtotalCents, choice.percent);
  if (choice.kind === "amount") {
    const dollars = Number(choice.text.replace(",", ".").replace(/[^\d.]/g, ""));
    return Number.isFinite(dollars) ? Math.min(Math.round(dollars * 100), MAX_TIP_CENTS) : 0;
  }
  return 0;
}
