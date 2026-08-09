import { createFileRoute } from "@tanstack/react-router";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import { SignedOutHero } from "@/components/account/signed-out-hero";
import { PreferredNameStep } from "@/components/account/preferred-name-step";
import { MemberDashboard } from "@/components/account/member-dashboard";
import { useCustomerSession } from "@/lib/customer/session";
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
  const { status, customer } = useCustomerSession();

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        {status === "loading" && (
          <div className="grid gap-2">
            <div className="h-56 animate-pulse bg-card sm:h-72" />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse bg-card" />
              ))}
            </div>
          </div>
        )}

        {status === "signed_out" && <SignedOutHero accountsAvailable={false} />}

        {status === "onboarding" && <PreferredNameStep />}

        {status === "member" && customer && <MemberDashboard customer={customer} />}

        {/* Marketplace history is owned by the marketplace — say so once, in every state. */}
        {status !== "loading" && status !== "onboarding" && (
          <section className="mt-2 border border-border bg-card p-5">
            <h2 className="font-display text-3xl uppercase leading-none">
              {t("Order history", "Historique des commandes")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t(
                "Orders placed through Uber Eats, DoorDash or Skip are handled by that platform, so they can't appear here — reorder them in the same app you used.",
                "Les commandes passées sur Uber Eats, DoorDash ou Skip sont gérées par ces plateformes et ne peuvent pas apparaître ici — recommandez-les dans la même application.",
              )}
            </p>
          </section>
        )}
      </main>
      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}
