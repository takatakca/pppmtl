import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Info } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { CallbackSheet } from "@/components/support/callback-sheet";
import { usePPP, useSelectedRestaurantLocation } from "@/context/ppp-store";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/phone-order")({
  head: () => ({
    meta: [
      { title: "Order by phone | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "Call your PPP Pizzeria location directly to place an order. See hours, what to have ready and how to request a callback.",
      },
      { property: "og:title", content: "Order by phone" },
      {
        property: "og:description",
        content: "Everything you need before calling PPP Pizzeria to place an order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/phone-order") }],
  }),
  component: PhoneOrderPage,
});

function PhoneOrderPage() {
  const { t } = usePPP();
  const location = useSelectedRestaurantLocation();
  const hasPhone = Boolean(location.phone);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[70rem] px-3 py-6 sm:px-6 sm:py-12">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Call to order", "Commander par téléphone")}
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase leading-none sm:text-7xl">
              {t("Order by phone", "Commander par téléphone")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t(
                `For ${location.displayName}. A real person answers the phone — there is no automated or AI phone ordering yet.`,
                `Pour ${location.displayName}. Une vraie personne répond au téléphone — il n'y a pas encore de commande téléphonique automatisée ou par IA.`,
              )}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[70rem] px-3 py-6 sm:px-6 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="border border-border p-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {location.neighborhood}
              </p>
              <h2 className="mt-1 font-display text-2xl uppercase leading-none">
                {location.displayName}
              </h2>

              {hasPhone ? (
                <a
                  href={`tel:${location.phone!.e164}`}
                  className="press-tap mt-5 inline-flex items-center gap-3 bg-primary px-6 py-4 font-display text-2xl uppercase leading-none text-primary-foreground focus-ppp"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  <Phone className="h-6 w-6" />
                  {location.phone!.display}
                </a>
              ) : (
                <div className="mt-5 border border-border bg-card/50 p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 font-display text-sm uppercase leading-none text-foreground">
                    <Info className="h-4 w-4 text-primary" />
                    {t("Phone number not published yet", "Numéro non publié pour le moment")}
                  </p>
                  <p className="mt-2">
                    {t(
                      "This location's phone number hasn't been confirmed for the site yet. Use directions or the callback request below, or choose another location.",
                      "Le numéro de téléphone de cet emplacement n'a pas encore été confirmé pour le site. Utilisez l'itinéraire ou la demande de rappel ci-dessous, ou choisissez un autre emplacement.",
                    )}
                  </p>
                  <Link
                    to="/locations"
                    className="mt-3 inline-block font-display text-sm uppercase leading-none text-primary hover:underline"
                  >
                    {t("Browse all locations", "Voir tous les emplacements")}
                  </Link>
                </div>
              )}

              <p className="mt-4 text-sm text-muted-foreground">
                {location.statusNote ??
                  t(
                    "Live open/closed status for this location isn't confirmed yet — please call to check.",
                    "L'état ouvert/fermé en direct de cet emplacement n'est pas encore confirmé — veuillez appeler pour vérifier.",
                  )}
              </p>

              <div className="mt-6">
                <p className="font-display text-sm uppercase leading-none text-foreground">
                  {t("What to have ready", "Ce qu'il faut avoir sous la main")}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>• {t("Pickup or delivery, and your address if delivery", "Cueillette ou livraison, et votre adresse pour la livraison")}</li>
                  <li>• {t("Items, sizes and any modifications", "Articles, formats et modifications")}</li>
                  <li>• {t("A callback number in case the order needs confirming", "Un numéro de rappel au cas où la commande doive être confirmée")}</li>
                  <li>• {t("How you'll pay (card or cash on pickup/delivery, as offered in-store)", "Mode de paiement (carte ou comptant à la cueillette/livraison, selon l'offre en magasin)")}</li>
                </ul>
              </div>
            </div>

            <div className="border border-border p-5">
              <h2 className="font-display text-xl uppercase leading-none">
                {t("Can't call right now?", "Impossible d'appeler maintenant?")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "Leave your details and ask for a callback. Callbacks are coming soon — calling the restaurant is still the fastest way to order.",
                  "Laissez vos coordonnées et demandez un rappel. Les rappels arrivent bientôt — appeler le restaurant reste le plus rapide.",
                )}
              </p>
              <div className="mt-4">
                <CallbackSheet defaultReason="phone_order" defaultLocationSlug={location.slug} />
              </div>
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  {t("Prefer to order online instead?", "Préférez commander en ligne?")}
                </p>
                <Link
                  to="/order"
                  className="mt-2 inline-block font-display text-sm uppercase leading-none text-primary hover:underline"
                >
                  {t("Go to PPP Direct ordering", "Aller à la commande PPP Direct")}
                </Link>
              </div>
            </div>
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
