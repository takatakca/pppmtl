import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  HelpCircle,
  MapPin,
  Phone,
  ShoppingBag,
  Truck,
  UserCog,
} from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { OrderSheet } from "@/components/layout/order-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { LocationSheet } from "@/components/layout/location-sheet";
import { usePPP } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";
import { orderingChannels } from "@/config/external-presence";
import { factsForTopic, type KnowledgeTopic } from "@/knowledge";
import { trackExternalOrder, trackSupportRouted } from "@/lib/analytics";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "PPP Pizzeria Help Centre | Orders, Delivery & Account" },
      {
        name: "description",
        content:
          "Get help with a PPP Pizzeria order, delivery on Uber Eats, DoorDash or Skip, your PPP account, and questions about the menu, hours and locations.",
      },
      { property: "og:title", content: "PPP Pizzeria Help Centre" },
      {
        property: "og:description",
        content: "Order help, delivery help, account help and restaurant questions, in one place.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/help") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/help") }],
  }),
  component: HelpPage,
});

type Branch = "order" | "account" | "restaurant" | "delivery";

function HelpPage() {
  const { t, tr } = usePPP();
  const [branch, setBranch] = useState<Branch | null>(null);

  const topics: Array<{ id: Branch; icon: typeof ShoppingBag; title: string; body: string }> = [
    {
      id: "order",
      icon: ShoppingBag,
      title: tr("help.myOrder"),
      body: tr("help.myOrderBody"),
    },
    {
      id: "delivery",
      icon: Truck,
      title: tr("help.deliveryProblem"),
      body: tr("help.deliveryProblemBody"),
    },
    {
      id: "account",
      icon: UserCog,
      title: tr("help.accountHelp"),
      body: tr("help.accountHelpBody"),
    },
    {
      id: "restaurant",
      icon: HelpCircle,
      title: tr("help.restaurantQuestions"),
      body: tr("help.restaurantQuestionsBody"),
    },
  ];

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-24 sm:px-6 lg:pt-28">
        <section className="border border-border bg-primary p-6 sm:p-10">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-primary-foreground/80">
            PPP {pppBusiness.shortLocationName}
          </p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] text-primary-foreground sm:text-7xl">
            {tr("help.title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-primary-foreground/90">{tr("help.subtitle")}</p>
          <a
            href={pppBusiness.phone.href}
            onClick={() => trackSupportRouted("phone_order")}
            className="press-tap mt-5 inline-flex items-center gap-2 bg-background px-6 py-3.5 font-display text-xl uppercase leading-none focus-ppp"
          >
            <Phone className="h-4 w-4 text-primary" />
            {pppBusiness.phone.display}
          </a>
        </section>

        {branch === null ? (
          <>
            <h2 className="mt-6 font-display text-3xl uppercase leading-none">
              {tr("help.pickTopic")}
            </h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => {
                    setBranch(topic.id);
                    trackSupportRouted("general");
                  }}
                  className="lift-btn border border-border bg-card p-5 text-left focus-ppp"
                >
                  <topic.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-display text-2xl uppercase leading-none">
                    {topic.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{topic.body}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <section className="panel-in mt-6 border border-border bg-card p-5 sm:p-8">
            <button
              onClick={() => setBranch(null)}
              className="inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground focus-ppp"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {tr("help.startOver")}
            </button>

            {(branch === "order" || branch === "delivery") && (
              <>
                <h2 className="mt-4 font-display text-4xl uppercase leading-none">
                  {tr("help.whereOrdered")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                  {tr("help.thirdPartyNote")}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {orderingChannels.map((c) => (
                    <a
                      key={c.id}
                      href={branch === "delivery" ? c.supportUrl : c.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackExternalOrder(c.id)}
                      className="lift-btn flex items-center justify-between gap-3 border border-border p-4 focus-ppp"
                    >
                      <span className="font-display text-xl uppercase leading-none">{c.name}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
                    </a>
                  ))}
                  <a
                    href={pppBusiness.phone.href}
                    onClick={() => trackSupportRouted("phone_order")}
                    className="lift-btn flex items-center justify-between gap-3 border border-primary bg-primary/10 p-4 focus-ppp"
                  >
                    <span className="font-display text-xl uppercase leading-none">
                      {tr("help.callRestaurant")}
                    </span>
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                  </a>
                </div>
              </>
            )}

            {branch === "account" && (
              <>
                <h2 className="mt-4 font-display text-4xl uppercase leading-none">
                  {tr("help.accountHelp")}
                </h2>
                <KnowledgeList topic="account" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/account"
                    className="press-tap bg-primary px-6 py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
                  >
                    {t("Open My PPP", "Ouvrir Mon PPP", "Abrir Mi PPP")}
                  </Link>
                  <Link
                    to="/account/forgot-password"
                    className="press-tap border border-border px-6 py-3.5 font-display text-xl uppercase leading-none focus-ppp"
                  >
                    {t("Reset password", "Réinitialiser le mot de passe", "Restablecer contraseña")}
                  </Link>
                </div>
              </>
            )}

            {branch === "restaurant" && (
              <>
                <h2 className="mt-4 font-display text-4xl uppercase leading-none">
                  {tr("help.restaurantQuestions")}
                </h2>
                <KnowledgeList topic="menu" />
                <KnowledgeList topic="locations" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/menu"
                    className="press-tap bg-primary px-6 py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
                  >
                    {tr("navigation.fullMenu")}
                  </Link>
                  <Link
                    to="/locations"
                    className="press-tap inline-flex items-center gap-2 border border-border px-6 py-3.5 font-display text-xl uppercase leading-none focus-ppp"
                  >
                    <MapPin className="h-4 w-4 text-primary" />
                    {tr("navigation.locations")}
                  </Link>
                </div>
              </>
            )}

            <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
              {tr("help.stillStuck")}{" "}
              <a href={pppBusiness.phone.href} className="text-accent underline focus-ppp">
                {pppBusiness.phone.display}
              </a>
            </p>
          </section>
        )}

        <section className="mt-2 border border-border bg-card p-5">
          <h2 className="font-display text-3xl uppercase leading-none">
            {t("More answers", "Plus de réponses", "Más respuestas")}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/faq" className="press-tap border border-border px-5 py-3 text-sm focus-ppp">
              {tr("footer.faq")}
            </Link>
            <Link
              to="/support"
              className="press-tap border border-border px-5 py-3 text-sm focus-ppp"
            >
              {tr("navigation.support")}
            </Link>
            <Link
              to="/track"
              className="press-tap border border-border px-5 py-3 text-sm focus-ppp"
            >
              {tr("navigation.trackOrder")}
            </Link>
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

/** Renders truthful knowledge-base statements in the customer's language. */
function KnowledgeList({ topic }: { topic: KnowledgeTopic }) {
  const { lang } = usePPP();
  const facts = factsForTopic(topic);
  return (
    <ul className="mt-3 grid gap-2">
      {facts.map((f) => (
        <li key={f.id} className="border border-border p-4 text-sm text-muted-foreground">
          {lang === "fr" ? f.fr : lang === "es" ? f.es : f.en}
        </li>
      ))}
    </ul>
  );
}
