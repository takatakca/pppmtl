import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  ChefHat,
  CheckCircle2,
  ExternalLink,
  PackageCheck,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { CallbackSheet } from "@/components/support/callback-sheet";
import { OrderTimeline } from "@/components/order/order-timeline";
import { usePPP, useSelectedRestaurantLocation } from "@/context/ppp-store";
import { trackExternalOrder, trackProviderSelected } from "@/lib/analytics";
import { orderingChannels } from "@/config/external-presence";
import { canonicalUrl } from "@/config/site";
import { listMyOrders, type OrderView } from "@/lib/orders/orders.functions";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track your order | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "Find out where to track a PPP Pizzeria order — PPP Direct, phone orders, Uber Eats, DoorDash or Skip the Dishes.",
      },
      { property: "og:title", content: "Track your PPP order" },
      {
        property: "og:description",
        content: "Pick the way you ordered to find the right place to check its status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/track") }],
  }),
  component: TrackPage,
});

type Provider = "ppp_direct" | "phone" | "uber_eats" | "doordash" | "skip" | null;

const statusLadder = [
  { key: "received", en: "Received", fr: "Reçue", icon: PackageCheck },
  { key: "preparing", en: "Preparing", fr: "En préparation", icon: ChefHat },
  { key: "ready", en: "Ready", fr: "Prête", icon: ShoppingBag },
  { key: "out_for_delivery", en: "Out for delivery", fr: "En livraison", icon: Bike },
  { key: "delivered", en: "Delivered", fr: "Livrée", icon: CheckCircle2 },
] as const;

const marketplaceMeta: Record<
  "uber_eats" | "doordash" | "skip",
  { labelEn: string; labelFr: string; appUrl: string }
> = {
  uber_eats: {
    labelEn: "Uber Eats",
    labelFr: "Uber Eats",
    appUrl: orderingChannels.find((c) => c.id === "uber_eats")!.trackingUrl,
  },
  doordash: {
    labelEn: "DoorDash",
    labelFr: "DoorDash",
    appUrl: orderingChannels.find((c) => c.id === "doordash")!.trackingUrl,
  },
  skip: {
    labelEn: "Skip the Dishes",
    labelFr: "Skip the Dishes",
    appUrl: orderingChannels.find((c) => c.id === "skip")!.trackingUrl,
  },
};

