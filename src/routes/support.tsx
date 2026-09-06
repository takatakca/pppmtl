import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, MapPin, MessageCircleQuestion, Phone } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { AskPPP } from "@/components/support/ask-ppp";
import { CallbackSheet } from "@/components/support/callback-sheet";
import { SupportRouter } from "@/components/support/support-router";
import { usePPP } from "@/context/ppp-store";
import { restaurantLocations } from "@/config/locations";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "Get help with a PPP order — routed to the right place whether you ordered directly, by phone, or through Uber Eats, DoorDash or SkipTheDishes.",
      },
      { property: "og:title", content: "PPP Support" },
      {
        property: "og:description",
        content: "Order help, routed intelligently — PPP Direct, phone or marketplace orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/support") }],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { t } = usePPP();
  const routerRef = useRef<HTMLDivElement | null>(null);
  const openLocation = restaurantLocations.find((l) => l.lifecycleStatus === "open");

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        {/* Editorial hero — restaurant brand energy, not documentation software */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card/60 to-background">
          <div className="mx-auto max-w-[80rem] px-3 py-10 sm:px-6 sm:py-16">
            <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              <LifeBuoy className="h-3.5 w-3.5" />
              {t("PPP support", "Support PPP")}
            </p>
            <h1 className="mt-2 max-w-2xl font-display text-4xl uppercase leading-[0.9] sm:text-7xl">
              {t("How can we", "Comment pouvons-nous")}
              <br />
              <span className="text-flame">{t("help?", "vous aider?")}</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">
              {t(
                "Tell us where you ordered and what happened. We'll route you to PPP directly or straight to the marketplace that owns your order — never a guess.",
                "Dites-nous où vous avez commandé et ce qui s'est passé. Nous vous dirigerons vers PPP directement ou vers la plateforme responsable de votre commande — jamais une supposition.",
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  routerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="press-tap inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-sm uppercase tracking-widest text-primary-foreground focus-ppp"
              >
                {t("Start support", "Commencer")}
              </button>
              <Link
                to="/faq"
                className="press-tap inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-sm uppercase tracking-widest hover:border-primary focus-ppp"
              >
                <MessageCircleQuestion className="h-4 w-4" />
                {t("Browse FAQ", "Voir la FAQ")}
              </Link>
              {openLocation?.phone && (
                <a
                  href={`tel:${openLocation.phone.e164}`}
                  className="press-tap inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-sm uppercase tracking-widest hover:border-primary focus-ppp"
                >
                  <Phone className="h-4 w-4" />
                  {t("Call PPP", "Appeler PPP")}
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-[80rem] gap-4 px-3 py-6 sm:px-6 sm:py-10 lg:grid-cols-2 lg:gap-6">
          <AskPPP
            onEscalate={() =>
              routerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          />
          <div ref={routerRef}>
            <SupportRouter />
          </div>
        </div>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-[80rem] px-3 py-6 sm:px-6 sm:py-10">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Good to know", "Bon à savoir")}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="border border-border bg-background p-4">
                <p className="font-display text-sm uppercase leading-tight">
                  {t("PPP handles", "PPP s'occupe de")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "PPP Direct orders, phone orders, restaurant/food questions, rewards, gift cards and location questions.",
                    "Commandes PPP Direct, commandes par téléphone, questions sur le restaurant ou la nourriture, récompenses, cartes-cadeaux et emplacements.",
                  )}
                </p>
              </div>
              <div className="border border-border bg-background p-4">
                <p className="font-display text-sm uppercase leading-tight">
                  {t("The marketplace handles", "La plateforme s'occupe de")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "Order tracking, courier issues, cancellations and refunds for anything ordered on Uber Eats, DoorDash or SkipTheDishes.",
                    "Le suivi de commande, les problèmes de livreur, les annulations et les remboursements pour tout ce qui est commandé sur Uber Eats, DoorDash ou SkipTheDishes.",
                  )}
                </p>
              </div>
            </div>
            <Link
              to="/contact"
              className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-accent underline focus-ppp"
            >
              <MapPin className="h-3.5 w-3.5" />
              {t("Find a location's phone number", "Trouver le numéro d'un emplacement")}
            </Link>
            <div className="mt-4">
              <CallbackSheet />
            </div>
          </div>
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
