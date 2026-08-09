import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Gift, Heart, MapPin, Star } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import { GoogleButton } from "@/components/auth/google-button";
import { MarketingPreferencesPanel } from "@/components/account/marketing-preferences";
import { LocationPreference } from "@/components/account/location-preference";
import { pppBusiness } from "@/config/business";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My PPP Account | PPP Pizzeria NDG" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Your PPP NDG account: recent orders, rewards points, favourites and gift cards.",
      },
      { property: "og:title", content: "My PPP Account" },
      { property: "og:description", content: "Recent orders, rewards, favourites and gift cards." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/account") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/account") }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { t } = usePPP();

  const panels = [
    {
      icon: Clock,
      title: t("Order again", "Recommander"),
      body: t(
        "Your PPP Direct orders will appear here so you can reorder in one tap.",
        "Vos commandes PPP Direct apparaîtront ici pour recommander en une touche.",
      ),
    },
    {
      icon: Star,
      title: t("PPP Rewards", "Points PPP"),
      body: t(
        "Points collected on eligible direct orders, and the rewards you can claim.",
        "Les points accumulés sur les commandes directes admissibles et les récompenses disponibles.",
      ),
    },
    {
      icon: Heart,
      title: t("Favourites", "Favoris"),
      body: t(
        "Save the items you order most for a faster checkout.",
        "Enregistrez vos articles préférés pour commander plus vite.",
      ),
    },
    {
      icon: Gift,
      title: t("Gift cards", "Cartes-cadeaux"),
      body: t(
        "Buy, send and redeem PPP gift cards.",
        "Achetez, offrez et utilisez des cartes-cadeaux PPP.",
      ),
    },
  ];

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        <h1 className="font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
          {t("Your PPP account", "Votre compte PPP")}
          <span className="block text-flame">{pppBusiness.shortLocationName}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {t(
            "Create your PPP account to reorder in one tap, keep your rewards and save your favourites — or keep ordering as a guest.",
            "Créez votre compte PPP pour recommander en une touche, conserver vos points et enregistrer vos favoris — ou commandez sans compte.",
          )}
        </p>

        {/* Account conversion nudge — relevant right after a guest order. */}
        <section className="mt-5 border border-border bg-primary p-5 sm:p-7">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-primary-foreground/80">
            {t("Ordered as a guest recently?", "Commandé sans compte récemment ?")}
          </p>
          <h2 className="mt-1 font-display text-3xl uppercase leading-[0.9] text-primary-foreground sm:text-4xl">
            {t("Save that order to a PPP account", "Enregistrez cette commande dans un compte PPP")}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/85">
            {t(
              "Turn a verified guest order into a full PPP account any time — nothing is created automatically, and we never sign you up for marketing without asking.",
              "Transformez une commande vérifiée sans compte en compte PPP complet à tout moment — rien n'est créé automatiquement et nous ne vous abonnons jamais au marketing sans votre accord.",
            )}
          </p>
          <div className="mt-4 grid max-w-sm gap-2">
            <GoogleButton />
            <Link
              to="/account/sign-up"
              className="press-tap bg-background py-3.5 text-center font-display text-lg uppercase leading-none focus-ppp"
            >
              {t("Create a password", "Créer un mot de passe")}
            </Link>
          </div>
        </section>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {panels.map((p) => (
            <section key={p.title} className="border border-border bg-card p-5">
              <p.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-display text-2xl uppercase leading-none">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </section>
          ))}
        </div>

        {/* Loyalty progress — no fake balance, honest empty state until connected. */}
        <section className="mt-6 border border-border bg-card p-5">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("Loyalty", "Fidélité")}
          </p>
          <h2 className="mt-1 font-display text-3xl uppercase leading-none">
            {t("Your rewards progress", "Votre progression de récompenses")}
          </h2>
          <div className="mt-3 flex items-center gap-4 border border-dashed border-border p-4">
            <Star className="h-8 w-8 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t("No rewards balance yet", "Aucun solde de récompenses pour l'instant")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "Sign in and order directly from PPP to start earning. We'll show real numbers here once your account is connected.",
                  "Connectez-vous et commandez directement chez PPP pour commencer à gagner. Nous afficherons de vrais chiffres ici une fois votre compte connecté.",
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-2 lg:grid-cols-2">
          <LocationPreference />
          <MarketingPreferencesPanel />
        </div>

        {/* Saved addresses — authenticated customers only; guests never get a silently saved address. */}
        <section className="mt-6 border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h2 className="font-display text-3xl uppercase leading-none">
                {t("Saved addresses", "Adresses enregistrées")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "Sign in to save delivery addresses for faster checkout next time. As a guest, your address is only used for the current order.",
                  "Connectez-vous pour enregistrer vos adresses de livraison et accélérer vos prochaines commandes. Sans compte, votre adresse ne sert qu'à la commande en cours.",
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Order history — honest about what can and can't be shown. */}
        <section className="mt-6 border border-border bg-card p-5">
          <h2 className="font-display text-3xl uppercase leading-none">
            {t("Order history", "Historique des commandes")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t(
              "PPP Direct orders placed while signed in will show up here as first-party history. Orders placed through Uber Eats, DoorDash or Skip are handled by that platform — we can't display or import them here, but you can always reorder using the same app.",
              "Les commandes PPP Direct passées pendant que vous êtes connecté apparaîtront ici. Les commandes passées sur Uber Eats, DoorDash ou Skip sont gérées par cette plateforme — nous ne pouvons pas les afficher ni les importer ici, mais vous pouvez toujours recommander avec la même application.",
            )}
          </p>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/account/sign-up"
            className="press-tap cta-glow bg-primary px-6 py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
          >
            {t("Create my account", "Créer mon compte")}
          </Link>
          <Link
            to="/account/sign-in"
            search={{ returnTo: "/account" }}
            className="press-tap border border-border px-6 py-3.5 font-display text-xl uppercase leading-none focus-ppp"
          >
            {t("Sign in", "Se connecter")}
          </Link>
          <Link
            to="/order"
            className="press-tap border border-border px-6 py-3.5 font-display text-xl uppercase leading-none focus-ppp"
          >
            {t("Order without an account", "Commander sans compte")}
          </Link>
          <a
            href={pppBusiness.phone.href}
            className="press-tap border border-border px-6 py-3.5 font-display text-xl uppercase leading-none focus-ppp"
          >
            {t("Call the restaurant", "Appeler le restaurant")}
          </a>
        </div>
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}
