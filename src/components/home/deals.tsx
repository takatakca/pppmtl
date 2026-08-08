import { ArrowUpRight } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";

/** Promotional billboard — one hero deal, the rest as a dense strip. */
export function Deals() {
  const { lang, mode, locationId, openSearch, openOrderSheet, t } = usePPP();
  const offers = menuRepository.getOffers(locationId, mode);
  if (offers.length === 0) return null;

  const [lead, ...rest] = offers;

  return (
    <section id="deals" className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <h2 className="font-display text-4xl uppercase leading-none sm:text-6xl">
          {t("Deals right now", "Offres du moment")}
        </h2>
        <button
          onClick={openOrderSheet}
          className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
        >
          {t("Order now", "Commander")}
        </button>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[1.5fr_1fr]">
        {lead && (
          <button
            onClick={() => openSearch(lang === "fr" ? lead.titleFr : lead.titleEn)}
            className="group relative overflow-hidden border border-border text-left focus-ppp"
          >
            <img
              src={lead.image}
              alt=""
              loading="lazy"
              className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105 lg:h-[26rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              {lead.price !== null && (
                <p className="font-display text-6xl leading-none text-flame lg:text-8xl">
                  ${lead.price.toFixed(2)}
                </p>
              )}
              <p className="mt-1 font-display text-3xl uppercase leading-none lg:text-5xl">
                {lang === "fr" ? lead.titleFr : lead.titleEn}
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {lang === "fr" ? lead.descriptionFr : lead.descriptionEn}
              </p>
            </div>
          </button>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {rest.map((offer) => (
            <button
              key={offer.id}
              onClick={() => openSearch(lang === "fr" ? offer.titleFr : offer.titleEn)}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-border bg-card p-3 text-left transition-colors hover:border-primary focus-ppp lg:h-full"
            >
              <span className="min-w-0">
                <span className="block font-display text-2xl uppercase leading-none">
                  {lang === "fr" ? offer.titleFr : offer.titleEn}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {lang === "fr" ? offer.descriptionFr : offer.descriptionEn}
                </span>
                {offer.price !== null && (
                  <span className="mt-1.5 block font-display text-3xl leading-none text-flame">
                    ${offer.price.toFixed(2)}
                  </span>
                )}
              </span>
              <span className="relative h-24 w-24 shrink-0 overflow-hidden">
                <img
                  src={offer.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <ArrowUpRight className="absolute right-1 top-1 h-4 w-4 text-primary-foreground" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
