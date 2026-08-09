import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { Reveal } from "@/components/motion/reveal";
import {
  comingSoonLocations,
  openLocations,
  pastLocations,
  restaurantLocations,
  type RestaurantLocation,
} from "@/config/locations";

const statusLabel: Record<RestaurantLocation["lifecycleStatus"], { en: string; fr: string }> = {
  open: { en: "Open", fr: "Ouvert" },
  coming_soon: { en: "Coming soon", fr: "Bientôt ouvert" },
  closed: { en: "Closed", fr: "Fermé" },
  temporarily_closed: { en: "Temporarily closed", fr: "Fermé temporairement" },
};

/**
 * Homepage band showing every store in the registry with an honest status
 * and the correct call to action for that status. Counts are derived from
 * the location config — never hardcoded.
 */
export function LocationStrip() {
  const { t, lang } = usePPP();

  return (
    <section id="locations-strip" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
        <Reveal>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("PPP is growing", "PPP est en croissance")}
          </p>
          <h2 className="mt-1 font-display text-4xl uppercase leading-[0.85] sm:text-6xl">
            {openLocations.length} {t("locations open", "emplacements ouverts")}
            <span className="block text-flame">
              {comingSoonLocations.length} {t("more on the way", "de plus en préparation")}
            </span>
          </h2>
        </Reveal>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {restaurantLocations.map((loc, i) => (
            <Reveal key={loc.id} delay={i * 60} as="li">
              <LocationCard loc={loc} />
            </Reveal>
          ))}
        </ul>

        <Reveal delay={restaurantLocations.length * 60} className="mt-8 flex flex-wrap gap-2">
          <Link
            to="/locations"
            className="cta-motion inline-flex items-center gap-2 bg-primary px-6 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            {t("All locations", "Tous les emplacements")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <a
            href="#franchise"
            className="inline-flex items-center gap-2 border border-border px-6 py-3.5 font-display text-lg uppercase leading-none focus-ppp hover:border-primary"
          >
            {t("Bring PPP to your city", "Amenez PPP dans votre ville")}
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function LocationCard({ loc }: { loc: RestaurantLocation }) {
  const { t, lang } = usePPP();
  const isOpen = loc.lifecycleStatus === "open";
  const isComingSoon = loc.lifecycleStatus === "coming_soon";
  const label = statusLabel[loc.lifecycleStatus];

  return (
    <div className="flex h-full flex-col border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg uppercase leading-tight">{loc.neighborhood}</p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              {loc.address}, {loc.city}
            </span>
          </p>
        </div>
        <span
          className={`shrink-0 border px-2 py-1 text-[0.55rem] font-bold uppercase tracking-widest ${
            isOpen
              ? "border-primary text-primary"
              : isComingSoon
                ? "border-accent text-accent"
                : "border-border text-muted-foreground"
          }`}
        >
          {lang === "fr" ? label.fr : label.en}
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        {isOpen ? (
          <>
            <Link
              to="/locations/$slug"
              params={{ slug: loc.slug }}
              className="flex-1 bg-primary px-3 py-2 text-center text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp"
            >
              {t("Order", "Commander")}
            </Link>
            {loc.google.directionsUrl && (
              <a
                href={loc.google.directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 border border-border px-3 py-2 text-center text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary"
              >
                {t("Directions", "Itinéraire")}
              </a>
            )}
          </>
        ) : isComingSoon ? (
          <Link
            to="/locations/$slug"
            params={{ slug: loc.slug }}
            className="flex-1 border border-border px-3 py-2 text-center text-xs font-bold uppercase tracking-widest focus-ppp hover:border-primary"
          >
            {t("Get updates", "Recevoir les nouvelles")}
          </Link>
        ) : (
          <Link
            to="/locations/$slug"
            params={{ slug: loc.slug }}
            className="flex-1 border border-border px-3 py-2 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground focus-ppp hover:border-primary"
          >
            {t("View story", "Voir l'histoire")}
          </Link>
        )}
      </div>
    </div>
  );
}
