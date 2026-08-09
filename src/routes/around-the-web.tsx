import { createFileRoute, Link } from "@tanstack/react-router";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { OrderSheet } from "@/components/layout/order-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { usePPP } from "@/context/ppp-store";
import { Reveal } from "@/components/motion/reveal";
import {
  legacyPresence,
  livePresence,
  type PresenceRecord,
} from "@/config/presence-directory";
import { AroundHero } from "@/components/presence/around-hero";
import { GoogleTrustCard } from "@/components/presence/google-trust-card";
import {
  HistoricalPlatformCard,
  PresenceIndexLink,
  StandardPlatformCard,
} from "@/components/presence/presence-cards";
import { getSummariesSync } from "@/lib/reputation/repositories";
import { NDG_LOCATION_ID, restaurantLocations } from "@/config/locations";
import { canonicalUrl } from "@/config/site";

const CANONICAL = canonicalUrl("/around-the-web");

export const Route = createFileRoute("/around-the-web")({
  head: () => ({
    meta: [
      { title: "Talking About PPP — Around the Web | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "Every place PPP Pizzeria shows up online: Google, review platforms, directories, social accounts, delivery marketplaces, and a history section for the original Montréal-Nord identity.",
      },
      { property: "og:title", content: "Talking About PPP — Around the Web" },
      {
        property: "og:description",
        content:
          "A single directory of PPP Pizzeria's real online presence, current and historic.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") },
            {
              "@type": "ListItem",
              position: 2,
              name: "Around the Web",
              item: CANONICAL,
            },
          ],
        }),
      },
    ],
  }),
  component: AroundTheWebPage,
});

const ndg = restaurantLocations.find((l) => l.id === NDG_LOCATION_ID)!;

/** A titled band of platform cards. Renders nothing when it has no records. */
function PresenceBand({
  eyebrow,
  title,
  intro,
  records,
  actionLabel,
  columns = "sm:grid-cols-2 xl:grid-cols-3",
}: {
  eyebrow: string;
  title: string;
  intro: string;
  records: PresenceRecord[];
  actionLabel: string;
  columns?: string;
}) {
  if (records.length === 0) return null;

  return (
    <Reveal as="section" className="mt-16 scroll-mt-24">
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-3xl uppercase leading-none sm:text-4xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{intro}</p>
      <div className={`mt-6 grid gap-3 ${columns}`}>
        {records.map((r) => (
          <StandardPlatformCard key={r.id} record={r} actionLabel={actionLabel} />
        ))}
      </div>
    </Reveal>
  );
}

function AroundTheWebPage() {
  const { t } = usePPP();

  const social = livePresence("social");
  const reviews = livePresence("review").filter((r) => r.iconKey !== "google");
  const directories = livePresence("directory");
  const ordering = livePresence("ordering");
  const legacy = legacyPresence().filter((r) => r.url);
  const everything = livePresence();

  // Google is featured on its own rather than sitting in a grid of links.
  const googleSummary = getSummariesSync().find((s) => s.provider === "google");

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        <AroundHero />

        {googleSummary && (
          <Reveal as="section" className="mt-16 scroll-mt-24">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("What people say", "Ce qu'on en dit")}
            </p>
            <h2 className="mt-1 font-display text-3xl uppercase leading-none sm:text-4xl">
              {t("Reviews, straight from the source", "Les avis, à la source")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t(
                "PPP doesn't republish customer reviews here. Read them where they were written, on the platforms customers trust.",
                "PPP ne republie pas les avis ici. Lisez-les là où ils ont été écrits, sur les plateformes de confiance.",
              )}
            </p>
            <div className="mt-6">
              <GoogleTrustCard summary={googleSummary} placeLabel={ndg.neighborhood} />
            </div>
            {(reviews.length > 0 || directories.length > 0) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[...reviews, ...directories].map((r) => (
                  <StandardPlatformCard
                    key={r.id}
                    record={r}
                    actionLabel={t("Open listing", "Voir la fiche")}
                  />
                ))}
              </div>
            )}
          </Reveal>
        )}

        <PresenceBand
          eyebrow={t("Follow the kitchen", "Suivez la cuisine")}
          title={t("PPP, day to day", "PPP, au quotidien")}
          intro={t(
            "New drops, specials and what's coming out of the fryer — posted by the PPP team on the accounts below.",
            "Nouveautés, spéciaux et ce qui sort de la friteuse — publiés par l'équipe PPP sur les comptes ci-dessous.",
          )}
          records={social}
          actionLabel={t("Follow", "Suivre")}
        />

        <PresenceBand
          eyebrow={t("Order your way", "Commandez à votre façon")}
          title={t("Where you can order PPP", "Où commander PPP")}
          intro={t(
            "Delivery marketplaces carry the PPP menu too. Prices and fees are set by each platform.",
            "Les plateformes de livraison proposent aussi le menu PPP. Les prix et frais sont fixés par chaque plateforme.",
          )}
          records={ordering}
          actionLabel={t("Order here", "Commander ici")}
        />

        {legacy.length > 0 && (
          <Reveal as="section" className="mt-16 border-t border-border pt-10">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">
              {t("Where it started", "Là où tout a commencé")}
            </p>
            <h2 className="mt-1 font-display text-3xl uppercase leading-none text-muted-foreground sm:text-4xl">
              {t("The Montréal-Nord chapter", "Le chapitre Montréal-Nord")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t(
                "PPP began on Rue Léger in Montréal-Nord. Those pages still exist online, so we point at them honestly — they belong to that first kitchen, not to the Somerled restaurant serving you today.",
                "PPP a commencé rue Léger, à Montréal-Nord. Ces pages existent toujours en ligne, alors nous les indiquons honnêtement — elles appartiennent à cette première cuisine, pas au restaurant de Somerled qui vous sert aujourd'hui.",
              )}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {legacy.map((r) => (
                <HistoricalPlatformCard
                  key={r.id}
                  record={r}
                  label={t("First location", "Premier emplacement")}
                  note={t("Montréal-Nord", "Montréal-Nord")}
                  actionLabel={t("View archived page", "Voir la page archivée")}
                />
              ))}
            </div>
          </Reveal>
        )}

        <Reveal as="section" className="mt-16">
          <h2 className="font-display text-2xl uppercase leading-none">
            {t("Every PPP link, in one place", "Tous les liens PPP, au même endroit")}
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {everything.map((r) => (
              <PresenceIndexLink key={r.id} record={r} />
            ))}
          </ul>
        </Reveal>

        <Reveal as="section" className="mt-16 border border-border bg-card p-6 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">
                {t("Skip the middle step", "Sautez l'intermédiaire")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {t(
                  "Ordering straight from PPP keeps the menu, the prices and the crew all in one place.",
                  "Commander directement chez PPP garde le menu, les prix et l'équipe au même endroit.",
                )}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[26rem]">
              <Link
                to="/order"
                className="press-tap inline-flex items-center justify-center bg-primary px-5 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("Start an order", "Commander")}
              </Link>
              <Link
                to="/locations"
                className="press-tap inline-flex items-center justify-center border border-border px-5 py-3.5 font-display text-lg uppercase leading-none focus-ppp"
              >
                {t("Find a PPP", "Trouver un PPP")}
              </Link>
            </div>
          </div>
        </Reveal>
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <OrderSheet />
      <SearchOverlay />
      <LocationSheet />
    </div>
  );
}
