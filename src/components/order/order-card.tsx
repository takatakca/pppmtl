import { Link } from "@tanstack/react-router";
import { RefreshCw, Receipt } from "lucide-react";
import type { OrderView } from "@/lib/orders/orders.functions";
import { statusLabel } from "@/lib/orders/status-mapping";
import { usePPP } from "@/context/ppp-store";
import { OrderTimeline } from "./order-timeline";

export function OrderCard({
  order,
  onReorder,
}: {
  order: OrderView;
  onReorder?: (order: OrderView) => void;
}) {
  const { lang, t, tr } = usePPP();

  const date = new Date(order.createdAt).toLocaleDateString(
    lang === "fr" ? "fr-CA" : lang === "es" ? "es" : "en-CA",
    { month: "short", day: "numeric" },
  );

  const displayNumber = order.orderNumber ?? order.id;

  return (
    <article className="panel-in border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <p className="font-display text-2xl uppercase leading-none">#{displayNumber}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {statusLabel(order.status, lang)} · {date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/orders/$orderId"
            params={{ orderId: order.id }}
            className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-[0.65rem] font-bold uppercase tracking-widest focus-ppp hover:border-primary"
          >
            <Receipt className="h-3.5 w-3.5" />
            {tr("orders.viewReceipt")}
          </Link>
          {onReorder && (
            <button
              type="button"
              onClick={() => onReorder(order)}
              className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-[0.65rem] font-bold uppercase tracking-widest focus-ppp hover:border-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {tr("orders.reorder")}
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <OrderTimeline status={order.status} compact />
        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          {order.items.map((line, i) => (
            <li key={`${order.id}-${i}`}>
              <span className="font-display text-foreground">
                {line.quantity} × {line.name}
              </span>
              {line.options.length > 0 && (
                <span className="ml-1.5 text-xs">· {line.options.join(", ")}</span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-display text-base leading-none text-accent">
          ${(order.subtotal / 100).toFixed(2)}
        </p>
      </div>
    </article>
  );
}
