import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Inbox } from "lucide-react";
import { getAdminOrders, type AdminOrderRow } from "@/lib/orders/orders.functions";

/**
 * Internal order monitor. Shows exactly what the order engine holds — nothing
 * is simulated, so an empty table means no order has been attempted.
 */
export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders monitor | PPP internal" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Internal order engine monitor for PPP Pizzeria." },
      { property: "og:title", content: "Orders monitor" },
      { property: "og:description", content: "Internal order engine monitor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersAdmin,
});

const CELL = "px-3 py-2 text-left align-top";

function OrdersAdmin() {
  const [rows, setRows] = useState<AdminOrderRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminOrders()
      .then((data) => {
        if (active) setRows(data.orders);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-dvh bg-background px-4 py-10 sm:px-8">
      <header className="border border-border bg-card p-6">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          PPP internal
        </p>
        <h1 className="mt-1 font-display text-4xl uppercase leading-none">Orders monitor</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Internal order id, provider, store, status and failure reason. No provider is connected,
          so submissions end as FAILED with a reason instead of a fake order number.
        </p>
        <Link
          to="/admin/integrations"
          className="mt-4 inline-block border border-border px-4 py-2 text-xs uppercase tracking-widest focus-ppp"
        >
          Integrations status
        </Link>
      </header>

      {error && (
        <p className="mt-2 flex items-center gap-2 border border-border bg-card p-4 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" /> Orders could not be loaded.
        </p>
      )}

      {rows && rows.length === 0 && (
        <p className="mt-2 flex items-center gap-2 border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          <Inbox className="h-4 w-4" /> No orders in the engine.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-2 overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[52rem] text-xs">
            <thead className="border-b border-border text-[0.6rem] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className={CELL}>Order id</th>
                <th className={CELL}>Provider</th>
                <th className={CELL}>Store</th>
                <th className={CELL}>Provider order</th>
                <th className={CELL}>Status</th>
                <th className={CELL}>Payment</th>
                <th className={CELL}>Reason</th>
                <th className={CELL}>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className={CELL}>{row.orderNumber ?? row.id}</td>
                  <td className={CELL}>{row.provider}</td>
                  <td className={CELL}>
                    {row.locationId}
                    <span className="block text-muted-foreground">
                      {row.providerLocationId ?? "not mapped"}
                    </span>
                  </td>
                  <td className={CELL}>{row.providerOrderId ?? "—"}</td>
                  <td className={CELL}>
                    {row.status}
                    {row.providerStatus && (
                      <span className="block text-muted-foreground">{row.providerStatus}</span>
                    )}
                  </td>
                  <td className={CELL}>{row.paymentStatus}</td>
                  <td className={CELL}>{row.failureCode ?? "—"}</td>
                  <td className={CELL}>{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
