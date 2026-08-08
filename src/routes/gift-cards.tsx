import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gift, Mail, Store, Check } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { usePPP } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";

export const Route = createFileRoute("/gift-cards")({
  head: () => ({
    meta: [
      { title: "PPP Gift Cards | Notre-Dame-de-Grâce, Montréal" },
      {
        name: "description",
        content:
          "Send a PPP Pizzeria NDG gift card by email or pick one up in store at 6280 Av. Somerled. Chicken, pizza and poutine for someone who deserves it.",
      },
      { property: "og:title", content: "PPP Gift Cards | NDG Montréal" },
      {
        property: "og:description",
        content: "Digital or in-store gift cards from PPP Pizzeria Notre-Dame-de-Grâce.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/gift-cards" }],
  }),
  component: GiftCards,
});

const AMOUNTS = [25, 50, 75, 100, 150];

function GiftCards() {
  const { t } = usePPP();
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const value = custom ? Number(custom) || 0 : amount;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[110rem] px-3 py-6 sm:px-6 sm:py-12">
            <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              <Gift className="h-3.5 w-3.5" />
              {t("PPP gift cards", "Cartes-cadeaux PPP")}
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase leading-none sm:text-7xl">
              {t("Give the whole kitchen", "Offrez toute la cuisine")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              {t(
                "Chicken, pizza, poutine, shawarma — one card, every category on the PPP NDG menu.",
                "Poulet, pizza, poutine, shawarma — une carte, toutes les catégories du menu PPP NDG.",
              )}
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-[110rem] gap-6 px-3 py-6 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-12">
          {/* Card preview */}
          <div className="min-w-0">
            <div className="relative aspect-[16/10] w-full overflow-hidden border border-border bg-[oklch(0.16_0_0)]">
              <span
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.55_0.22_25/0.45),transparent_60%)]"
              />
              <div className="relative flex h-full flex-col justify-between p-5 sm:p-8">
                <div className="flex items-center gap-2">
                  <span className="bg-primary px-2 py-1 font-display text-xl leading-none text-primary-foreground">
                    PPP
                  </span>
                  <span className="font-display text-xl uppercase leading-none tracking-wide">
                    NDG MTL
                  </span>
                </div>
                <div>
                  <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                    {t("Gift card value", "Valeur de la carte")}
                  </p>
                  <p className="font-display text-5xl leading-none text-flame sm:text-7xl">
                    ${value.toFixed(2)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                    {to ? t(`For ${to}`, `Pour ${to}`) : pppBusiness.address.street}
                  </p>
                </div>
              </div>
            </div>

            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                {
                  Icon: Mail,
                  title: t("Emailed instantly", "Envoyée par courriel"),
                  body: t("Delivered the moment you send it.", "Livrée dès l'envoi."),
                },
                {
                  Icon: Store,
                  title: t("Works in store", "Valide en restaurant"),
                  body: t("Pickup, delivery or dine-in.", "Cueillette, livraison ou sur place."),
                },
                {
                  Icon: Check,
                  title: t("Never expires", "Sans expiration"),
                  body: t("Balance stays on the card.", "Le solde reste sur la carte."),
                },
              ].map((f) => (
                <li key={f.title} className="border border-border bg-card p-3">
                  <f.Icon className="h-4 w-4 text-primary" />
                  <p className="mt-1.5 font-display text-sm uppercase leading-none">{f.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Purchase form (frontend prototype) */}
          <div className="min-w-0 border border-border bg-card p-4 sm:p-6">
            <h2 className="font-display text-2xl uppercase leading-none">
              {t("Send a gift card", "Envoyer une carte-cadeau")}
            </h2>

            <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {t("Amount", "Montant")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAmount(a);
                    setCustom("");
                  }}
                  className={`press-tap border px-4 py-2 font-display text-lg leading-none transition-colors focus-ppp ${
                    !custom && amount === a
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ${a}
                </button>
              ))}
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder={t("Other", "Autre")}
                aria-label={t("Custom amount", "Montant personnalisé")}
                className="w-24 border border-border bg-background px-3 py-2 text-sm focus-ppp"
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  {t("Recipient name", "Nom du destinataire")}
                </span>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1.5 w-full border border-border bg-background px-3 py-2 text-sm focus-ppp"
                />
              </label>
              <label className="block">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  {t("From", "De")}
                </span>
                <input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1.5 w-full border border-border bg-background px-3 py-2 text-sm focus-ppp"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {t("Message", "Message")}
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={200}
                className="mt-1.5 w-full resize-none border border-border bg-background px-3 py-2 text-sm focus-ppp"
              />
            </label>

            <button
              type="button"
              onClick={() => setSent(true)}
              disabled={value <= 0}
              className="mt-5 w-full bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp disabled:opacity-50"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              {t(`Continue · $${value.toFixed(2)}`, `Continuer · ${value.toFixed(2)} $`)}
            </button>

            {sent && (
              <p className="mt-3 border border-border bg-background p-3 text-xs text-muted-foreground">
                {t(
                  "Gift card checkout is not live yet. Call the restaurant to buy a card today.",
                  "Le paiement des cartes-cadeaux n'est pas encore actif. Appelez le restaurant pour en acheter une aujourd'hui.",
                )}{" "}
                <a href={pppBusiness.phone.href} className="text-accent focus-ppp">
                  {pppBusiness.phone.display}
                </a>
              </p>
            )}
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