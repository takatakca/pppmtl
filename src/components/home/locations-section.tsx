import {
  Clock,
  ExternalLink,
  MapPin,
  Music4,
  Phone,
  ShoppingBag,
  Star,
  Tv,
  Wifi,
} from "lucide-react";
import storefront from "@/assets/storefront-night.jpg";
import { usePPP, useSelectedRestaurantLocation } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";
import { externalPresence } from "@/config/external-presence";
import { canOrder } from "@/config/locations";
import { Reveal } from "@/components/motion/reveal";

const serviceIcons: Record<string, typeof Wifi> = {
  pickup: ShoppingBag,
  delivery: MapPin,
  "live-music": Music4,
  sports: Tv,
  wifi: Wifi,
};

/**
 * Selected-store experience for the canonical NDG restaurant. Every value is
 * read from the single business record — nothing is duplicated here.
 */
export function LocationsSection() {
  const { t, lang, openOrderSheet } = usePPP();
  const store = useSelectedRestaurantLocation();
  const { serviceOptions } = pppBusiness;
  const orderable = canOrder(store);
  const google = store.google;
  const googleProfile = {
    rating: store.google.rating,
    reviewCount: store.google.reviewCount,
    lastSyncedAt: store.google.lastSyncedAt,
    priceRange: store.id === "loc-ndg-somerled" ? pppBusiness.googleProfile.priceRange : null,
  };

  return (
    <section id="locations" className="relative border-y border-border">
      <div className="mx-auto grid max-w-[110rem] gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Store visual + map */}
        <Reveal className="relative">
          <div className="relative h-56 overflow-hidden lg:h-[22rem]">
            <img
              src={storefront}
              alt={t(
                "PPP Pizzeria on Avenue Somerled in Notre-Dame-de-Grâce at night",
                "PPP Pizzeria sur l'avenue Somerled à Notre-Dame-de-Grâce, le soir",
              )}
              loading="lazy"
              className="ken-burns h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/25 to-transparent" />
            <p className="absolute bottom-3 left-4 font-display text-4xl uppercase leading-[0.85] lg:text-6xl">
              {t("Your PPP", "Votre PPP")}
              <span className="block text-flame">{store.neighborhood}</span>
            </p>
          </div>
          {google.embedUrl && (
            <div className="relative hidden border-t border-border lg:block">
              <iframe
                title={t("Map to PPP NDG", "Carte vers PPP NDG")}
                src={google.embedUrl!}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[16rem] w-full grayscale-[0.35] contrast-[1.1]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-border"
              />
            </div>
          )}
        </Reveal>

        {/* Store record */}
        <Reveal delay={110} className="p-5 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-3xl uppercase leading-none lg:text-5xl">
                {t("PPP Pizzeria", "PPP Pizzeria")}
              </h2>
              <p className="mt-1 font-display text-lg uppercase tracking-[0.2em] text-accent">
                {store.neighborhood}
              </p>
            </div>
            {googleProfile.rating != null && (
              <a
                href={store.google.reviewsUrl ?? externalPresence.discovery.google}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 border border-border px-3 py-2 text-right focus-ppp hover:border-primary"
              >
                <span className="block text-[0.55rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  Google
                </span>
                <span className="mt-0.5 flex items-center gap-1 font-display text-2xl leading-none">
                  {googleProfile.rating?.toFixed(1)}
                  <Star className="h-4 w-4 fill-accent text-accent" />
                </span>
                <span className="block text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                  {googleProfile.reviewCount} {t("Google reviews", "avis Google")}
                </span>
                <span className="block text-[0.5rem] uppercase tracking-widest text-muted-foreground/60">
                  {t("synced", "màj")} {googleProfile.lastSyncedAt}
                </span>
              </a>
            )}
          </div>

          <address className="mt-5 not-italic">
            <p className="flex items-start gap-2 text-base">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <span>
                {store.address}
                <br />
                {store.city}, {store.province} {store.postalCode ?? ""}
              </span>
            </p>
            {store.phone ? (
              <a
                href={`tel:${store.phone.e164}`}
                className="mt-2 flex items-center gap-2 text-base hover:text-accent focus-ppp"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                {store.phone.display}
              </a>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                {t("Phone line not published yet", "Ligne téléphonique pas encore publiée")}
              </p>
            )}
          </address>

          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0 text-primary" />
            {store.statusNote
              ? t(`Google listing: ${store.statusNote}`, "Fiche Google : fermé · ouvre à 16 h")
              : t("Hours available in the ordering experience", "Heures affichées à la commande")}
          </p>
          {googleProfile.priceRange && (
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              {t("Typically", "Environ")} {googleProfile.priceRange}{" "}
              {t("per person", "par personne")} · {t("Google", "Google")}
            </p>
          )}

          <ul className="mt-5 flex flex-wrap gap-2">
            {serviceOptions.map((s) => {
              const Icon = serviceIcons[s.id] ?? Wifi;
              return (
                <li
                  key={s.id}
                  className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {lang === "fr" ? s.fr : s.en}
                </li>
              );
            })}
          </ul>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {orderable ? (
              <button
                onClick={openOrderSheet}
                className="cta-motion bg-primary px-5 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {t("Order", "Commander")}
              </button>
            ) : (
              <p className="flex items-center justify-center border border-dashed border-border px-5 py-3.5 text-center text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                {store.lifecycleStatus === "coming_soon"
                  ? t("Opening soon", "Ouverture bientôt")
                  : t("This location is closed", "Cet emplacement est fermé")}
              </p>
            )}
            <a
              href={google.directionsUrl ?? "/locations"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 border border-border px-5 py-3.5 font-display text-lg uppercase leading-none focus-ppp hover:border-primary"
            >
              {t("Directions", "Itinéraire")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {store.phone && (
              <a
                href={`tel:${store.phone.e164}`}
                className="flex items-center justify-center gap-2 border border-border px-5 py-3.5 font-display text-lg uppercase leading-none focus-ppp hover:border-primary"
              >
                <Phone className="h-4 w-4 text-primary" />
                {t("Call", "Appeler")}
              </a>
            )}
          </div>

          {/* Mobile map lives behind a disclosure so it never eats the viewport */}
          {google.embedUrl && (
            <details className="mt-4 border border-border lg:hidden">
              <summary className="cursor-pointer list-none px-4 py-3 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-muted-foreground focus-ppp">
                {t("Show map", "Voir la carte")}
              </summary>
              <iframe
                title={t("Map to PPP NDG", "Carte vers PPP NDG")}
                src={google.embedUrl!}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-56 w-full border-t border-border grayscale-[0.35]"
              />
            </details>
          )}
        </Reveal>
      </div>
    </section>
  );
}
