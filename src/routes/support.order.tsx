import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Receipt, Search } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { restaurantLocations } from "@/config/locations";
import { canonicalUrl } from "@/config/site";
import { listMyOrders, type OrderView } from "@/lib/orders/orders.functions";

export const Route = createFileRoute("/support/order")({
  head: () => ({
    meta: [
      { title: "Order help | PPP Pizzeria Montréal" },
      {
        name: "description",
        content:
          "Look up a PPP order with your phone number and order number, or reach the restaurant directly for immediate help.",
      },
      { property: "og:title", content: "PPP order help" },
      {
        property: "og:description",
        content: "Find your PPP order or reach the restaurant directly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/support/order") }],
  }),
  component: OrderSupportPage,
});

function OrderSupportPage() {
  const { t, lang } = usePPP();
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [found, setFound] = useState<OrderView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const store = restaurantLocations.find((l) => l.lifecycleStatus === "open");

  const lookup = async () => {
    setLoading(true);
    setFound(null);
    setNotFound(false);
    try {
      const digits = phone.replace(/\D/g, "");
      const result = await listMyOrders({ data: { customerId: null, phone: digits } });
      const match = result.orders.find(
        (o) =>
          o.orderNumber?.toLowerCase() === orderNumber.trim().toLowerCase() ||
          o.id.toLowerCase().endsWith(orderNumber.trim().toLowerCase()),
      );
      if (match) {
        setFound(match);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pt-14 lg:pt-24">
      <section className="border-b border-border bg-gradient-to-b from-card/60 to-background">
        <div className="mx-auto max-w-[80rem] px-3 py-10 sm:px-6 sm:py-16">
          <p className="flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            <Receipt className="h-3.5 w-3.5" />
            {t("Order help", "Aide commande", "Ayuda con el pedido")}
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl uppercase leading-[0.9] sm:text-6xl">
            {t("Find your", "Trouvez votre", "Encuentre su")}{" "}
            <span className="text-flame">{t("order", "commande", "pedido")}</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            {t(
              "Enter the phone number used for the order and your order number.",
              "Entrez le numéro de téléphone utilisé pour la commande et votre numéro de commande.",
              "Ingrese el teléfono usado en el pedido y su número de pedido.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[40rem] px-3 py-8 sm:px-6">
        <div className="grid gap-3">
          <label className="text-sm">
            {t("Phone number", "Numéro de téléphone", "Número de teléfono")}
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border border-border bg-card px-3 py-3 text-base"
              placeholder="514 000 0000"
            />
          </label>
          <label className="text-sm">
            {t("Order number", "Numéro de commande", "Número de pedido")}
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="mt-1 w-full border border-border bg-card px-3 py-3 text-base"
              placeholder="PPP-000000"
            />
          </label>
          <button
            type="button"
            onClick={lookup}
            disabled={phone.trim().length < 7 || orderNumber.trim().length < 3 || loading}
            className="lift-btn flex items-center justify-center gap-2 bg-primary px-5 py-3 font-display text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {t("Find my order", "Trouver ma commande", "Buscar mi pedido")}
          </button>
        </div>

        {found && (
          <div className="mt-4 border border-border bg-card p-4">
            <p className="font-display text-lg uppercase leading-none">
              {t("Found it", "Trouvée", "Encontrado")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Order", "Commande", "Pedido")} #{found.orderNumber ?? found.id} ·{" "}
              {new Date(found.createdAt).toLocaleDateString(
                lang === "fr" ? "fr-CA" : lang === "es" ? "es" : "en-CA",
              )}
            </p>
            <Link
              to="/orders/$orderId"
              params={{ orderId: found.id }}
              className="mt-3 inline-block bg-primary px-5 py-3 font-display text-sm uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("View receipt", "Voir le reçu", "Ver recibo")}
            </Link>
          </div>
        )}

        {notFound && (
          <p className="mt-4 border border-border bg-card p-4 text-sm text-muted-foreground">
            {t(
              "We could not find that order online. Call the restaurant with your order number and we will find it right away.",
              "Nous n'avons pas trouvé cette commande en ligne. Appelez le restaurant avec votre numéro de commande et nous la retrouverons tout de suite.",
              "No encontramos ese pedido en línea. Llame al restaurante con su número de pedido y lo encontraremos enseguida.",
            )}
          </p>
        )}

        <div className="mt-6 border border-border bg-card p-4">
          <p className="font-display text-lg uppercase leading-none">
            {t("Talk to the restaurant", "Parler au restaurant", "Hable con el restaurante")}
          </p>
          {store?.phone && (
            <a
              href={`tel:${store.phone.e164}`}
              className="mt-2 inline-flex items-center gap-2 text-sm text-flame"
            >
              <Phone className="h-4 w-4" />
              {store.phone.display}
            </a>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {t(
              "Ordered on Uber Eats, DoorDash or SkipTheDishes? Those orders are tracked in that app.",
              "Commandé sur Uber Eats, DoorDash ou SkipTheDishes? Ces commandes se suivent dans l'application utilisée.",
              "¿Pidió por Uber Eats, DoorDash o SkipTheDishes? Esos pedidos se siguen en esa aplicación.",
            )}
          </p>
          <Link to="/support" className="mt-3 inline-block text-sm underline">
            {t("Other help topics", "Autres sujets d'aide", "Otros temas de ayuda")}
          </Link>
        </div>
      </section>
    </main>
  );
}
