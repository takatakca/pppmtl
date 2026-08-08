import { createFileRoute } from "@tanstack/react-router";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { LocationSheet } from "@/components/layout/location-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { Hero } from "@/components/home/hero";
import { MostOrdered } from "@/components/home/most-ordered";
import { OffersGrid } from "@/components/home/offers-grid";
import { CategoryGrid } from "@/components/home/category-grid";
import { Rewards } from "@/components/home/rewards";
import { PromoExperience } from "@/components/marketing/promo-experience";
import { AccountModule } from "@/components/home/account-module";
import { LocationsSection } from "@/components/home/locations-section";
import { FranchiseCareers } from "@/components/home/franchise-careers";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import { businessJsonLd, pppBusiness } from "@/config/business";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PPP Pizzeria NDG | Pizza, Chicken & Poutine on Somerled" },
      {
        name: "description",
        content:
          "Order pickup or delivery from PPP Pizzeria Montreal in Notre-Dame-de-Grâce, 6280 Av. Somerled. Pizza, rotisserie chicken, poutine, shawarma and $15.99 combos.",
      },
      { property: "og:title", content: "PPP Pizzeria NDG | Poulet · Pizza · Poutine" },
      {
        property: "og:description",
        content:
          "Voice and text food search, pickup or delivery, combos and PPP Rewards — 6280 Av. Somerled, Notre-Dame-de-Grâce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(businessJsonLd()) }],
  }),
  component: Index,
});

function Index() {
  return (
    <div id="top" className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main>
        <Hero />
        <MostOrdered />
        <OffersGrid />
        <CategoryGrid />
        <Rewards />
        <LocationsSection />
        <FranchiseCareers />
        <AccountModule />
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
      <PromoExperience />
    </div>
  );
}
