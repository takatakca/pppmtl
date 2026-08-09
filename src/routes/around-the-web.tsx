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

const iconFor: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: TikTokIcon,
  x: XIcon,
  google: GoogleGlyph,
  yelp: Star,
  tripadvisor: Store,
  birdeye: Star,
  "resto-en-ligne": Store,
  trustindex: Star,
  "too-good-to-go": Store,
  "order-online": Store,
  setmore: Store,
  linktree: Store,
  "uber-eats": Store,
  doordash: Store,
  skip: Store,
};

function PresenceRow({ record }: { record: PresenceRecord }) {
  const { lang } = usePPP();
  const Icon = iconFor[record.iconKey] ?? MapPin;
  const blurb = lang === "fr" ? record.blurbFr : record.blurbEn;

  return (
    <li>
      <a
        href={record.url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackSocialLink(record.iconKey)}
        aria-disabled={!record.url}
        className={`flex items-start gap-3 border border-border bg-card p-4 transition-colors hover:border-primary focus-ppp ${
          !record.url ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-display text-lg uppercase leading-none">
            {record.name}
            {record.status === "legacy" && (
              <span className="ml-1 border border-border px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-muted-foreground">
                {lang === "fr" ? "Historique" : "Legacy"}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
        </div>
        {record.url && <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
      </a>
    </li>
  );
}

function Group({
  titleEn,
  titleFr,
  category,
}: {
  titleEn: string;
  titleFr: string;
  category: PresenceCategory;
}) {
  const { t } = usePPP();
  const records = presenceByCategory(category);
  if (records.length === 0) return null;

  return (
    <Reveal as="section" className="mt-10">
      <h2 className="font-display text-2xl uppercase leading-none">{t(titleEn, titleFr)}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {records.map((r) => (
          <PresenceRow key={r.id} record={r} />
        ))}
      </ul>
    </Reveal>
  );
}

function AroundTheWebPage() {
  const { t } = usePPP();
  const legacy = legacyPresence();

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {t("Talking about PPP", "On parle de PPP")}
        </p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
          {t("Around the", "Aux quatre coins")} <span className="text-flame">{t("web", "du web")}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {t(
            "Every real place PPP Pizzeria shows up online, grouped honestly — Google, review platforms, directories, social accounts and delivery marketplaces, plus a separate section for the original Montréal-Nord identity.",
            "Tous les endroits réels où PPP Pizzeria apparaît en ligne, regroupés honnêtement — Google, plateformes d'avis, répertoires, comptes sociaux et places de marché de livraison, ainsi qu'une section séparée pour l'identité d'origine de Montréal-Nord.",
          )}
        </p>

        <Group titleEn="Google" titleFr="Google" category="review" />
        <Group titleEn="Social" titleFr="Réseaux sociaux" category="social" />
        <Group titleEn="Directories" titleFr="Répertoires" category="directory" />
        <Group titleEn="Order online" titleFr="Commander en ligne" category="ordering" />

        {legacy.length > 0 && (
          <Reveal as="section" className="mt-14 border-t border-border pt-8">
            <h2 className="font-display text-2xl uppercase leading-none text-muted-foreground">
              {t("Montréal-Nord history", "Historique Montréal-Nord")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t(
                "PPP started in Montréal-Nord on Rue Léger. These records belong to that original identity — they are kept for transparency and are never the current NDG listing.",
                "PPP a débuté à Montréal-Nord, rue Léger. Ces fiches appartiennent à cette identité d'origine — conservées par transparence, elles ne sont jamais la fiche NDG actuelle.",
              )}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {legacy.map((r) => (
                <PresenceRow key={r.id} record={r} />
              ))}
            </ul>
          </Reveal>
        )}
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <OrderSheet />
      <SearchOverlay />
      <LocationSheet />
    </div>
  );
}
