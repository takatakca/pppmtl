import { createFileRoute } from "@tanstack/react-router";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { LocationSheet } from "@/components/layout/location-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { Hero } from "@/components/home/hero";
import { MostOrdered } from "@/components/home/most-ordered";
import { OffersGrid } from "@/components/home/offers-grid";
import { CategoryExplorer } from "@/components/home/category-explorer";
import { CartPanel } from "@/components/order/cart-panel";
import { Rewards } from "@/components/home/rewards";
import { DealBanner } from "@/components/marketing/deal-banner";
import { StickyOrderCTA } from "@/components/layout/sticky-order-cta";
import { AccountModule } from "@/components/home/account-module";
import { AppPreview } from "@/components/home/app-preview";
import { GiftCardBlock } from "@/components/home/gift-card-block";
import { OrderYourWay } from "@/components/home/order-your-way";
import { FreshFromPPP } from "@/components/home/fresh-from-ppp";
import { WhatPeopleSay } from "@/components/home/what-people-say";
import { NeedHelp } from "@/components/home/need-help";
import { LocationsSection } from "@/components/home/locations-section";
import { LocationStrip } from "@/components/home/location-strip";
import { StoryBand } from "@/components/home/story-band";
import { PromoTicker } from "@/components/marketing/promo-ticker";
import { FranchiseCareers } from "@/components/home/franchise-careers";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import { businessJsonLd, pppBusiness } from "@/config/business";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PPP Pizzeria Montreal | Pizza, Chicken & Poutine in NDG" },
      {
        name: "description",
        content:
          "Order pickup or delivery from PPP Pizzeria Montreal in Notre-Dame-de-Grâce, 6280 Av. Somerled. Pizza, rotisserie chicken, poutine, shawarma and combo deals.",
      },
      { property: "og:title", content: "PPP Pizzeria NDG | Poulet · Pizza · Poutine" },
      {
        property: "og:description",
        content:
          "Voice and text food search, pickup or delivery, combos and PPP Rewards — 6280 Av. Somerled, Notre-Dame-de-Grâce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: canonicalUrl("/") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/") }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(businessJsonLd()) }],
  }),
  component: Index,
});

function Index() {
  return (
    <div id="top" className="min-h-screen bg-background pb-16 lg:pb-0">
      <PromoTicker />
      <PPPHeader />
      <main>
        <Hero />
        <MostOrdered />
        <OffersGrid />
        <DealBanner />
        <CategoryExplorer />
        <OrderYourWay />
        <Rewards />
        <AccountModule />
        <AppPreview />
        <GiftCardBlock />
        <LocationsSection />
        <LocationStrip />
        <StoryBand />
        <WhatPeopleSay />
        <FreshFromPPP />
        <NeedHelp />
        <FranchiseCareers />
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <StickyOrderCTA />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
      <CartPanel />
    </div>
  );
}
