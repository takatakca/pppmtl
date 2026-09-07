import { useEffect, useState } from "react";
import { CheckCircle2, ChefHat, Clock, PackageCheck, ShoppingBag, XCircle } from "lucide-react";
import type { OrderStatus } from "@/lib/orders/types";
import { isTerminalOrderStatus } from "@/lib/orders/types";
import { usePPP } from "@/context/ppp-store";

interface TimelineStep {
  key: "received" | "confirmed" | "preparing" | "ready" | "completed";
  icon: React.ElementType;
  matches: OrderStatus[];
}

const STEPS: TimelineStep[] = [
  { key: "received", icon: ShoppingBag, matches: ["CREATED", "SUBMITTED"] },
  { key: "confirmed", icon: CheckCircle2, matches: ["ACCEPTED"] },
  { key: "preparing", icon: ChefHat, matches: ["PREPARING"] },
  { key: "ready", icon: PackageCheck, matches: ["READY"] },
  { key: "completed", icon: Clock, matches: ["COMPLETED"] },
];

function stepIndex(status: OrderStatus): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i]!.matches.includes(status)) return i;
  }
  return -1;
}

export function OrderTimeline({
  status,
  compact = false,
}: {
  status: OrderStatus;
  compact?: boolean;
}) {
  const { tr, t } = usePPP();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (status === "CANCELLED" || status === "FAILED") {
    const Icon = status === "CANCELLED" ? XCircle : XCircle;
    return (
      <div className="flex items-center gap-3 border border-destructive/30 bg-destructive/5 p-4">
        <Icon className="h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="font-display text-lg uppercase leading-none text-destructive">
            {status === "CANCELLED" ? tr("orders.cancelled") : tr("orders.failed")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "This order did not reach the kitchen. Try again or call the restaurant.",
              "Cette commande n'a pas atteint la cuisine. Réessayez ou appelez le restaurant.",
              "Este pedido no llegó a la cocina. Inténtalo de nuevo o llama al restaurante.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const activeIndex = stepIndex(status);

  return (
    <div className={compact ? "" : "border border-border bg-card p-5"}>
      {!compact && (
        <p className="mb-4 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {tr("orders.track")}
        </p>
      )}
      <ol
        className={`relative flex ${compact ? "gap-1" : "justify-between gap-2"}`}
        aria-label={tr("orders.track")}
      >
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = i <= activeIndex;
          const isCurrent = i === activeIndex;
          const delay = mounted ? `${i * 90}ms` : "0ms";

          return (
            <li
              key={step.key}
              className={`relative flex flex-1 flex-col items-center text-center ${
                compact ? "min-w-0" : ""
              }`}
              style={{ transitionDelay: delay }}
            >
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <span
                  className={`absolute top-3 left-[calc(50%+1rem)] h-0.5 w-[calc(100%-2rem)] transition-colors duration-500 ${
                    i < activeIndex ? "bg-primary" : "bg-border"
                  }`}
                  aria-hidden
                />
              )}

              <span
                className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                } ${isCurrent ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background" : ""}`}
              >
                <Icon className="h-3 w-3" />
              </span>

              <span
                className={`mt-2 text-[0.6rem] font-bold uppercase tracking-widest transition-colors duration-500 ${
                  isDone ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {tr(`orders.${step.key}` as "orders.received")}
              </span>

              {!compact && (
                <span
                  className={`mt-0.5 hidden text-[0.6rem] text-muted-foreground transition-opacity duration-500 sm:block ${
                    isCurrent ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {isCurrent && tr("orders.estimatedReady")}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
