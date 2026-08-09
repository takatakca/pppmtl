import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, ChefHat, Truck, Users, Wrench } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { Reveal } from "@/components/motion/reveal";
import { usePPP } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";
import crew from "@/assets/team-crew.jpg";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers at PPP Pizzeria | Work With PPP" },
      {
        name: "description",
        content:
          "Kitchen, counter and delivery roles at PPP Pizzeria Montréal. See what it's like to work with PPP and how to apply.",
      },
      { property: "og:title", content: "Careers at PPP Pizzeria" },
      { property: "og:description", content: "Work with PPP — kitchen, counter and delivery roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/careers" },
    ],
    links: [{ rel: "canonical", href: "/careers" }],
  }),
  component: CareersPage,
});

const roles = [
  { icon: ChefHat, en: { t: "Kitchen", d: "Line cooks and prep, rotisserie, pizza and fry stations." }, fr: { t: "Cuisine", d: "Cuisiniers et préparation, rôtisserie, pizza et friture." } },
  { icon: Users, en: { t: "Counter / Guest Experience", d: "Front counter, phone orders and in-store guest experience." }, fr: { t: "Comptoir / Expérience client", d: "Comptoir, commandes téléphoniques et accueil en salle." } },
  { icon: Truck, en: { t: "Delivery / Operations", d: "Where applicable — delivery and day-to-day store operations." }, fr: { t: "Livraison / Opérations", d: "Selon l'emplacement — livraison et opérations quotidiennes." } },
  { icon: Wrench, en: { t: "Management", d: "Shift leads and store management across PPP locations." }, fr: { t: "Gestion", d: "Chefs de quart et gestion de commerce dans les emplacements PPP." } },
];

function CareersPage() {
  const { t, lang } = usePPP();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]!.en.t);

  const applyHref = pppBusiness.legacyExternalMenuUrl ? null : null;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        <section className="relative isolate overflow-hidden border-b border-border">
          <img
            src={crew}
            alt=""
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/60" />
          <Reveal className="relative mx-auto max-w-[70rem] px-3 py-14 sm:px-6 sm:py-20">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Careers", "Carrières")}
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] sm:text-8xl">
              {t("Work with PPP", "Travaillez chez PPP")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              {t(
                "Kitchen, counter and delivery roles across our Montréal locations.",
                "Postes en cuisine, au comptoir et en livraison dans nos emplacements montréalais.",
              )}
            </p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
          <Reveal>
            <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">
              {t("Roles", "Postes")}
            </h2>
          </Reveal>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {roles.map((r, i) => {
              const c = lang === "fr" ? r.fr : r.en;
              const Icon = r.icon;
              return (
                <Reveal key={c.t} delay={i * 70} className="flex gap-3 border border-border bg-card p-5">
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-display text-xl uppercase leading-none">{c.t}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-[70rem] px-3 py-12 sm:px-6 lg:py-16">
            <Reveal className="max-w-2xl">
              <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                {t("Life at PPP", "La vie chez PPP")}
              </p>
              <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
                {t("Real kitchens, real teams", "De vraies cuisines, de vraies équipes")}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {t(
                  "PPP crews cook rotisserie, pizza and poutine to order, every shift, at every location. As we open new kitchens, the same team culture goes with them.",
                  "Les équipes PPP cuisinent rôtisserie, pizza et poutine sur commande, à chaque quart, à chaque emplacement. En ouvrant de nouvelles cuisines, cette culture d'équipe les accompagne.",
                )}
              </p>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-[40rem] px-3 py-12 sm:px-6 lg:py-16">
          <Reveal>
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Apply", "Postuler")}
            </p>
            <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-5xl">
              {t("Send us your application", "Envoyez-nous votre candidature")}
            </h2>
          </Reveal>
          {submitted ? (
            <Reveal delay={80} className="mt-6 border border-border bg-card p-6">
              <p className="font-display text-2xl uppercase">
                {t("Thanks — we'll be in touch.", "Merci — nous vous contacterons.")}
              </p>
            </Reveal>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="mt-6 grid gap-3"
            >
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Full name", "Nom complet")}
                className="border border-border bg-background px-3 py-3 text-sm focus-ppp"
              />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("Email", "Courriel")}
                className="border border-border bg-background px-3 py-3 text-sm focus-ppp"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border border-border bg-background px-3 py-3 text-sm focus-ppp"
              >
                {roles.map((r) => (
                  <option key={r.en.t} value={r.en.t}>
                    {lang === "fr" ? r.fr.t : r.en.t}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="press-tap mt-1 bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("Submit application", "Envoyer la candidature")}
              </button>
              {applyHref && (
                <a
                  href={applyHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center justify-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp"
                >
                  {t("Or apply externally", "Ou postuler ailleurs")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </form>
          )}
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