function TrackPage() {
  const { t, lang } = usePPP();
  const location = useSelectedRestaurantLocation();
  const [provider, setProvider] = useState<Provider>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [lookupTried, setLookupTried] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [foundOrder, setFoundOrder] = useState<OrderView | null>(null);

  function choose(p: Exclude<Provider, null>) {
    setProvider(p);
    setFoundOrder(null);
    setLookupError(null);
    setLookupTried(false);
    trackProviderSelected(p);
    if (p === "uber_eats" || p === "doordash" || p === "skip") {
      trackExternalOrder(p, location.id, "/track");
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupTried(true);
    setFoundOrder(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || code.trim().length < 4) {
      setLookupError(
        t(
          "Enter the phone number used for the order and the full order code.",
          "Entrez le numéro utilisé pour la commande et le code de commande complet.",
        ),
      );
      return;
    }
    setLookupError(null);
    try {
      const result = await listMyOrders({ data: { customerId: null, phone: digits } });
      const match = result.orders.find(
        (o) =>
          o.orderNumber?.toLowerCase() === code.trim().toLowerCase() ||
          o.id.toLowerCase().endsWith(code.trim().toLowerCase()),
      );
      if (match) setFoundOrder(match);
    } catch {
      /* leave not found */
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[70rem] px-3 py-6 sm:px-6 sm:py-12">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Order status", "État de la commande")}
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase leading-none sm:text-7xl">
              {t("Track your order", "Suivre votre commande")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t(
                "Tell us how you ordered and we'll point you to the right place to check its status.",
                "Dites-nous comment vous avez commandé et nous vous dirigerons au bon endroit pour vérifier son état.",
              )}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-[70rem] px-3 py-6 sm:px-6 lg:py-12">
          <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {t("How did you order?", "Comment avez-vous commandé?")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                { key: "ppp_direct", en: "PPP Direct", fr: "PPP Direct" },
                { key: "phone", en: "Phone", fr: "Téléphone" },
                { key: "uber_eats", en: "Uber Eats", fr: "Uber Eats" },
                { key: "doordash", en: "DoorDash", fr: "DoorDash" },
                { key: "skip", en: "Skip", fr: "Skip" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => choose(p.key)}
                className={`press-tap border px-3 py-3 text-center font-display text-sm uppercase leading-none focus-ppp ${
                  provider === p.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(p.en, p.fr)}
              </button>
            ))}
          </div>

          {provider === "ppp_direct" && (
            <div className="mt-8 border border-border p-5">
              <div className="mb-3 inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-primary">
                {t("Coming soon", "Bientôt disponible")}
              </div>
              <h2 className="font-display text-2xl uppercase leading-none">
                {t("Live PPP Direct tracking", "Suivi PPP Direct en direct")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {t(
                  "This shows the steps a PPP Direct order moves through in the kitchen. Live order status isn't available here yet — check back soon.",
                  "Voici les étapes que suit une commande PPP Direct en cuisine. Le statut en direct n'est pas encore disponible ici — revenez bientôt.",
                )}
              </p>
              <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-5">
                {statusLadder.map((s, i) => (
                  <li
                    key={s.key}
                    className={`flex flex-col items-center gap-2 border border-border p-3 text-center ${
                      i === 0 ? "border-primary/50 bg-primary/5" : "opacity-60"
                    }`}
                  >
                    <s.icon className="h-5 w-5 text-primary" />
                    <span className="font-display text-xs uppercase leading-none">
                      {t(s.en, s.fr)}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  to="/order"
                  className="press-tap inline-flex items-center border border-border px-4 py-2.5 font-display text-sm uppercase leading-none hover:border-primary focus-ppp"
                >
                  {t("Place a PPP Direct order", "Passer une commande PPP Direct")}
                </Link>
                <CallbackSheet defaultReason="order_issue" />
              </div>
            </div>
          )}

          {provider === "phone" && (
            <div className="mt-8 border border-border p-5">
              <div className="mb-3 inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-primary">
                {t("Coming soon", "Bientôt disponible")}
              </div>
              <h2 className="font-display text-2xl uppercase leading-none">
                {t("Look up a phone order", "Consulter une commande téléphonique")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {t(
                  "Phone order lookup is coming soon. For a real-time answer on a phone order, please call the location directly.",
                  "La consultation des commandes téléphoniques arrive bientôt. Pour une réponse en temps réel sur une commande téléphonique, veuillez appeler l'établissement directement.",
                )}
              </p>
              <form onSubmit={handleLookup} className="mt-5 grid max-w-md gap-3">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder={t(
                    "Phone number used for the order",
                    "Numéro utilisé pour la commande",
                  )}
                  className="h-10 border border-border bg-background px-3 text-sm focus-ppp"
                />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("Order code", "Code de commande")}
                  className="h-10 border border-border bg-background px-3 text-sm focus-ppp"
                />
                {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
                {lookupTried && !lookupError && (
                  <p className="border border-border bg-card/50 p-3 text-xs text-muted-foreground">
                    {t(
                      "Thanks — phone order lookup isn't available yet, so we can't show a status here. Please call the location directly for an update.",
                      "Merci — la consultation des commandes téléphoniques n'est pas encore disponible, nous ne pouvons donc pas afficher d'état ici. Veuillez appeler l'établissement directement pour un suivi.",
                    )}
                  </p>
                )}
                <button
                  type="submit"
                  className="press-tap h-10 bg-primary font-display text-sm uppercase leading-none text-primary-foreground focus-ppp"
                >
                  {t("Check status", "Vérifier l'état")}
                </button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/phone-order"
                  className="press-tap inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-sm uppercase leading-none hover:border-primary focus-ppp"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  {t("Phone ordering info", "Infos pour commander par téléphone")}
                </Link>
                <CallbackSheet defaultReason="order_issue" />
              </div>
            </div>
          )}

          {(provider === "uber_eats" || provider === "doordash" || provider === "skip") && (
            <div className="mt-8 border border-border p-5">
              <h2 className="font-display text-2xl uppercase leading-none">
                {t("Tracked on ", "Suivie sur ")}
                {marketplaceMeta[provider].labelEn}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {t(
                  `Orders placed on ${marketplaceMeta[provider].labelEn} are tracked entirely in that app or on its website — PPP does not have access to live status for marketplace orders.`,
                  `Les commandes passées sur ${marketplaceMeta[provider].labelFr} sont suivies entièrement dans cette application ou sur son site — PPP n'a pas accès à l'état en direct des commandes de plateformes tierces.`,
                )}
              </p>
              <a
                href={marketplaceMeta[provider].appUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackExternalOrder(provider, location.id, "/track")}
                className="press-tap mt-5 inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-sm uppercase leading-none hover:border-primary focus-ppp"
              >
                {t(
                  `Open ${marketplaceMeta[provider].labelEn} orders`,
                  `Ouvrir les commandes ${marketplaceMeta[provider].labelFr}`,
                )}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {!provider && (
            <p className="mt-8 max-w-xl text-sm text-muted-foreground">
              {t(
                "Pick an option above to continue, or leave it here if you'd rather call the location directly.",
                "Choisissez une option ci-dessus pour continuer, ou arrêtez-vous ici si vous préférez appeler l'établissement directement.",
              )}
            </p>
          )}
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
