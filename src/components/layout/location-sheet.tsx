import { MapPin, Phone, X } from "lucide-react";
import { locations } from "@/data/menu";
import { usePPP } from "@/context/ppp-store";

export function LocationSheet() {
  const { locationSheetOpen, closeLocationSheet, locationId, setLocationId, mode, setMode, t } =
    usePPP();
  if (!locationSheetOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-label={t("Choose a location", "Choisir un emplacement")}
        className="w-full max-w-lg surface-panel p-6 rise-in"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl uppercase">{t("Your PPP", "Votre PPP")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Pick a restaurant and how you want your order.",
                "Choisissez un restaurant et votre mode de commande.",
              )}
            </p>
          </div>
          <button
            onClick={closeLocationSheet}
            aria-label={t("Close", "Fermer")}
            className="rounded-lg border border-border p-2 focus-ppp"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 inline-flex rounded-xl border border-border bg-secondary p-1">
          {(["pickup", "delivery"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus-ppp ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "pickup" ? t("Pickup", "Cueillette") : t("Delivery", "Livraison")}
            </button>
          ))}
        </div>

        <ul className="mt-5 space-y-3">
          {locations.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => {
                  setLocationId(l.id);
                  closeLocationSheet();
                }}
                className={`w-full rounded-2xl border p-4 text-left transition-colors focus-ppp ${
                  locationId === l.id
                    ? "border-primary bg-card"
                    : "border-border bg-card hover:border-primary/60"
                }`}
              >
                <p className="font-display text-xl uppercase">{l.name}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> {l.address}, {l.city} ({l.province})
                </p>
                {l.phone && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary" /> {l.phone}
                  </p>
                )}
                <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {l.hours ?? t("Hours not confirmed", "Heures non confirmées")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
