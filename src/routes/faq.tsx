import { createFileRoute } from "@tanstack/react-router";
import { MessageCircleQuestion } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { FaqList } from "@/components/support/faq-list";
import { usePPP } from "@/context/ppp-store";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "Answers about ordering, pickup, delivery, third-party apps, accounts, rewards, gift cards, locations and careers at PPP Pizzeria.",
      },
      { property: "og:title", content: "PPP FAQ" },
      {
        property: "og:description",
        content: "Searchable answers about ordering, delivery, accounts and PPP locations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { t } = usePPP();
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[110rem] px-3 py-6 sm:px-6 sm:py-12">
            <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              <MessageCircleQuestion className="h-3.5 w-3.5" />
              {t("Frequently asked questions", "Questions fréquentes")}
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase leading-none sm:text-7xl">
              {t("FAQ", "FAQ")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t(
                "Search or filter by category. Still stuck? Visit Support for order help.",
                "Recherchez ou filtrez par catégorie. Toujours coincé? Visitez Support pour l'aide aux commandes.",
              )}
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-3 py-6 sm:px-6 lg:py-12">
          <FaqList />
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
