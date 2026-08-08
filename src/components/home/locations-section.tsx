import { Clock, MapPin, Phone } from "lucide-react";
import storefront from "@/assets/storefront-night.jpg";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";

export function LocationsSection() {
  const { t, setLocationId, openOrderSheet } = usePPP();
  const locations = menuRepository.getLocations();

  return (
    <section id="locations" className="border-y border-border">
      <div className="mx-auto grid max-w-[110rem] gap-0 lg:grid-cols-2">
        <div className="relative min-h-[18rem] overflow-hidden">
          <img src={storefront} alt="" loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent" />
          <p className="absolute bottom-4 left-4 font-display text-5xl uppercase leading-none lg:text-7xl">
            {t("Find PPP", "Trouver PPP")}
          </p>
        </div>
        <div className="divide-y divide-border">
          {locations.map((l) => (
            <div key={l.id} className="p-5 lg:p-8">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <h3 className="min-w-0 font-display text-3xl uppercase leading-none lg:text-4xl">{l.name}</h3>
                <span className="shrink-0 border border-border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-accent">
                  {l.status === "open" ? t("Open", "Ouvert") : t("Coming soon", "Bientôt")}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                {l.address}, {l.city} ({l.province})
              </p>
              {l.phone && (
                <a
                  href={`tel:${l.phone.replace(/\s/g, "")}`}
                  className="mt-1 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-ppp"
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  {l.phone}
                </a>
              )}
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                {l.hours ?? t("Hours not confirmed", "Heures non confirmées")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setLocationId(l.id);
                    openOrderSheet();
                  }}
                  className="bg-primary px-5 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
                >
                  {t("Order from here", "Commander d'ici")}
                </button>
                <span className="border border-border px-4 py-3 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                  {l.services.join(" · ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}