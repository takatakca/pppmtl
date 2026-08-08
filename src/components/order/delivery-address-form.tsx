import { useState } from "react";
import { usePPP } from "@/context/ppp-store";
import { AddressAutocomplete } from "@/components/order/address-autocomplete";

export interface DeliveryAddressDraft {
  street: string;
  unit: string;
  city: string;
  province: string;
  postalCode: string;
  instructions: string;
  save: boolean;
}

const EMPTY: DeliveryAddressDraft = {
  street: "",
  unit: "",
  city: "Montréal",
  province: "QC",
  postalCode: "",
  instructions: "",
  save: false,
};

/**
 * UI-only delivery address capture. The repository seam is not connected, so
 * nothing is persisted and the form says so instead of pretending.
 */
export function DeliveryAddressForm({
  onSubmit,
  authenticated = false,
}: {
  onSubmit: (draft: DeliveryAddressDraft) => void;
  authenticated?: boolean;
}) {
  const { t } = usePPP();
  const [draft, setDraft] = useState<DeliveryAddressDraft>(EMPTY);
  const set = <K extends keyof DeliveryAddressDraft>(k: K, v: DeliveryAddressDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const ready = draft.street.trim().length > 3 && draft.postalCode.trim().length >= 6;

  const field = (
    label: string,
    key: "unit" | "city" | "province" | "postalCode",
    autoComplete: string,
  ) => (
    <label className="block">
      <span className="block text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </span>
      <input
        value={draft[key]}
        onChange={(e) => set(key, e.target.value)}
        autoComplete={autoComplete}
        className="mt-1.5 h-12 w-full border border-border bg-background px-3 text-sm outline-none focus-ppp"
      />
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit(draft);
      }}
      className="grid gap-4"
    >
      <AddressAutocomplete
        label={t("Street address", "Adresse")}
        value={draft.street}
        onChange={(e) => set("street", e.target.value)}
        placeholder="6280 Av. Somerled"
      />
      <div className="grid grid-cols-2 gap-3">
        {field(t("Apt / unit", "App. / unité"), "unit", "address-line2")}
        {field(t("Postal code", "Code postal"), "postalCode", "postal-code")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field(t("City", "Ville"), "city", "address-level2")}
        {field(t("Province", "Province"), "province", "address-level1")}
      </div>
      <label className="block">
        <span className="block text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          {t("Delivery instructions", "Instructions de livraison")}
        </span>
        <textarea
          value={draft.instructions}
          onChange={(e) => set("instructions", e.target.value)}
          rows={2}
          maxLength={200}
          placeholder={t("Buzz 302, side door…", "Sonnez 302, porte de côté…")}
          className="mt-1.5 w-full resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus-ppp"
        />
      </label>

      {authenticated && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={draft.save}
            onChange={(e) => set("save", e.target.checked)}
            className="h-4 w-4 accent-[oklch(0.55_0.2_25)]"
          />
          {t("Save this address to my PPP account", "Enregistrer cette adresse à mon compte PPP")}
        </label>
      )}

      <p className="border border-dashed border-border p-3 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        {t(
          "Prototype: address saving and delivery-zone checks are not connected yet.",
          "Prototype : l'enregistrement d'adresse et la vérification de zone ne sont pas connectés.",
        )}
      </p>

      <button
        type="submit"
        disabled={!ready}
        className="press-tap bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground disabled:opacity-50 focus-ppp"
      >
        {t("Use this address", "Utiliser cette adresse")}
      </button>
    </form>
  );
}
