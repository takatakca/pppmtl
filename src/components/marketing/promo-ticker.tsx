import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { getDiscountedItems } from "@/lib/promotions";
import { localizedName } from "@/lib/search";

/**
 * Thin animated marquee of real, currently configured deals. Pausable and
 * fully static under prefers-reduced-motion (handled globally by .marquee-track).
 */
export function PromoTicker() {
  const { lang, locationId, t } = usePPP();
  const [paused, setPaused] = useState(false);
  const deals = getDiscountedItems(locationId, 6);

  const messages =
    deals.length > 0
      ? deals.map((d) =>
          t(
            `${localizedName(d.item, "en")} — ${d.percent}% off`,
            `${localizedName(d.item, "fr")} — ${d.percent} % de rabais`,
          ),
        )
      : [t("Fresh every day · order ahead", "Frais tous les jours · commandez à l'avance")];

  messages.push(
    t("Order ahead · skip the line", "Commandez à l'avance · évitez la file"),
    t("Points on every direct order", "Des points sur chaque commande directe"),
  );

  return (
    <div className="ticker relative flex items-center overflow-hidden border-b border-border bg-primary">
      <div className="no-scrollbar flex-1 overflow-hidden">
        <div
          className="marquee-track flex w-max gap-10 py-1.5"
          style={paused ? { animationPlayState: "paused" } : undefined}
        >
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex gap-10">
              {messages.map((msg, i) => (
                <span
                  key={`${dup}-${i}`}
                  className="whitespace-nowrap font-display text-[0.7rem] uppercase tracking-[0.3em] text-primary-foreground"
                >
                  {msg}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? t("Play promo ticker", "Lancer le bandeau") : t("Pause promo ticker", "Mettre en pause")}
        aria-pressed={paused}
        className="press-tap flex shrink-0 items-center justify-center border-l border-primary-foreground/20 bg-primary px-2.5 py-1.5 text-primary-foreground focus-ppp"
      >
        {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
      </button>
    </div>
  );
}
