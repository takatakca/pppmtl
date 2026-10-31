import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";
import type { CheckoutTotals } from "@/lib/pricing";
import { cardClass, cardTitleClass } from "./styles";

export interface SummaryLine {
  id: string;
  quantity: number;
  name: string;
  options: string[];
  instructions: string;
  /** Dollars for the line, or null when the item has no published price. */
  price: number | null;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function OrderSummary({
  lines,
  totals,
  delivery,
  hasUnpriced,
  children,
}: {
  lines: SummaryLine[];
  totals: CheckoutTotals;
  delivery: boolean;
  /** Some lines have no published price: the total is a minimum. */
  hasUnpriced: boolean;
  /** The "Place order" button and messages. */
  children: ReactNode;
}) {
  const { t } = usePPP();
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <aside className={`${cardClass} lg:sticky lg:top-24`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={cardTitleClass}>{t("Your order", "Votre commande", "Tu pedido")}</h2>
        <Link
          to="/order"
          className="text-xs uppercase tracking-widest text-muted-foreground underline-offset-4 hover:underline focus-ppp"
        >
          {t("Edit", "Modifier", "Editar")}
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          `${count} item${count > 1 ? "s" : ""}`,
          `${count} article${count > 1 ? "s" : ""}`,
          `${count} artículo${count > 1 ? "s" : ""}`,
        )}
      </p>

      <ul className="mt-4 max-h-[40vh] space-y-3 overflow-auto pr-1">
        {lines.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 gap-3">
              <span className="flex h-6 min-w-6 items-center justify-center border border-border px-1 text-xs font-bold">
                {l.quantity}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{l.name}</span>
                {l.options.length > 0 && (
                  <span className="block text-xs text-muted-foreground">
                    {l.options.join(" · ")}
                  </span>
                )}
                {l.instructions && (
                  <span className="block text-xs text-muted-foreground">“{l.instructions}”</span>
                )}
              </span>
            </span>
            <span className="shrink-0 text-sm">
              {l.price === null
                ? t("See price", "Voir le prix", "Ver precio")
                : `$${l.price.toFixed(2)}`}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
        <Row label={t("Subtotal", "Sous-total", "Subtotal")} value={money(totals.subtotal)} />
        {delivery && (
          <Row
            label={t("Delivery fee", "Frais de livraison", "Envío")}
            value={money(totals.deliveryFee)}
          />
        )}
        <Row
          label={t("Taxes (TPS + TVQ)", "Taxes (TPS + TVQ)", "Impuestos (TPS + TVQ)")}
          value={money(totals.taxes)}
        />
        <Row label={t("Tip", "Pourboire", "Propina")} value={money(totals.tip)} />
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-display text-xl uppercase leading-none">
            {t("Total", "Total", "Total")}
          </dt>
          <dd className="font-display text-3xl leading-none">
            {money(totals.total)}
            {hasUnpriced ? "+" : ""}
          </dd>
        </div>
      </dl>

      <div className="mt-5">{children}</div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
