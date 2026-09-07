import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, CheckCircle2, PackageCheck, Receipt } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { usePPP } from "@/context/ppp-store";
import { orderingIntegration, type PlacedOrder } from "@/lib/integration";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders | PPP Pizzeria NDG" },
      {
        name: "description",
        content:
          "Follow your PPP Pizzeria orders — preparing, ready and completed — from the Notre-Dame-de-Grâce kitchen.",
      },
      { property: "og:title", content: "My Orders | PPP Pizzeria NDG" },
      { property: "og:description", content: "Follow your PPP Pizzeria orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: canonicalUrl("/orders") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/orders") }],
  }),
  component: OrdersPage,
});

const STAGES = [
  { id: "preparing", icon: ChefHat },
  { id: "ready", icon: PackageCheck },
  { id: "completed", icon: CheckCircle2 },
] as const;

function OrdersPage() {
  const { t, lang } = usePPP();
  const [orders, setOrders] = useState<PlacedOrder[] | null>(null);
  const status = orderingIntegration.customerOrders.status();

  useEffect(() => {
    let alive = true;
    void orderingIntegration.customerOrders.listOrders().then((list) => {
      if (alive) setOrders(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const stageLabel = (id: (typeof STAGES)[number]["id"]) =>
    id === "preparing"
      ? t("Preparing", "En préparation", "En preparación")
      : id === "ready"
        ? t("Ready", "Prête", "Lista")
        : t("Completed", "Terminée", "Completado");

  return (
    <div className="min-h-dvh bg-background">
      <PPPHeader />
      <main className="mx-auto max-w-4xl px-4 pt-20 pb-24 sm:px-6 lg:pt-28">
        <h1 className="font-display text-3xl uppercase leading-none sm:text-5xl">
          {t("My orders", "Mes commandes", "Mis pedidos")}
        </h1>

        <ol className="stagger mt-6 grid gap-2 sm:grid-cols-3">
          {STAGES.map(({ id, icon: Icon }) => (
            <li key={id} className="border border-border p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-display text-lg uppercase leading-none">{stageLabel(id)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {id === "preparing" &&
                  t(
                    "The kitchen has your order.",
                    "La cuisine a votre commande.",
                    "La cocina tiene tu pedido.",
                  )}
                {id === "ready" &&
                  t(
                    "Ready for pickup or on its way.",
                    "Prête pour la cueillette ou en route.",
                    "Lista para recoger o en camino.",
                  )}
                {id === "completed" &&
                  t(
                    "Enjoy — see you soon.",
                    "Bon appétit — à bientôt.",
                    "Buen provecho — hasta pronto.",
                  )}
              </p>
            </li>
          ))}
        </ol>

        {orders && orders.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="border border-border p-4">
                <p className="font-display text-lg uppercase leading-none">#{o.id}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  {stageLabel(
                    o.status === "completed"
                      ? "completed"
                      : o.status === "ready"
                        ? "ready"
                        : "preparing",
                  )}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 border border-dashed border-border p-10 text-center">
            <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-2xl uppercase leading-none">
              {t("No orders yet", "Aucune commande", "Sin pedidos todavía")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "fr" ? status.reasonFr : status.reasonEn}
            </p>
            <Link
              to="/order"
              className="mt-5 inline-block bg-primary px-6 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Start an order", "Commencer une commande", "Empezar un pedido")}
            </Link>
          </div>
        )}
      </main>
      <PPPFooter />
    </div>
  );
}
