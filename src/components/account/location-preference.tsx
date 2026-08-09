import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { openLocations } from "@/config/locations";

/**
 * Favourite-store picker for authenticated customers. Never locks the
 * customer to one store — switching is always available.
 */
export function LocationPreference({ className = "" }: { className?: string }) {
  const { t } = usePPP();
  const [preferredId, setPreferredId] = useState<string | null>(openLocations[0]?.id ?? null);

  return (
    <section className={`border border-border bg-card p-5 ${className}`}>
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {t("Order faster", "Commandez plus vite")}
      </p>
      <h2 className="mt-1 font-display text-3xl uppercase leading-none">
        {t("Favourite location", "Emplacement favori")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "Pick the PPP kitchen you order from most. You can switch any time.",
          "Choisissez la cuisine PPP où vous commandez le plus souvent. Vous pouvez changer en tout temps.",
        )}
      </p>
      <ul className="mt-3 grid gap-1.5">
        {openLocations.map((loc) => {
          const active = loc.id === preferredId;
          return (
            <li key={loc.id}>
              <button
                type="button"
                onClick={() => setPreferredId(loc.id)}
                aria-pressed={active}
                className={`press-tap flex w-full items-center justify-between gap-3 border px-4 py-3 text-left focus-ppp ${
                  active ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="block text-sm font-bold uppercase tracking-wide">
                      {loc.neighborhood}
                    </span>
                    <span className="block text-[0.75rem] text-muted-foreground">
                      {loc.address}
                    </span>
                  </span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
