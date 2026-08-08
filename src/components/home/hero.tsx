import { Link } from "@tanstack/react-router";
import { Bike, MapPin, Mic, Search, ShoppingBag, Star } from "lucide-react";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { getDiscountedItems } from "@/lib/promotions";
import { localizedName } from "@/lib/search";
import { ProductImage } from "@/components/order/product-image";
import { track } from "@/lib/analytics";
import { pppBusiness } from "@/config/business";

const cravings = [
  { en: "Poutine", fr: "Poutine" },
  { en: "Chicken", fr: "Poulet" },
  { en: "Pizza", fr: "Pizza" },
  { en: "Shawarma", fr: "Shawarma" },
  { en: "Burger", fr: "Burger" },
  { en: "Combos", fr: "Combos" },
];

export function Hero() {
  const { lang, mode, setMode, openSearch, openLocationSheet, locationId, t } = usePPP();
  const location = useSelectedLocation();
  const showcase = menuRepository.getPopularItems(locationId, 4);
  const topDeal = getDiscountedItems(locationId, 1)[0];
  const itemCount = menuRepository.getItems(locationId).length;

  return (
    <section className="relative isolate overflow-hidden border-b border-border pt-14 lg:pt-24">
      <div className="mx-auto max-w-[110rem] px-3 pb-5 pt-5 sm:px-6 lg:pb-8 lg:pt-8">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-[0.65rem] uppercase tracking-[0.35em] text-accent">
              <span>{pppBusiness.neighbourhood} · 6280 Somerled</span>
              {pppBusiness.googleProfile.rating != null && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3 w-3 fill-current text-accent" />
                  {pppBusiness.googleProfile.rating.toFixed(1)}
                </span>
              )}
            </p>
            <h1 className="mt-2 font-display text-[2.9rem] uppercase leading-[0.84] sm:text-7xl lg:text-[6rem]">
              {t("Chicken. Pizza.", "Poulet. Pizza.")}
              <br />
              <span className="text-flame">{t("Poutine.", "Poutine.")}</span>{" "}
              {t("Ready fast.", "Prêt vite.")}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {t(
                `Order pickup or delivery from our Notre-Dame-de-Grâce kitchen — ${itemCount} items on the menu.`,
                `Commandez en cueillette ou en livraison de notre cuisine de Notre-Dame-de-Grâce — ${itemCount} articles au menu.`,
              )}
            </p>

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
                  {t(
                    "Search or say “poutine”, “taouk”…",
                    "Cherchez ou dites « poutine », « taouk »…",
                  )}
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

              <Link
                to="/order"
                className="cta-glow press-tap mt-2 flex w-full items-center justify-center bg-primary py-3.5 font-display text-2xl uppercase leading-none text-primary-foreground focus-ppp"
              >
                {mode === "pickup"
                  ? t("Start pickup order", "Commander en cueillette")
                  : t("Start delivery order", "Commander en livraison")}
              </Link>
            </div>
          </div>

          {/* Food-first showcase — real menu items, real prices */}
          <div className="grid grid-cols-2 gap-2">
            {showcase.map((item, i) => (
              <Link
                key={item.id}
                to="/order"
                search={{ item: item.id }}
                className={`press-tap group relative block overflow-hidden border border-border focus-ppp ${
                  i === 0 ? "col-span-2" : ""
                }`}
              >
                <ProductImage
                  src={item.image}
                  alt={localizedName(item, lang)}
                  className={i === 0 ? "h-40 w-full lg:h-56" : "h-28 w-full lg:h-36"}
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="line-clamp-2 block font-display text-lg uppercase leading-tight lg:text-2xl">
                    {localizedName(item, lang)}
                  </span>
                  {item.price !== null && (
                    <span className="mt-0.5 block font-display text-xl leading-none text-flame">
                      ${item.price.toFixed(2)}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Promo ticker */}
      <div className="overflow-hidden border-t border-border bg-primary">
        <div className="marquee-track flex w-max gap-10 py-1.5">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex gap-10">
              {[
                topDeal
                  ? t(
                      `${localizedName(topDeal.item, "en")} — ${topDeal.percent}% off`,
                      `${localizedName(topDeal.item, "fr")} — ${topDeal.percent} % de rabais`,
                    )
                  : t("Fresh every day", "Frais tous les jours"),
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
