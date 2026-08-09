import { MapPin, Phone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePPP, useSelectedRestaurantLocation } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";
import { orderingChannels } from "@/config/external-presence";
import { canOrder, locationSocial } from "@/config/locations";
import { trackExternalOrder, trackSocialLink } from "@/lib/analytics";
import { pppSocials } from "@/components/home/follow-ppp";
import { GoogleGlyph } from "@/components/brand/social-icons";
import { PPPLogo } from "@/components/brand/ppp-logo";

const exploreLinks = [
  { en: "Menu", fr: "Menu", to: "/menu" as const },
  { en: "Offers", fr: "Offres", to: "/offers" as const },
  { en: "Rewards", fr: "Récompenses", to: "/account" as const },
  { en: "Gift Cards", fr: "Cartes-cadeaux", to: "/gift-cards" as const },
  { en: "Locations", fr: "Emplacements", to: "/locations" as const },
];

/** Not yet owned as routed pages — kept as plain links so the footer is honest about scope. */
const companyLinks = [
  { en: "About", fr: "À propos", href: "/about" },
  { en: "Franchise", fr: "Franchise", href: "/franchise" },
  { en: "Careers", fr: "Carrières", href: "/careers" },
  { en: "Contact", fr: "Contact", href: "/contact" },
];

const helpLinks = [
  { en: "FAQ", fr: "FAQ", href: "/faq" },
  { en: "Support", fr: "Assistance", href: "/support" },
];

export function PPPFooter() {
  const { lang, t, openOrderSheet } = usePPP();
  const location = useSelectedRestaurantLocation();
  const social = locationSocial(location);
  const orderable = canOrder(location);

  const locationChannels = [
    { id: "uber_eats", url: location.ordering.uberEats },
    { id: "doordash", url: location.ordering.doorDash },
    { id: "skip", url: location.ordering.skip },
  ].filter((c) => c.url) as { id: "uber_eats" | "doordash" | "skip"; url: string }[];
  const channelMeta = {
    uber_eats: orderingChannels.find((c) => c.id === "uber_eats"),
    doordash: orderingChannels.find((c) => c.id === "doordash"),
    skip: orderingChannels.find((c) => c.id === "skip"),
  } as const;

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[110rem] px-3 pt-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="text-[0.55rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {t("Selected location", "Emplacement sélectionné")}
            </p>
            <p className="mt-1 font-display text-2xl uppercase leading-none">
              {location.neighborhood}
            </p>
            <address className="mt-4 space-y-1 not-italic text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  {location.address}
                  <br />
                  {location.city}, {location.province} {location.postalCode ?? ""}
                </span>
              </p>
              {location.phone ? (
                <a
                  href={`tel:${location.phone.e164}`}
                  className="flex items-center gap-2 hover:text-foreground focus-ppp"
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  {location.phone.display}
                </a>
              ) : (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  {t("Phone not confirmed", "Téléphone non confirmé")}
                </p>
              )}
            </address>

            {orderable ? (
              <button
                onClick={openOrderSheet}
                className="mt-4 bg-primary px-6 py-3 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("Order now", "Commander")}
              </button>
            ) : (
              <Link
                to="/locations/$slug"
                params={{ slug: location.slug }}
                className="mt-4 inline-block border border-border px-6 py-3 font-display text-xl uppercase leading-none focus-ppp hover:border-primary"
              >
                {location.lifecycleStatus === "coming_soon"
                  ? t("Ordering coming soon", "Commande bientôt disponible")
                  : t("View location", "Voir l'emplacement")}
              </Link>
            )}

            <form
              className="mt-6 flex max-w-sm border border-border"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder={t("Get our offers", "Recevez nos offres")}
                aria-label={t("Email address", "Adresse courriel")}
                className="w-full bg-secondary px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="bg-primary px-5 text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp">
                {t("Subscribe", "S'abonner")}
              </button>
            </form>

            <ul className="mt-6 flex flex-wrap gap-2">
              {pppSocials
                .filter((s) => Object.values(social).includes(s.href))
                .map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackSocialLink(s.id)}
                      aria-label={`Visit PPP Pizzeria on ${s.name}`}
                      className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground transition-transform duration-200 hover:scale-[1.08] hover:text-foreground focus-ppp"
                    >
                      <s.Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                      {s.name}
                    </a>
                  </li>
                ))}
              {location.google.listingUrl && (
                <li>
                  <a
                    href={location.google.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackSocialLink("google")}
                    aria-label="View PPP Pizzeria on Google"
                    className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground transition-transform duration-200 hover:scale-[1.08] hover:text-foreground focus-ppp"
                  >
                    <GoogleGlyph className="h-3.5 w-3.5 text-primary" />
                    Google
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <h3 className="font-display text-sm uppercase tracking-widest text-accent">
                {t("Order", "Commander")}
              </h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    to="/order"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-ppp"
                  >
                    {t("PPP Direct", "PPP Direct")}
                  </Link>
                </li>
                {locationChannels.length > 0 ? (
                  locationChannels.map((c) => {
                    const meta = channelMeta[c.id];
                    return (
                      <li key={c.id}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackExternalOrder(c.id)}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-ppp"
                        >
                          {meta?.name ?? c.id}
                        </a>
                      </li>
                    );
                  })
                ) : (
                  <li className="text-sm text-muted-foreground">
                    {t("PPP Direct only", "PPP Direct seulement")}
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm uppercase tracking-widest text-accent">
                {t("Explore", "Explorer")}
              </h3>
              <ul className="mt-3 space-y-2">
                {exploreLinks.map((i) => (
                  <li key={i.en}>
                    <Link
                      to={i.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-ppp"
                    >
                      {lang === "fr" ? i.fr : i.en}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm uppercase tracking-widest text-accent">
                {t("Company", "Entreprise")}
              </h3>
              <ul className="mt-3 space-y-2">
                {companyLinks.map((i) => (
                  <li key={i.en}>
                    <a
                      href={i.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-ppp"
                    >
                      {lang === "fr" ? i.fr : i.en}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm uppercase tracking-widest text-accent">
                {t("Help", "Aide")}
              </h3>
              <ul className="mt-3 space-y-2">
                {helpLinks.map((i) => (
                  <li key={i.en}>
                    <a
                      href={i.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-ppp"
                    >
                      {lang === "fr" ? i.fr : i.en}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <PPPLogo variant="footer" />
          <span className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            {location.neighborhood} · Montréal
          </span>
        </div>
        <p className="mt-4 select-none font-display text-[18vw] uppercase leading-[0.75] text-foreground/8 lg:text-[13vw]">
          PPP Pizzeria
        </p>
        <p className="border-t border-border py-5 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
          © {new Date().getFullYear()} {pppBusiness.displayName}
        </p>
      </div>
    </footer>
  );
}
