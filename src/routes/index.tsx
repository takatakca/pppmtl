import { createFileRoute } from "@tanstack/react-router";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { LocationSheet } from "@/components/layout/location-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { Hero } from "@/components/home/hero";
import { OrderStrip } from "@/components/home/order-strip";
import { Deals } from "@/components/home/deals";
import { MenuExplorer } from "@/components/home/menu-explorer";
import { Rewards } from "@/components/home/rewards";
import { LocationsSection } from "@/components/home/locations-section";
import { FranchiseCareers } from "@/components/home/franchise-careers";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PPP MTL-Nord | Order Chicken, Pizza & Poutine in Montréal" },
      {
        name: "description",
        content:
          "Search or say what you're craving, then order pickup or delivery from PPP Montréal-Nord — rotisserie chicken, pizza, poutine, shawarma and $15.99 combos.",
      },
      { property: "og:title", content: "PPP MTL-Nord | Poulet · Pizza · Poutine" },
      {
        property: "og:description",
        content:
          "Voice and text food search, pickup or delivery, combos and PPP Rewards — Montréal-Nord's neighbourhood kitchen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function AccountTeaser() {
  const { t } = usePPP();
  return (
    <section id="account" className="mx-auto max-w-[110rem] px-3 pb-14 sm:px-6">
      <div className="border border-border bg-card p-6 sm:p-10">
        <h2 className="font-display text-4xl uppercase leading-none sm:text-6xl">
          {t("Your PPP account", "Votre compte PPP")}
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {t(
            "Sign in to see recent orders, reorder in one tap, track your points balance, manage gift cards and save your favourites.",
            "Connectez-vous pour voir vos commandes récentes, recommander en une touche, suivre vos points, gérer vos cartes-cadeaux et enregistrer vos favoris.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href="#account"
            className="bg-primary px-6 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
          >
            {t("Create account", "Créer un compte")}
          </a>
          <a
            href="#account"
            className="border border-border px-6 py-3.5 font-display text-lg uppercase leading-none focus-ppp"
          >
            {t("Sign in", "Se connecter")}
          </a>
        </div>
      </div>
    </section>
  );
}

function Index() {
  return (
    <div id="top" className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main>
        <Hero />
        <Deals />
        <MenuExplorer />
        <OrderStrip />
        <Rewards />
        <LocationsSection />
        <FranchiseCareers />
        <AccountTeaser />
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}
