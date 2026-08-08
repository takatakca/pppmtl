import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Gift, Heart, Star } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";

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
      { property: "og:url", content: "/account" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/account" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { t } = usePPP();

  const panels = [
    {
      icon: Clock,
      title: t("Recent orders", "Commandes récentes"),
      body: t(
        "Your last orders will appear here so you can reorder in one tap.",
        "Vos dernières commandes apparaîtront ici pour recommander en une touche.",
      ),
    },
    {
      icon: Star,
      title: t("PPP Rewards", "Points PPP"),
      body: t(
        "Points collected on direct orders, and the rewards you can claim.",
        "Les points accumulés sur vos commandes directes et les récompenses disponibles.",
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

        <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {panels.map((p) => (
            <section key={p.title} className="border border-border bg-card p-5">
              <p.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-display text-2xl uppercase leading-none">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </section>
          ))}
        </div>

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