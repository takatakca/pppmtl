import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, Navigation } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { Reveal, usePointerDepth } from "@/components/motion/reveal";
import { usePPP } from "@/context/ppp-store";
import storefront from "@/assets/storefront-night.jpg";
import crew from "@/assets/team-crew.jpg";
import foodPizza from "@/assets/food-pizza.jpg";
import foodChicken from "@/assets/food-chicken.jpg";
import foodPoutine from "@/assets/food-poutine.jpg";
import foodPita from "@/assets/food-pita.jpg";
import foodDessert from "@/assets/food-dessert.jpg";
import { canonicalUrl, SITE_URL } from "@/config/site";
import {
  canOrder,
  comingSoonLocations,
  openLocations,
  pastLocations,
  type RestaurantLocation,
} from "@/config/locations";
import { externalPresence } from "@/config/external-presence";

const TITLE_EN = "Our Story | PPP Pizzeria Montreal";
const TITLE_FR = "Notre histoire | PPP Pizzeria Montréal";
const DESC_EN =
  "PPP Pizzeria started as one kitchen in Montréal-Nord and now serves Montréal from NDG and Sainte-Catherine E, with more neighbourhoods on the way.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE_EN },
      { name: "description", content: DESC_EN },
      { property: "og:title", content: TITLE_EN },
      { property: "og:description", content: DESC_EN },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/about") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/about") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              "@id": canonicalUrl("/about"),
              url: canonicalUrl("/about"),
              name: TITLE_EN,
              description: DESC_EN,
              about: { "@type": "Organization", name: "PPP Pizzeria", url: SITE_URL },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") },
                { "@type": "ListItem", position: 2, name: "Our Story", item: canonicalUrl("/about") },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: AboutPage,
});

/* ------------------------------- helpers -------------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">{children}</p>
  );
}

function Rule() {
  return <span aria-hidden className="block h-px w-full bg-border" />;
}

/* --------------------------------- page --------------------------------- */

