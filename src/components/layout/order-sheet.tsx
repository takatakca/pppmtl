import { ArrowUpRight, Bike, Phone, ShoppingBag, Sparkles, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { orderChannels } from "@/lib/channels";
import { orderingChannels } from "@/config/external-presence";
import { trackExternalOrder } from "@/lib/analytics";
import { startOrder } from "@/lib/order";

/**
 * "Order your way" — one place that ranks direct ordering above every
 * marketplace, with phone ordering kept as a first-class fallback.
 */
export function OrderSheet() {
  const { orderSheetOpen, closeOrderSheet, mode, setMode, openLocationSheet, locationId, t } =
    usePPP();
  const location = useSelectedLocation();
  const navigate = useNavigate();
  if (!orderSheetOpen) return null;

  const channels = orderChannels(location, mode);
  const direct = channels.find((c) => c.id === "direct");
  const phone = channels.find((c) => c.id === "phone");

  const beginDirect = () => {
    const result = startOrder({ locationId, mode, channel: "direct" });
    if (result.status === "needs-location") {
      closeOrderSheet();
      openLocationSheet();
      return;
    }
    closeOrderSheet();
    void navigate({ to: "/order" });
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-background/85 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-label={t("Order your way", "Commandez à votre façon")}
        className="w-full max-w-xl border border-border bg-card promo-in"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl uppercase leading-none">
            {t("Order your way", "Commandez à votre façon")}
          </h2>
          <button
            onClick={closeOrderSheet}
            aria-label={t("Close", "Fermer")}
            className="border border-border p-2 focus-ppp"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="grid grid-cols-2 gap-1 border border-border p-1">
            {(["pickup", "delivery"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors focus-ppp ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "pickup" ? (
                  <ShoppingBag className="h-4 w-4" />
                ) : (
                  <Bike className="h-4 w-4" />
                )}
                {m === "pickup" ? t("Pickup", "Cueillette") : t("Delivery", "Livraison")}
              </button>
            ))}
          </div>

          <button
            onClick={beginDirect}
            className="mt-4 flex w-full items-center justify-between bg-primary px-5 py-4 text-left focus-ppp"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <span>
              <span className="block font-display text-2xl uppercase leading-none text-primary-foreground">
                {t("Order direct with PPP", "Commander direct avec PPP")}
              </span>
              <span className="mt-1 block text-xs uppercase tracking-widest text-primary-foreground/80">
                {t("Best price · earn points", "Meilleur prix · gagnez des points")}
              </span>
            </span>
            <Sparkles className="h-5 w-5 shrink-0 text-primary-foreground" />
          </button>
          {direct?.href === null && (
            <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
              {t(
                "Direct checkout opens in the PPP menu below.",
                "La commande directe s'ouvre dans le menu PPP ci-dessous.",
              )}
            </p>
          )}

          {phone?.href && (
            <a
              href={phone.href}
              className="mt-3 flex items-center gap-3 border border-border px-5 py-3.5 focus-ppp hover:border-primary"
            >
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-display text-lg uppercase leading-none">
                {t("Call the restaurant", "Appeler le restaurant")}
              </span>
            </a>
          )}

          <p className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {t("Or order with a delivery app", "Ou commandez avec une app de livraison")}
          </p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            {orderingChannels.map((c) => (
              <li key={c.id}>
                <a
                  href={c.orderingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackExternalOrder(c.id)}
                  aria-label={`${c.labelEn} — ${c.name}`}
                  className="press-tap group flex h-full flex-col gap-3 border border-border p-3 transition-all hover:-translate-y-0.5 hover:border-primary focus-ppp"
                >
                  <img
                    src={c.logo ?? ""}
                    alt={c.name}
                    className="h-8 w-auto self-start transition-transform group-hover:-translate-y-0.5"
                  />
                  <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {c.name}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
