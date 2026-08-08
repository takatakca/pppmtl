import { useEffect, useState } from "react";
import { Bike, MapPin, Mic, Search, ShoppingBag } from "lucide-react";
import heroImg from "@/assets/hero-montreal.jpg";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { track } from "@/lib/analytics";

const cravings = [
  { en: "Poutine", fr: "Poutine" },
  { en: "Chicken", fr: "Poulet" },
  { en: "Pizza", fr: "Pizza" },
  { en: "Shawarma", fr: "Shawarma" },
  { en: "Burger", fr: "Burger" },
  { en: "Combos", fr: "Combos" },
];

export function Hero() {
  const { lang, mode, setMode, openSearch, openLocationSheet, openOrderSheet, locationId, t } = usePPP();
  const location = useSelectedLocation();
  const offers = menuRepository.getOffers(locationId, mode);
  const [promo, setPromo] = useState(0);

  useEffect(() => {
    if (offers.length < 2) return undefined;
    const id = window.setInterval(() => setPromo((p) => (p + 1) % offers.length), 4200);
    return () => window.clearInterval(id);
  }, [offers.length]);

  const active = offers[promo % Math.max(offers.length, 1)];

  return (
    <section className="relative isolate overflow-hidden pt-14 lg:pt-24">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={heroImg}
          alt=""
          width={1920}
          height={1080}
          className="ken-burns h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />

      <div className="mx-auto max-w-[110rem] px-3 pb-6 pt-6 sm:px-6 lg:pb-10 lg:pt-12">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="min-w-0">
            <p className="font-display text-[0.7rem] uppercase tracking-[0.42em] text-accent">
              Notre-Dame-de-Grâce · 6280 Somerled · Montréal
            </p>
            <h1 className="mt-2 font-display text-[2.6rem] uppercase leading-[0.86] sm:text-6xl lg:text-[6.5rem]">
              {t("Order what", "Commandez ce")}
              <br />
              {t("you're", "dont vous avez")} <span className="text-flame">{t("craving", "envie")}</span>
            </h1>

            {/* Order terminal — search, voice, mode and location on first screen */}
            <div className="mt-5 max-w-2xl border border-border bg-background/85 p-2.5 backdrop-blur-xl">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex sm:items-stretch">
                <div className="grid shrink-0 grid-cols-2 border border-border">
                  {(["pickup", "delivery"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-widest transition-colors focus-ppp ${
                        mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {m === "pickup" ? <ShoppingBag className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}
                      {m === "pickup" ? t("Pickup", "Cueillette") : t("Delivery", "Livraison")}
                    </button>
                  ))}
                </div>
                <button
                  onClick={openLocationSheet}
                  className="flex min-w-0 flex-1 items-center gap-1.5 border border-border px-2.5 text-left focus-ppp"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate text-[0.65rem] font-bold uppercase tracking-widest">
                    {location?.name ?? t("Choose a location", "Choisir un emplacement")}
                  </span>
                </button>
              </div>

              <button
                onClick={() => openSearch()}
                className="mt-2 flex w-full items-center gap-3 border border-border bg-card px-3 py-3.5 text-left transition-colors hover:border-primary focus-ppp"
              >
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground sm:text-base">
                  {t("Search or say “poutine”, “taouk”…", "Cherchez ou dites « poutine », « taouk »…")}
                </span>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                  <Mic className="h-4 w-4" />
                </span>
              </button>

              <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
                {cravings.map((c) => (
                  <button
                    key={c.en}
                    onClick={() => {
                      track("quick_craving_selected", { craving: c.en });
                      openSearch(lang === "fr" ? c.fr : c.en);
                    }}
                    className="shrink-0 border border-border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-ppp"
                  >
                    {lang === "fr" ? c.fr : c.en}
                  </button>
                ))}
              </div>

              <button
                onClick={openOrderSheet}
                className="cta-glow mt-2 hidden w-full items-center justify-center bg-primary py-3.5 font-display text-2xl uppercase leading-none text-primary-foreground focus-ppp lg:flex"
              >
                {mode === "pickup" ? t("Start pickup order", "Commander en cueillette") : t("Start delivery order", "Commander en livraison")}
              </button>
            </div>
          </div>

          {/* Rotating promo panel */}
          {active && (
            <button
              onClick={() => openSearch(lang === "fr" ? active.titleFr : active.titleEn)}
              key={active.id}
              className="promo-in group relative hidden overflow-hidden border border-border text-left focus-ppp lg:block"
            >
              <img
                src={active.image}
                alt=""
                loading="lazy"
                className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent p-4">
                <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">
                  {t("Featured", "En vedette")}
                </p>
                <p className="font-display text-3xl uppercase leading-none">
                  {lang === "fr" ? active.titleFr : active.titleEn}
                </p>
                {active.price !== null && (
                  <p className="mt-1 font-display text-2xl leading-none text-flame">
                    ${active.price.toFixed(2)}
                  </p>
                )}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Promo ticker */}
      <div className="overflow-hidden border-y border-border bg-primary">
        <div className="marquee-track flex w-max gap-10 py-1.5">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex gap-10">
              {[
                t("$15.99 combos every day", "Combos à 15,99 $ tous les jours"),
                t("Order ahead · skip the line", "Commandez à l'avance · évitez la file"),
                t("Rotisserie · Pizza · Poutine", "Rôtisserie · Pizza · Poutine"),
                t("Points on every direct order", "Des points sur chaque commande directe"),
              ].map((msg) => (
                <span
                  key={msg}
                  className="whitespace-nowrap font-display text-sm uppercase tracking-[0.3em] text-primary-foreground"
                >
                  {msg}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}