function AboutPage() {
  const { t } = usePPP();
  const { containerRef, layer } = usePointerDepth(5);

  const openCount = openLocations.length;
  const soonCount = comingSoonLocations.length;
  const pastCount = pastLocations.length;
  const origin = pastLocations.find((l) => l.slug === "montreal-nord") ?? pastLocations[0];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        {/* 01 — HERO */}
        <section
          ref={containerRef}
          className="relative isolate overflow-hidden border-b border-border"
        >
          <div className="mx-auto grid max-w-[80rem] items-center gap-8 px-3 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
            <div>
              <Reveal>
                <Eyebrow>{t("PPP Pizzeria — our story", "PPP Pizzeria — notre histoire")}</Eyebrow>
              </Reveal>
              <Reveal delay={90} clip>
                <h1 className="mt-3 font-display text-[2.6rem] uppercase leading-[0.86] sm:text-7xl lg:text-8xl">
                  {t("Built in Montréal.", "Né à Montréal.")}
                  <br />
                  <span className="text-flame">{t("Still moving.", "Toujours en mouvement.")}</span>
                </h1>
              </Reveal>
              <Reveal delay={180}>
                <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
                  {t(
                    "One kitchen started it. PPP kept growing — pizza, chicken, poutine and subs made for the neighbourhood, now cooked in more than one part of the city.",
                    "Une seule cuisine a tout lancé. PPP a continué de grandir — pizza, poulet, poutine et sous-marins faits pour le quartier, maintenant cuisinés dans plus d'un coin de la ville.",
                  )}
                </p>
              </Reveal>

              {/* 09 — location strip, derived from config */}
              <Reveal delay={280}>
                <dl className="mt-6 flex flex-wrap items-stretch gap-x-6 gap-y-3 border-t border-border pt-4">
                  {[
                    { n: openCount, l: t("Open now", "Ouverts") },
                    { n: soonCount, l: t("Coming soon", "Bientôt") },
                    { n: pastCount, l: t("In our history", "Dans notre histoire") },
                  ].map((s) => (
                    <div key={s.l} className="min-w-[5.5rem]">
                      <dt className="sr-only">{s.l}</dt>
                      <dd className="font-display text-3xl leading-none sm:text-4xl">{s.n}</dd>
                      <p className="mt-1 text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">
                        {s.l}
                      </p>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            <Reveal delay={140} clip className="relative">
              <div className="relative aspect-[4/3] overflow-hidden border border-border sm:aspect-[5/4]">
                <img
                  src={storefront}
                  alt={t(
                    "A PPP Pizzeria storefront lit up at night in Montréal",
                    "Une devanture PPP Pizzeria éclairée le soir à Montréal",
                  )}
                  loading="eager"
                  className="h-full w-full object-cover"
                  style={layer(1)}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 bg-background/85 px-2 py-1 font-display text-[0.55rem] uppercase tracking-[0.3em]">
                  {t("Montréal", "Montréal")}
                </span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 02 — WHERE PPP STARTED */}
        {origin && (
          <section className="mx-auto grid max-w-[80rem] gap-6 px-3 py-12 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-12 lg:py-16">
            <Reveal clip className="relative overflow-hidden">
              <img
                src={crew}
                alt=""
                loading="lazy"
                className="ken-burns h-56 w-full object-cover sm:h-96"
              />
              <span className="absolute left-0 top-0 bg-background px-2 py-1 font-display text-[0.55rem] uppercase tracking-[0.3em] text-muted-foreground">
                {t("Former location — closed", "Ancien emplacement — fermé")}
              </span>
            </Reveal>
            <Reveal delay={90}>
              <Eyebrow>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {t("Where PPP started", "Là où PPP a commencé")}
                </span>
              </Eyebrow>
              <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
                {origin.neighborhood}
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                {t(
                  "PPP started in Montréal-Nord as a neighbourhood food operation built around what people actually order — pizza, chicken, poutine, subs and late-night comfort food. That original address is closed today, but it's still where the name and the menu come from.",
                  "PPP a commencé à Montréal-Nord comme un commerce de quartier bâti autour de ce que les gens commandent vraiment — pizza, poulet, poutine, sous-marins et bouffe réconfort de fin de soirée. Cette adresse d'origine est fermée aujourd'hui, mais c'est de là que viennent le nom et le menu.",
                )}
              </p>
              <Link
                to="/locations/$slug"
                params={{ slug: origin.slug }}
                className="cta-motion mt-5 inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-sm uppercase tracking-widest transition-colors hover:border-primary focus-ppp"
              >
                {t("View the Montréal-Nord story", "Voir l'histoire de Montréal-Nord")}
                <ArrowUpRight className="cta-arrow h-4 w-4" />
              </Link>
            </Reveal>
          </section>
        )}

        {/* 03 — PPP TODAY */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
            <Reveal>
              <Eyebrow>{t("PPP today", "PPP aujourd'hui")}</Eyebrow>
              <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
                {openCount === 2
                  ? t("Two kitchens. One PPP.", "Deux cuisines. Un seul PPP.")
                  : t("PPP is growing across Montréal.", "PPP grandit à travers Montréal.")}
              </h2>
            </Reveal>
            <div className="mt-8 flex flex-col gap-px bg-border">
              {openLocations.map((loc, i) => (
                <OpenLocationRow key={loc.id} loc={loc} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* 04 — THE FOOD */}
        <section className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
            <Reveal>
              <Eyebrow>{t("The food", "La bouffe")}</Eyebrow>
              <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
                {t("This is PPP.", "Ça, c'est PPP.")}
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                {t(
                  "Pizza, chicken, poutine, subs, pita and wraps, Mexican plates and desserts — the kind of menu Montréal reaches for when the craving hits, in one order.",
                  "Pizza, poulet, poutine, sous-marins, pitas et wraps, plats mexicains et desserts — le genre de menu que Montréal choisit quand l'envie frappe, en une seule commande.",
                )}
              </p>
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                {[
                  t("Pizza", "Pizza"),
                  t("Chicken", "Poulet"),
                  t("Poutine", "Poutine"),
                  t("Subs", "Sous-marins"),
                  t("Pita / Wrap", "Pita / Wrap"),
                  t("Mexican", "Mexicain"),
                  t("Desserts", "Desserts"),
                ].map((c) => (
                  <li
                    key={c}
                    className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/menu"
                  className="cta-motion inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-base uppercase leading-none text-primary-foreground focus-ppp"
                >
                  {t("Explore the menu", "Explorer le menu")}
                  <ArrowUpRight className="cta-arrow h-4 w-4" />
                </Link>
                <Link
                  to="/order"
                  className="cta-motion inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-base uppercase leading-none transition-colors hover:border-primary focus-ppp"
                >
                  {t("Start order", "Commander")}
                </Link>
              </div>
            </Reveal>

            {/* overlapping editorial food composition */}
            <Reveal delay={120} className="relative min-w-0">
              <div className="no-scrollbar -mx-3 flex max-w-[100vw] gap-3 overflow-x-auto px-3 lg:mx-0 lg:block lg:w-full lg:px-0">
                <figure className="food-pop relative w-[70vw] shrink-0 overflow-hidden border border-border sm:w-80 lg:w-[78%]">
                  <img
                    src={foodPizza}
                    alt=""
                    loading="lazy"
                    className="h-52 w-full object-cover sm:h-64 lg:h-80"
                  />
                </figure>
                <figure className="food-pop relative w-[45vw] shrink-0 overflow-hidden border border-border bg-background sm:w-52 lg:absolute lg:-bottom-8 lg:right-0 lg:w-[42%]">
                  <img
                    src={foodChicken}
                    alt=""
                    loading="lazy"
                    className="h-40 w-full object-cover lg:h-48"
                  />
                </figure>
                <figure className="food-pop relative w-[38vw] shrink-0 overflow-hidden border border-border bg-background sm:w-44 lg:absolute lg:-left-6 lg:bottom-4 lg:w-[30%]">
                  <img
                    src={foodPoutine}
                    alt=""
                    loading="lazy"
                    className="h-32 w-full object-cover lg:h-40"
                  />
                </figure>
                <figure className="food-pop w-[38vw] shrink-0 overflow-hidden border border-border sm:w-44 lg:hidden">
                  <img src={foodPita} alt="" loading="lazy" className="h-32 w-full object-cover" />
                </figure>
                <figure className="food-pop w-[38vw] shrink-0 overflow-hidden border border-border sm:w-44 lg:hidden">
                  <img
                    src={foodDessert}
                    alt=""
                    loading="lazy"
                    className="h-32 w-full object-cover"
                  />
                </figure>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 05 — THE ROAD AHEAD */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
            <Reveal className="max-w-2xl">
              <Eyebrow>{t("The road ahead", "La suite")}</Eyebrow>
              <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
                {t("PPP isn't staying in one neighbourhood", "PPP ne reste pas dans un seul quartier")}
              </h2>
            </Reveal>

            <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-6">
              <TimelineGroup
                label={t("Past", "Passé")}
                tone="past"
                items={pastLocations}
                note={t("Origin — closed", "Origine — fermé")}
              />
              <TimelineGroup
                label={t("Now", "Maintenant")}
                tone="now"
                items={openLocations}
                note={t("Open location", "Emplacement ouvert")}
              />
              <TimelineGroup
                label={t("Next", "Prochain")}
                tone="next"
                items={comingSoonLocations}
                note={t("Coming soon", "Bientôt")}
              />
            </div>

            <Reveal delay={120}>
              <Link
                to="/locations"
                className="cta-motion mt-8 inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-sm uppercase tracking-widest transition-colors hover:border-primary focus-ppp"
              >
                {t("See all locations", "Voir tous les emplacements")}
                <ArrowUpRight className="cta-arrow h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* community — compact */}
        <section className="mx-auto max-w-[80rem] px-3 py-10 sm:px-6 lg:py-14">
          <Reveal className="max-w-2xl">
            <Eyebrow>{t("Our neighbourhood", "Notre quartier")}</Eyebrow>
            <p className="mt-3 font-display text-2xl uppercase leading-[1.05] sm:text-3xl">
              {t(
                "PPP started as a neighbourhood restaurant, and that local identity still shapes the brand as it grows.",
                "PPP a commencé comme un restaurant de quartier, et cette identité locale façonne encore la marque en grandissant.",
              )}
            </p>
          </Reveal>
        </section>

        {/* 06 — AROUND THE WEB */}
        <section className="border-y border-border">
          <div className="mx-auto max-w-[80rem] px-3 py-10 sm:px-6 lg:py-12">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Eyebrow>{t("Find PPP around the web", "Trouvez PPP sur le web")}</Eyebrow>
                <h2 className="mt-2 font-display text-3xl uppercase leading-[0.9] sm:text-4xl">
                  {t("Where PPP already lives", "Où PPP est déjà présent")}
                </h2>
              </div>
              <Link
                to="/around-the-web"
                className="cta-motion inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-xs uppercase tracking-widest transition-colors hover:border-primary focus-ppp"
              >
                {t("See PPP around the web", "Voir PPP sur le web")}
                <ArrowUpRight className="cta-arrow h-3.5 w-3.5" />
              </Link>
            </Reveal>
            <Reveal delay={90} className="mt-6">
              <Rule />
              <ul className="flex flex-wrap gap-x-8 gap-y-3 pt-4">
                {[
                  { name: "Google", href: externalPresence.discovery.google },
                  { name: "Instagram", href: externalPresence.social.instagram },
                  { name: "Facebook", href: externalPresence.social.facebook },
                  { name: "Uber Eats", href: externalPresence.ordering.uberEats },
                  { name: "DoorDash", href: externalPresence.ordering.doorDash },
                  { name: "Birdeye", href: externalPresence.discovery.birdeye },
                ]
                  .filter((p) => Boolean(p.href))
                  .map((p) => (
                    <li key={p.name}>
                      <a
                        href={p.href as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground focus-ppp"
                      >
                        {p.name}
                      </a>
                    </li>
                  ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* 07 — FRANCHISE + CAREERS campaign panels */}
        <section className="mx-auto grid max-w-[80rem] gap-3 px-3 py-10 sm:grid-cols-2 sm:px-6 lg:py-14">
          <CampaignPanel
            eyebrow={t("Franchise", "Franchise")}
            title={t("Bring PPP to your city", "Amenez PPP dans votre ville")}
            cta={t("Explore franchising", "Explorer la franchise")}
            to="/franchise"
            image={storefront}
          />
          <CampaignPanel
            eyebrow={t("Careers", "Carrières")}
            title={t("Build the next PPP with us", "Bâtissez le prochain PPP avec nous")}
            cta={t("See open roles", "Voir les postes")}
            to="/careers"
            image={crew}
            delay={90}
          />
        </section>

        {/* 33 — final action bar */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto flex max-w-[80rem] flex-wrap items-center justify-between gap-4 px-3 py-8 sm:px-6">
            <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">
              {t("Craving PPP?", "Une envie de PPP ?")}
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/menu"
                className="cta-motion inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-base uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("View menu", "Voir le menu")}
              </Link>
              <Link
                to="/locations"
                className="cta-motion inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-base uppercase leading-none transition-colors hover:border-primary focus-ppp"
              >
                {t("Find a location", "Trouver un emplacement")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}

/* ----------------------------- sub-components ---------------------------- */

function OpenLocationRow({ loc, index }: { loc: RestaurantLocation; index: number }) {
  const { t } = usePPP();
  const image = index % 2 === 0 ? foodPizza : foodChicken;
  return (
    <Reveal
      delay={index * 90}
      className="grid gap-0 bg-background sm:grid-cols-[minmax(0,14rem)_1fr] lg:grid-cols-[minmax(0,20rem)_1fr]"
    >
      <div className="relative h-36 overflow-hidden sm:h-full sm:min-h-[11rem]">
        <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute left-0 top-0 bg-primary px-2 py-1 font-display text-[0.55rem] uppercase tracking-[0.3em] text-primary-foreground">
          {t("Open location", "Emplacement ouvert")}
        </span>
      </div>
      <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
        <div>
          <h3 className="font-display text-3xl uppercase leading-none sm:text-4xl">
            {loc.neighborhood}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {loc.address}
            {loc.postalCode ? `, ${loc.city} ${loc.postalCode}` : `, ${loc.city}`}
          </p>
          {loc.menuScope === "verified" && (
            <p className="mt-2 inline-block border border-border px-2 py-1 font-display text-[0.55rem] uppercase tracking-[0.3em] text-muted-foreground">
              {t("Full menu available", "Menu complet disponible")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/locations/$slug"
            params={{ slug: loc.slug }}
            className="cta-motion inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-xs uppercase tracking-widest transition-colors hover:border-primary focus-ppp"
          >
            {t("View location", "Voir l'emplacement")}
            <ArrowUpRight className="cta-arrow h-3.5 w-3.5" />
          </Link>
          {loc.google.directionsUrl && (
            <a
              href={loc.google.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-xs uppercase tracking-widest transition-colors hover:border-primary focus-ppp"
            >
              <Navigation className="h-3.5 w-3.5" />
              {t("Directions", "Itinéraire")}
            </a>
          )}
          {canOrder(loc) && loc.menuScope === "verified" && (
            <Link
              to="/order"
              className="cta-motion inline-flex items-center gap-2 bg-primary px-4 py-2.5 font-display text-xs uppercase tracking-widest text-primary-foreground focus-ppp"
            >
              {t("Order", "Commander")}
            </Link>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function TimelineGroup({
  label,
  tone,
  items,
  note,
}: {
  label: string;
  tone: "past" | "now" | "next";
  items: RestaurantLocation[];
  note: string;
}) {
  const dot =
    tone === "now"
      ? "bg-primary"
      : tone === "past"
        ? "bg-muted-foreground/50"
        : "border border-border bg-transparent";
  if (items.length === 0) return null;
  return (
    <Reveal className="relative">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden />
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground">
          {label}
        </p>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <ul className="mt-4 space-y-4 border-l border-border pl-4">
        {items.map((l) => (
          <li key={l.id}>
            <Link
              to="/locations/$slug"
              params={{ slug: l.slug }}
              className="group block focus-ppp"
            >
              <span className="font-display text-xl uppercase leading-none transition-colors group-hover:text-flame sm:text-2xl">
                {l.neighborhood}
              </span>
              <span className="mt-1 block text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">
                {note}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function CampaignPanel({
  eyebrow,
  title,
  cta,
  to,
  image,
  delay = 0,
}: {
  eyebrow: string;
  title: string;
  cta: string;
  to: "/franchise" | "/careers";
  image: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <Link
        to={to}
        className="campaign-panel group relative flex min-h-[15rem] flex-col justify-end overflow-hidden border border-border p-6 transition-colors hover:border-primary focus-ppp"
      >
        <img
          src={image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-30 transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40"
        />
        <span aria-hidden className="campaign-edge absolute inset-y-0 left-0 w-1 bg-primary" />
        <span className="relative">
          <span className="block font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {eyebrow}
          </span>
          <span className="mt-1 block font-display text-2xl uppercase leading-none sm:text-3xl">
            {title}
          </span>
          <span className="mt-4 inline-flex items-center gap-2 font-display text-sm uppercase tracking-widest">
            {cta}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </span>
      </Link>
    </Reveal>
  );
}
