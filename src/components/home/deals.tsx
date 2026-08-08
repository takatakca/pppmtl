import { ArrowRight } from "lucide-react";
import { offers } from "@/data/menu";
import { usePPP } from "@/context/ppp-store";
import { startOrder } from "@/lib/order";

export function Deals() {
  const { lang, locationId, mode, openLocationSheet, t } = usePPP();
  const visible = offers.filter((o) => (locationId ? o.locationIds.includes(locationId) : true));

  return (
    <section id="deals" className="border-y border-border bg-secondary/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl uppercase sm:text-5xl">
            {t("Deals worth the drive", "Des offres qui valent le détour")}
          </h2>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("Prices may vary by location", "Les prix peuvent varier selon l'emplacement")}
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {visible.map((o) => (
            <article
              key={o.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <img
                src={o.image}
                alt={lang === "fr" ? o.titleFr : o.titleEn}
                loading="lazy"
                width={1024}
                height={1024}
                className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-2xl uppercase leading-tight">
                  {lang === "fr" ? o.titleFr : o.titleEn}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">
                  {lang === "fr" ? o.descriptionFr : o.descriptionEn}
                </p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="font-display text-3xl">
                    {o.price !== null ? `$${o.price.toFixed(2)}` : t("See price", "Voir le prix")}
                  </span>
                  <button
                    onClick={() => {
                      const result = startOrder({ locationId, mode, offerId: o.id });
                      if (result.status === "needs-location") openLocationSheet();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp"
                  >
                    {t("Add to order", "Ajouter")} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}