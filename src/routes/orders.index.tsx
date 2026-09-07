import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { OrderCard } from "@/components/order/order-card";
import { usePPP } from "@/context/ppp-store";
import { useCustomerSession } from "@/lib/customer/session";
import { listMyOrders, type OrderView } from "@/lib/orders/orders.functions";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders | PPP Pizzeria" },
      {
        name: "description",
        content:
          "Follow your PPP Pizzeria orders — received, preparing, ready and completed — from the Notre-Dame-de-Grâce kitchen.",
      },
      { property: "og:title", content: "My Orders | PPP Pizzeria" },
      { property: "og:description", content: "Follow your PPP Pizzeria orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: canonicalUrl("/orders") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/orders") }],
  }),
  component: OrdersIndexPage,
});

function OrdersIndexPage() {
  const { tr, reorderToCart } = usePPP();
  const { customer } = useCustomerSession();
  const [orders, setOrders] = useState<OrderView[] | null>(null);

  useEffect(() => {
    let alive = true;
    listMyOrders({ data: { customerId: customer?.id ?? null, phone: null } })
      .then((result) => {
        if (alive) setOrders(result.orders);
      })
      .catch(() => {
        if (alive) setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, [customer?.id]);

  const handleReorder = (order: OrderView) => {
    reorderToCart(
      order.items.map((i) => ({
        itemId: i.productId,
        quantity: i.quantity,
        notes: i.notes,
        selections: i.selections,
      })),
    );
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pt-20 pb-24 sm:px-6 lg:pt-28">
      <h1 className="font-display text-3xl uppercase leading-none sm:text-5xl">{tr("navigation.myOrders")}</h1>

      {orders && orders.length > 0 ? (
        <ul className="stagger mt-8 space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} onReorder={handleReorder} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 border border-dashed border-border p-10 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-display text-2xl uppercase leading-none">{tr("orders.noOrders")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{tr("orders.noOrdersBody")}</p>
          <Link
            to="/order"
            className="mt-5 inline-block bg-primary px-6 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
          >
            {tr("orders.startOrder")}
          </Link>
        </div>
      )}
    </main>
  );
}
