import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Mail, MapPin, MessageCircleQuestion, Phone } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { AskPPP } from "@/components/support/ask-ppp";
import { SupportRouter } from "@/components/support/support-router";
import { usePPP } from "@/context/ppp-store";
import { NDG_LOCATION_ID, locationById } from "@/config/locations";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "Get help with a PPP Pizzeria order — PPP Direct, Uber Eats, DoorDash or Skip — plus FAQs, account help and restaurant contact info.",
      },
      { property: "og:title", content: "PPP Support" },
      {
        property: "og:description",
        content: "Order help, FAQs and restaurant contact — routed to the right place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { t, locationId } = usePPP();
  const location = locationById(locationId ?? "") ?? locationById(NDG_LOCATION_ID)!;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[110rem] px-3 py-6 sm:px-6 sm:py-12">
            <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              <LifeBuoy className="h-3.5 w-3.5" />
              {t("PPP support", "Support PPP")}
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase leading-none sm:text-7xl">
              {t("How can we help?", "Comment pouvons-nous aider?")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t(
                "Order issues on a delivery app are handled by that app. Everything else — PPP Direct orders, account, rewards, gift cards, a restaurant visit or a general question — starts here.",
                "Un problème de commande sur une application de livraison est géré par cette application. Pour tout le reste — commandes PPP Direct, compte, récompenses, cartes-cadeaux, visite au restaurant ou question générale — c'est ici que ça commence.",
              )}
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-[110rem] gap-4 px-3 py-6 sm:px-6 lg:grid-cols-2 lg:py-12">
          <AskPPP />
          <SupportRouter />

          <div className="border border-border bg-card p-4 sm:p-6 lg:col-span-2">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Quick contacts", "Contacts rapides")}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {location.phone ? (
                <a
                  href={`tel:${location.phone.e164}`}
                  className="flex items-center gap-2 border border-border px-3 py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:border-primary focus-ppp"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  {location.phone.display}
                </a>
              ) : (
                <p className="flex items-center gap-2 border border-border px-3 py-3 text-xs text-muted-foreground">
                  {t("Phone not published yet", "Téléphone non publié")}
                </p>
              )}
              <Link
                to="/contact"
                className="flex items-center gap-2 border border-border px-3 py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:border-primary focus-ppp"
              >
                <Mail className="h-4 w-4 text-primary" />
                {t("Contact page", "Page Contact")}
              </Link>
              <Link
                to="/faq"
                className="flex items-center gap-2 border border-border px-3 py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:border-primary focus-ppp"
              >
                <MessageCircleQuestion className="h-4 w-4 text-primary" />
                {t("Browse FAQ", "Voir la FAQ")}
              </Link>
            </div>
            <a
              href="#locations"
              className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-accent underline focus-ppp"
            >
              <MapPin className="h-3.5 w-3.5" />
              {t("See all PPP locations", "Voir tous les emplacements PPP")}
            </a>
          </div>
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
