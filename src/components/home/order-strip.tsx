import { Bike, Phone, ShoppingBag, Sparkles } from "lucide-react";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { orderChannels } from "@/lib/channels";

/**
 * Direct ordering dominates; marketplaces are a compact secondary row so the
 * customer always sees PPP's own channel first.
 */
export function OrderStrip() {
  const { mode, setMode, openOrderSheet, openSearch, t } = usePPP();
  const location = useSelectedLocation();
  const channels = orderChannels(location, mode);
  const phone = channels.find((c) => c.id === "phone");
  const secondary = channels.filter((c) => c.kind === "marketplace" || c.kind === "surplus");

  return (
    <section id="order" className="mx-auto max-w-[110rem] px-3 py-8 sm:px-6">
      <div className="grid gap-2 lg:grid-cols-[1.6fr_1fr]">
        <div className="border border-border bg-card p-4 lg:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h2 className="min-w-0 font-display text-3xl uppercase leading-none lg:text-5xl">
              {t("Order direct. Skip the line.", "Commandez direct. Évitez la file.")}
            </h2>
            <Sparkles className="hidden h-6 w-6 shrink-0 text-accent sm:block" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="grid grid-cols-2 border border-border">
              {(["pickup", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 text-[0.65rem] font-bold uppercase tracking-widest transition-colors focus-ppp ${
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m === "pickup" ? (
                    <ShoppingBag className="h-3.5 w-3.5" />
                  ) : (
                    <Bike className="h-3.5 w-3.5" />
                  )}
                  {m === "pickup" ? t("Pickup", "Cueillette") : t("Delivery", "Livraison")}
                </button>
              ))}
            </div>
            <button
              onClick={() => openSearch()}
              className="bg-primary px-6 py-3 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Start your order", "Démarrer la commande")}
            </button>
          </div>
          {phone?.href && (
            <a
              href={phone.href}
              className="mt-2 inline-flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground focus-ppp"
            >
              <Phone className="h-3.5 w-3.5 text-primary" />
              {t("Or call the restaurant", "Ou appelez le restaurant")}
            </a>
          )}
        </div>

        <div className="border border-border p-4 lg:p-6">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {t("Also available on", "Aussi disponible sur")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {secondary.map((c) => (
              <button
                key={c.id}
                onClick={openOrderSheet}
                className="border border-border px-3 py-3 text-left text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-ppp"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
