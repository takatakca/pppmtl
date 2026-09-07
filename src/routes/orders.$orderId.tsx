import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { OrderTimeline } from "@/components/order/order-timeline";
import { usePPP } from "@/context/ppp-store";
import { getOrderById, type OrderView } from "@/lib/orders/orders.functions";
import { statusLabel } from "@/lib/orders/status-mapping";
import { locationById } from "@/config/locations";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/orders/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Order #${params.orderId} | PPP Pizzeria` },
      { name: "robots", content: "noindex" },
      { name: "description", content: "View your PPP order receipt and live status." },
      { property: "og:title", content: `PPP Order #${params.orderId}` },
      { property: "og:description", content: "Your PPP order receipt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl(`/orders/${params.orderId}`) }],
  }),
  component: OrderReceiptPage,
});

function OrderReceiptPage() {
  const { orderId } = Route.useParams();
  const { lang, t, tr, reorderToCart } = usePPP();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    getOrderById({ data: { orderId } })
      .then((result) => {
        if (!alive) return;
        if (result.order) setOrder(result.order);
        else setError(true);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  const handleReorder = () => {
    if (!order) return;
    reorderToCart(
      order.items.map((i) => ({
        itemId: i.productId,
        quantity: i.quantity,
        notes: i.notes,
        selections: i.selections,
      })),
    );
  };

  if (error || (!order && !error)) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-24 pb-24 sm:px-6 lg:pt-32">
        <div className="border border-border bg-card p-8 text-center">
          <p className="font-display text-2xl uppercase leading-none">{tr("orders.notFound")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{tr("orders.lookupHint")}</p>
          <Link
            to="/orders"
            className="mt-5 inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-sm uppercase leading-none focus-ppp hover:border-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {tr("navigation.myOrders")}
          </Link>
        </div>
      </main>
    );
  }

  if (!order) return null;

  const location = locationById(order.locationId);
  const date = new Date(order.createdAt).toLocaleString(
    lang === "fr" ? "fr-CA" : lang === "es" ? "es" : "en-CA",
    { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" },
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 pb-24 sm:px-6 lg:pt-32">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-[0.65rem] font-bold uppercase tracking-widest focus-ppp hover:border-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {tr("navigation.myOrders")}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-[0.65rem] font-bold uppercase tracking-widest focus-ppp hover:border-primary"
        >
          <Printer className="h-4 w-4" />
          {t("Print", "Imprimer", "Imprimir")}
        </button>
      </div>

      <article className="panel-in border border-border bg-card">
        <div className="border-b border-border p-6">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {tr("orders.receipt")}
          </p>
          <h1 className="mt-2 font-display text-4xl uppercase leading-none">
            {tr("orders.orderNumber")} #{order.orderNumber ?? order.id}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusLabel(order.status, lang)} · {date}
          </p>
        </div>

        <div className="p-6">
          <OrderTimeline status={order.status} />

          <dl className="mt-6 grid gap-4 border-b border-border pb-6 sm:grid-cols-2">
            <div>
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                {t("Name", "Nom", "Nombre")}
              </dt>
              <dd className="mt-1 font-display text-xl uppercase">{order.customerName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                {order.orderType === "DELIVERY" ? tr("orders.deliveryTo") : tr("orders.pickupAt")}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {order.orderType === "DELIVERY"
                  ? (order.deliveryAddress ?? "—")
                  : (location?.displayName ?? order.locationId)}
              </dd>
            </div>
          </dl>

          <h2 className="mt-6 font-display text-xl uppercase leading-none">{tr("orders.items")}</h2>
          <ul className="mt-3 space-y-3">
            {order.items.map((line, i) => (
              <li key={`${order.id}-${i}`} className="flex justify-between gap-4">
                <div>
                  <p className="font-display text-base uppercase leading-tight">
                    {line.quantity} × {line.name}
                  </p>
                  {line.options.length > 0 && (
                    <p className="text-xs text-muted-foreground">{line.options.join(" · ")}</p>
                  )}
                  {line.notes && <p className="text-xs text-muted-foreground">“{line.notes}”</p>}
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2 border-t border-border pt-4">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">{tr("orders.subtotal")}</dt>
              <dd>${(order.subtotal / 100).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">{tr("orders.tax")}</dt>
              <dd className="text-muted-foreground">
                {t(
                  "Confirmed by the restaurant",
                  "Confirmées par le restaurant",
                  "Confirmados por el restaurante",
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-display text-xl uppercase leading-none">{tr("orders.total")}</dt>
              <dd className="font-display text-3xl leading-none">
                $
                {order.total !== null
                  ? (order.total / 100).toFixed(2)
                  : `${(order.subtotal / 100).toFixed(2)}+`}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReorder}
              className="inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-sm uppercase leading-none text-primary-foreground focus-ppp"
            >
              <RefreshCw className="h-4 w-4" />
              {tr("orders.reorder")}
            </button>
            <Link
              to="/support/order"
              className="inline-flex items-center gap-2 border border-border px-5 py-3 font-display text-sm uppercase leading-none focus-ppp hover:border-primary"
            >
              {tr("help.myOrder")}
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
