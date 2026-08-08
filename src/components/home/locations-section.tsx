import { Clock, MapPin, Phone, Store } from "lucide-react";
import storefront from "@/assets/storefront-night.jpg";
import { locations } from "@/data/menu";
import { usePPP } from "@/context/ppp-store";

export function LocationsSection() {
  const { locationId, setLocationId, t } = usePPP();

  return (
    <section id="locations" className="border-t border-border bg-secondary/40 py-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="font-display text-4xl uppercase sm:text-5xl">{t("Locations", "Emplacements")}</h2>
          <div className="mt-6 space-y-4">
            {locations.map((l) => (
              <article
                key={l.id}
                className={`rounded-2xl border bg-card p-6 ${
                  locationId === l.id ? "border-primary" : "border-border"
                }`}
              >
                <h3 className="font-display text-2xl uppercase">{l.name}</h3>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" /> {l.address}, {l.city} ({l.province})
                </p>
                {l.phone && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary" /> {l.phone}
                  </p>
                )}
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />{" "}
                  {l.hours ?? t("Hours not confirmed", "Heures non confirmées")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {l.channels.map((c) => (
                    <span key={c.id} className="rounded-full border border-border px-3 py-1">
                      {c.label}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setLocationId(l.id)}
                  className="mt-5 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp"
                >
                  {locationId === l.id
                    ? t("Selected", "Sélectionné")
                    : t("Order from here", "Commander d'ici")}
                </button>
              </article>
            ))}
            <article className="flex items-start gap-4 rounded-2xl border border-dashed border-border p-6">
              <Store className="h-7 w-7 shrink-0 text-accent" />
              <div>
                <h3 className="font-display text-xl uppercase">
                  {t("More PPP coming", "D'autres PPP arrivent")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "We're expanding across Greater Montréal.",
                    "Nous nous étendons dans le Grand Montréal.",
                  )}
                </p>
              </div>
            </article>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <img
            src={storefront}
            alt={t("PPP storefront at night", "Devanture PPP le soir")}
            loading="lazy"
            className="h-full min-h-[22rem] w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}