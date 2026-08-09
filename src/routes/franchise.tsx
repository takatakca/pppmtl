import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, MapPin } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { Reveal } from "@/components/motion/reveal";
import { usePPP } from "@/context/ppp-store";
import { openLocations, comingSoonLocations, pastLocations } from "@/config/locations";
import storefront from "@/assets/storefront-night.jpg";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/franchise")({
  head: () => ({
    meta: [
      { title: "Franchise With PPP Pizzeria | Bring PPP To Your City" },
      {
        name: "description",
        content:
          "Explore franchising with PPP Pizzeria — a proven multi-location kitchen system, loyal customer base and digital-first ordering ecosystem.",
      },
      { property: "og:title", content: "Franchise With PPP Pizzeria" },
      {
        property: "og:description",
        content: "The brand, the food, the customer experience and the digital system behind PPP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: canonicalUrl("/franchise") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/franchise") }],
  }),
  component: FranchisePage,
});

const pillars = [
  {
    en: { t: "The brand", d: "A distinct, red-forward identity people already recognize and crave." },
    fr: { t: "La marque", d: "Une identité rouge et distincte que les gens reconnaissent déjà." },
  },
  {
    en: { t: "The food", d: "Rotisserie chicken, pizza and poutine with a consistent, proven recipe system." },
    fr: { t: "La nourriture", d: "Poulet rôti, pizza et poutine avec un système de recettes éprouvé." },
  },
  {
    en: { t: "The customer experience", d: "Fast pickup, reliable delivery and a store people come back to." },
    fr: { t: "L'expérience client", d: "Cueillette rapide, livraison fiable et un commerce où l'on revient." },
  },
  {
    en: { t: "The digital system", d: "Direct ordering, search, loyalty and account tools built in-house." },
    fr: { t: "Le système numérique", d: "Commande directe, recherche, fidélité et compte bâtis à l'interne." },
  },
  {
    en: { t: "Support", d: "Operational playbooks and a menu system built for multi-location consistency." },
    fr: { t: "Soutien", d: "Guides opérationnels et un système de menu pensé pour plusieurs emplacements." },
  },
  {
    en: { t: "Expansion", d: "Already growing beyond a single neighbourhood, with more kitchens ahead." },
    fr: { t: "Expansion", d: "Déjà en croissance au-delà d'un seul quartier, avec plus de cuisines à venir." },
  },
];

function FranchisePage() {
  const { t, lang } = usePPP();
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
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
              {t("Franchise", "Franchise")}
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] sm:text-8xl">
              {t("Bring PPP to", "Amenez PPP dans")}
              <br />
              <span className="text-flame">{t("your city", "votre ville")}</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              {t(
                "A proven kitchen model, a brand people already crave, and an ordering ecosystem built for growth.",
                "Un modèle de cuisine éprouvé, une marque déjà désirée et un écosystème de commande bâti pour la croissance.",
              )}
            </p>
          </Reveal>
        </section>

        <section className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p, i) => {
              const c = lang === "fr" ? p.fr : p.en;
              return (
                <Reveal key={c.t} delay={i * 60} className="border border-border bg-card p-5">
                  <Check className="h-4 w-4 text-primary" />
                  <h3 className="mt-2 font-display text-xl uppercase leading-none">{c.t}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Territory map */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-[80rem] px-3 py-12 sm:px-6 lg:py-16">
            <Reveal>
              <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                {t("Territory", "Territoire")}
              </p>
              <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
                {t("Open, coming soon, and where we started", "Ouvert, bientôt, et là où tout a commencé")}
              </h2>
            </Reveal>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: t("Open", "Ouvert"), rows: openLocations, dot: "bg-primary" },
                { label: t("Coming soon", "Bientôt"), rows: comingSoonLocations, dot: "border border-primary bg-transparent" },
                { label: t("History", "Historique"), rows: pastLocations, dot: "bg-muted-foreground/50" },
              ].map((group) => (
                <Reveal key={group.label} className="border border-border bg-background p-4">
                  <p className="flex items-center gap-1.5 font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <span className={`h-2.5 w-2.5 rounded-full ${group.dot}`} aria-hidden />
                    {group.label}
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {group.rows.map((loc) => (
                      <li key={loc.id} className="flex items-start gap-1.5 text-sm">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>
                          {loc.neighborhood}
                          <span className="block text-xs text-muted-foreground">{loc.city}</span>
                        </span>
                      </li>
                    ))}
                    {group.rows.length === 0 && (
                      <li className="text-sm text-muted-foreground">—</li>
                    )}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Inquire */}
        <section className="mx-auto max-w-[40rem] px-3 py-12 sm:px-6 lg:py-16">
          <Reveal>
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Inquire", "Renseignements")}
            </p>
            <h2 className="mt-2 font-display text-4xl uppercase leading-[0.88] sm:text-5xl">
              {t("Tell us about your market", "Parlez-nous de votre marché")}
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
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("City / region of interest", "Ville / région d'intérêt")}
                className="border border-border bg-background px-3 py-3 text-sm focus-ppp"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("Tell us about yourself", "Parlez-nous de vous")}
                rows={4}
                className="border border-border bg-background px-3 py-3 text-sm focus-ppp"
              />
              <button
                type="submit"
                className="press-tap mt-1 bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("Submit inquiry", "Envoyer la demande")}
              </button>
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
