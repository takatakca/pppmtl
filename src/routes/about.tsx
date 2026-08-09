import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { Reveal } from "@/components/motion/reveal";
import { usePPP } from "@/context/ppp-store";
import storefront from "@/assets/storefront-night.jpg";
import crew from "@/assets/team-crew.jpg";
import foodPizza from "@/assets/food-pizza.jpg";
import foodChicken from "@/assets/food-chicken.jpg";
import foodPoutine from "@/assets/food-poutine.jpg";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "From a single kitchen in Montréal-Nord to NDG and Sainte-Catherine E — the honest story behind PPP Pizzeria Montréal.",
      },
      { property: "og:title", content: "Our Story | PPP Pizzeria Montréal" },
      {
        property: "og:description",
        content: "How PPP grew from Montréal-Nord into a multi-location Montréal brand.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: canonicalUrl("/about") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/about") }],
  }),
  component: AboutPage,
});

type StoneStatus = "past" | "present" | "next";
const dotClass: Record<StoneStatus, string> = {
  past: "bg-muted-foreground/50",
  present: "bg-primary",
  next: "border border-border bg-transparent",
};

function AboutPage() {
  const { t } = usePPP();

  const timeline: { status: StoneStatus; place: { en: string; fr: string }; note: { en: string; fr: string } }[] = [
    {
      status: "past",
      place: { en: "Montréal-Nord", fr: "Montréal-Nord" },
      note: { en: "Origin — closed today", fr: "Origine — fermé aujourd'hui" },
    },
    {
      status: "present",
      place: { en: "NDG", fr: "NDG" },
      note: { en: "Flagship kitchen", fr: "Cuisine phare" },
    },
    {
      status: "present",
      place: { en: "Sainte-Catherine E", fr: "Sainte-Catherine E" },
      note: { en: "Second kitchen", fr: "Deuxième cuisine" },
    },
    {
      status: "next",
      place: { en: "Saint-Léonard", fr: "Saint-Léonard" },
      note: { en: "Coming soon", fr: "Bientôt" },
    },
    {
      status: "next",
      place: { en: "Chambly", fr: "Chambly" },
      note: { en: "Coming soon", fr: "Bientôt" },
    },
    {
      status: "next",
      place: { en: "Brossard", fr: "Brossard" },
      note: { en: "Coming soon", fr: "Bientôt" },
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-border">
          <img
            src={storefront}
            alt=""
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/60" />
          <Reveal className="relative mx-auto max-w-[70rem] px-3 py-14 sm:px-6 sm:py-20">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("PPP Pizzeria", "PPP Pizzeria")}
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] sm:text-8xl">
              {t("Our story", "Notre histoire")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              {t(
                "Chicken, pizza and poutine, cooked the same honest way since day one — just from more kitchens than before.",
                "Poulet, pizza et poutine, cuisinés de la même façon honnête depuis le premier jour — simplement dans plus de cuisines qu'avant.",
              )}
            </p>
          </Reveal>
        </section>

        {/* Where it started */}
        <section className="mx-auto grid max-w-[80rem] gap-6 px-3 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-16">
          <Reveal clip className="overflow-hidden border border-border">
            <img
              src={crew}
              alt=""
              loading="lazy"
              className="ken-burns h-64 w-full object-cover sm:h-96"
            />
          </Reveal>
          <Reveal delay={90}>
            <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              <MapPin className="h-3.5 w-3.5" />
              {t("Where it started", "Là où tout a commencé")}
            </p>
            <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
              {t("Montréal-Nord", "Montréal-Nord")}
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
              {t(
                "PPP began as one neighbourhood kitchen in Montréal-Nord, built on rotisserie chicken, hand-stretched pizza and poutine done properly. That original store is closed today — but it's where the recipes, the name and the habit of doing things right all came from.",
                "PPP a commencé comme une seule cuisine de quartier à Montréal-Nord, bâtie sur le poulet rôti, la pizza étirée à la main et la poutine bien faite. Ce premier commerce est fermé aujourd'hui — mais c'est de là que viennent les recettes, le nom et l'habitude de bien faire les choses.",
              )}
            </p>
          </Reveal>
        </section>

        {/* Where we are now */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
            <Reveal>
              <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                {t("Where we are now", "Où nous sommes maintenant")}
              </p>
              <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
                {t("Two kitchens, one menu", "Deux cuisines, un seul menu")}
              </h2>
            </Reveal>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                {
                  name: { en: "NDG", fr: "NDG" },
                  desc: {
                    en: "Notre-Dame-de-Grâce — the flagship kitchen the whole menu is built around.",
                    fr: "Notre-Dame-de-Grâce — la cuisine phare autour de laquelle tout le menu est bâti.",
                  },
                  img: foodPizza,
                },
                {
                  name: { en: "Sainte-Catherine E", fr: "Sainte-Catherine E" },
                  desc: {
                    en: "Hochelaga — PPP's second operating kitchen, east of downtown.",
                    fr: "Hochelaga — la deuxième cuisine de PPP, à l'est du centre-ville.",
                  },
                  img: foodChicken,
                },
              ].map((loc) => (
                <Reveal key={loc.name.en} className="border border-border bg-background">
                  <img src={loc.img} alt="" loading="lazy" className="h-40 w-full object-cover" />
                  <div className="p-4">
                    <h3 className="font-display text-2xl uppercase leading-none">
                      {t(loc.name.en, loc.name.fr)}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {t(loc.desc.en, loc.desc.fr)}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* What's next / expansion timeline */}
        <section className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
          <Reveal>
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("What's next", "La suite")}
            </p>
            <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
              {t("The expansion map", "La carte d'expansion")}
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-8 overflow-x-auto">
            <ol className="flex min-w-max items-start gap-0">
              {timeline.map((s, i) => (
                <li key={`${s.place.en}-${i}`} className="flex items-start">
                  <div className="flex w-36 flex-col items-start gap-2 sm:w-44">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${dotClass[s.status]}`} aria-hidden />
                    <span className="font-display text-base uppercase leading-tight sm:text-lg">
                      {t(s.place.en, s.place.fr)}
                    </span>
                    <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                      {t(s.note.en, s.note.fr)}
                    </span>
                  </div>
                  {i < timeline.length - 1 && (
                    <span aria-hidden className="mt-1.5 h-px w-8 shrink-0 bg-border sm:w-14" />
                  )}
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* Our food */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
            <Reveal>
              <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                {t("Our food", "Notre nourriture")}
              </p>
              <h2 className="mt-2 max-w-xl font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
                {t("Rotisserie, pizza, poutine — done right", "Rôtisserie, pizza, poutine — bien faites")}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                {t(
                  "Same recipes, same standards, wherever the kitchen is. No shortcuts on the fryer oil, the dough or the gravy.",
                  "Mêmes recettes, mêmes standards, peu importe la cuisine. Aucun raccourci sur l'huile de friture, la pâte ou la sauce.",
                )}
              </p>
            </Reveal>
            <div className="no-scrollbar mt-6 flex gap-3 overflow-x-auto">
              {[foodPizza, foodChicken, foodPoutine].map((img, i) => (
                <Reveal key={i} delay={i * 80} className="w-56 shrink-0 overflow-hidden border border-border">
                  <img src={img} alt="" loading="lazy" className="h-40 w-full object-cover" />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Our community */}
        <section className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
          <Reveal className="max-w-2xl">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Our community", "Notre communauté")}
            </p>
            <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
              {t("Built by the neighbourhood, for the neighbourhood", "Bâti par le quartier, pour le quartier")}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {t(
                "Every PPP kitchen hires locally and serves locally. As we grow to new addresses, that stays the same.",
                "Chaque cuisine PPP embauche localement et sert localement. En grandissant vers de nouvelles adresses, ça ne change pas.",
              )}
            </p>
          </Reveal>
        </section>

        {/* Franchise + careers CTA */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-[80rem] gap-3 px-3 py-10 sm:grid-cols-2 sm:px-6 lg:py-14">
            <Reveal className="flex flex-col justify-between border border-border bg-card p-6">
              <div>
                <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                  {t("Franchise", "Franchise")}
                </p>
                <h3 className="mt-1 font-display text-2xl uppercase leading-none sm:text-3xl">
                  {t("Bring PPP to your city", "Amenez PPP dans votre ville")}
                </h3>
              </div>
              <Link
                to="/franchise"
                className="cta-motion mt-4 inline-flex w-fit items-center gap-2 bg-primary px-5 py-3 font-display text-base uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("Explore franchising", "Explorer la franchise")}
                <ArrowUpRight className="cta-arrow h-4 w-4" />
              </Link>
            </Reveal>
            <Reveal delay={90} className="flex flex-col justify-between border border-border bg-card p-6">
              <div>
                <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                  {t("Careers", "Carrières")}
                </p>
                <h3 className="mt-1 font-display text-2xl uppercase leading-none sm:text-3xl">
                  {t("Work with PPP", "Travaillez chez PPP")}
                </h3>
              </div>
              <Link
                to="/careers"
                className="cta-motion mt-4 inline-flex w-fit items-center gap-2 bg-primary px-5 py-3 font-display text-base uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("See open roles", "Voir les postes")}
                <ArrowUpRight className="cta-arrow h-4 w-4" />
              </Link>
            </Reveal>
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
