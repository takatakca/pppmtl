import { Link } from "@tanstack/react-router";
import { Bike, MapPin, Mic, Search, ShoppingBag, Star } from "lucide-react";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { getDiscountedItems } from "@/lib/promotions";
import { localizedName } from "@/lib/search";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { orderSearch } from "@/lib/order-links";
import { track } from "@/lib/analytics";
import { pppBusiness } from "@/config/business";
import { usePointerDepth } from "@/components/motion/reveal";

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
  const { containerRef, layer } = usePointerDepth(14);
  const showcase = menuRepository.getPopularItems(locationId, 3);
  const topDeal = getDiscountedItems(locationId, 1)[0];
  const itemCount = menuRepository.getItems(locationId).length;
  const [starA, starB, starC] = showcase;

  return (
    <section
      ref={containerRef}
      className="relative isolate overflow-hidden border-b border-border pt-14 lg:pt-24"
    >
      <span
        aria-hidden
        className="night-grain pointer-events-none absolute inset-0 opacity-70"
      />
      <span
        aria-hidden
        className="red-light pointer-events-none absolute -left-32 top-1/3 h-[26rem] w-[26rem]"
      />
      {/* Campaign plane — angled red field behind the product composition */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] bg-primary/90 lg:block"
        style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-14 h-40 bg-primary/25 blur-3xl lg:hidden"
      />

      <div className="relative mx-auto max-w-[110rem] px-3 pb-4 pt-4 sm:px-6 lg:pb-10 lg:pt-8">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
          <div className="min-w-0">
            <p className="rise-in flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              <span>{pppBusiness.neighbourhood} · 6280 Somerled</span>
              {pppBusiness.googleProfile.rating != null && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Star className="h-3 w-3 fill-current text-accent" />
                  {pppBusiness.googleProfile.rating.toFixed(1)}
                </span>
              )}
            </p>
            <h1
              className="mt-1.5 font-display text-[2.6rem] uppercase leading-[0.82] sm:text-7xl lg:text-[6rem]"
            >
              <span className="line-rise block" style={{ animationDelay: "60ms" }}>
                {t("Chicken. Pizza.", "Poulet. Pizza.")}
              </span>
              <span className="line-rise block" style={{ animationDelay: "170ms" }}>
                <span className="text-flame">{t("Poutine.", "Poutine.")}</span>{" "}
                {t("Ready fast.", "Prêt vite.")}
              </span>
            </h1>
            <p
              className="line-rise mt-1.5 max-w-xl text-xs text-muted-foreground sm:text-sm"
              style={{ animationDelay: "280ms" }}
            >
              {t(
                `Pickup or delivery from our NDG kitchen — ${itemCount} items.`,
                `Cueillette ou livraison de notre cuisine NDG — ${itemCount} articles.`,
              )}
            </p>

            {/* Mobile campaign strip — real product, real price, no wasted height */}
            {topDeal && (
              <Link
                to="/order"
                search={orderSearch({ item: topDeal.item.id })}
                className="press-tap food-motion zoom-reveal mt-3 flex items-stretch gap-3 border border-primary/60 bg-card lg:hidden"
              >
                <MenuItemImage
                  src={topDeal.item.image}
                  alt={localizedName(topDeal.item, lang)}
                  size="compact"
                  priority
                />
                <span className="min-w-0 flex-1 py-2 pr-3">
                  <span className="sale-pop inline-block origin-left bg-primary px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-primary-foreground">
                    −{topDeal.percent}% {t("off", "de rabais")}
                  </span>
                  <span className="mt-1 line-clamp-1 block font-display text-lg uppercase leading-tight">
                    {localizedName(topDeal.item, lang)}
                  </span>
                  <span className="mt-0.5 flex items-baseline gap-2">
                    <span className="price-in font-display text-2xl leading-none text-flame">
                      ${(topDeal.item.price as number).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      ${(topDeal.item.compareAtPrice as number).toFixed(2)}
                    </span>
                  </span>
                </span>
              </Link>
            )}

            {/* Order terminal — search, voice, mode and location on first screen */}
            <div
              className="line-rise mt-3 max-w-2xl border border-border bg-background/85 p-2 backdrop-blur-xl lg:mt-5 lg:p-2.5"
              style={{ animationDelay: "340ms" }}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex sm:items-stretch">
                <div className="grid shrink-0 grid-cols-2 border border-border">
                  {(["pickup", "delivery"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`press-tap inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[0.62rem] font-bold uppercase tracking-widest transition-colors focus-ppp ${
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
                className="press-tap mt-2 flex w-full items-center gap-3 border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary focus-ppp"
              >
                <Search className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {t(
                    "Search or say “poutine”, “taouk”…",
                    "Cherchez ou dites « poutine », « taouk »…",
                  )}
                </span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
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
                search={orderSearch()}
                className="cta-glow cta-motion press-tap mt-2 flex w-full items-center justify-center gap-2 bg-primary py-3 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp lg:py-3.5 lg:text-2xl"
              >
                {mode === "pickup"
                  ? t("Start pickup order", "Commander en cueillette")
                  : t("Start delivery order", "Commander en livraison")}
                <Bike className="cta-arrow hidden h-5 w-5" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Layered advertising composition — desktop only, real products */}
          <div className="relative hidden h-[30rem] lg:block">
            {starA && (
              <Link
                to="/order"
                search={orderSearch({ item: starA.id })}
                className="press-tap food-motion zoom-reveal hero-float absolute left-2 top-4 block h-64 w-64 overflow-hidden rounded-full border-4 border-background shadow-2xl focus-ppp xl:h-72 xl:w-72"
                style={layer(1)}
              >
                <MenuItemImage
                  src={starA.image}
                  alt={localizedName(starA, lang)}
                  size="hero"
                  priority
                />
              </Link>
            )}
            {starB && (
              <Link
                to="/order"
                search={orderSearch({ item: starB.id })}
                className="press-tap food-motion zoom-reveal hero-float-slow absolute right-4 top-0 z-10 block h-48 w-48 overflow-hidden border-4 border-background shadow-2xl focus-ppp xl:h-56 xl:w-56"
                style={{ animationDelay: "120ms", ...layer(1.9) }}
              >
                <MenuItemImage src={starB.image} alt={localizedName(starB, lang)} size="hero" />
              </Link>
            )}
            {starC && (
              <Link
                to="/order"
                search={orderSearch({ item: starC.id })}
                className="press-tap food-motion zoom-reveal drift-y absolute bottom-4 right-10 z-20 block h-56 w-56 overflow-hidden rounded-full border-4 border-background shadow-2xl focus-ppp"
                style={{ animationDelay: "200ms", ...layer(2.6) }}
              >
                <MenuItemImage src={starC.image} alt={localizedName(starC, lang)} size="hero" />
              </Link>
            )}
            {topDeal && (
              <Link
                to="/order"
                search={orderSearch({ item: topDeal.item.id })}
                className="press-tap sale-pop card-lift absolute bottom-16 left-0 z-30 block max-w-[15rem] border border-border bg-background p-4 shadow-2xl focus-ppp"
                style={layer(3.2)}
              >
                <span className="inline-block bg-primary px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-primary-foreground">
                  −{topDeal.percent}%
                </span>
                <span className="mt-2 line-clamp-2 block font-display text-xl uppercase leading-tight">
                  {localizedName(topDeal.item, lang)}
                </span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="price-in font-display text-3xl leading-none text-flame">
                    ${(topDeal.item.price as number).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    ${(topDeal.item.compareAtPrice as number).toFixed(2)}
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Promo ticker */}
      <div className="ticker overflow-hidden border-t border-border bg-primary">
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
