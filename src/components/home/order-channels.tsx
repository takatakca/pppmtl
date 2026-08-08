import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { track } from "@/lib/analytics";

export function OrderChannels() {
  const { t } = usePPP();
  const location = useSelectedLocation();
  const channels = location?.channels ?? [];

  if (channels.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="-mt-12 rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="px-1 text-xs uppercase tracking-widest text-muted-foreground">
          {t("Order where you like", "Commandez où vous voulez")}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => track("order_started", { channel: c.id })}
              className={`rounded-xl border p-4 text-left transition-transform hover:-translate-y-1 focus-ppp ${
                c.kind === "direct" ? "border-primary bg-secondary" : "border-border bg-background"
              }`}
            >
              <p className="font-display text-lg uppercase leading-none">{c.label}</p>
              <p className="mt-1.5 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                {c.kind === "direct"
                  ? t("Best price", "Meilleur prix")
                  : c.kind === "surplus"
                    ? t("Surprise bags", "Paniers surprises")
                    : t("Delivery", "Livraison")}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}