import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bike,
  Clock,
  Heart,
  Home,
  Menu as MenuIcon,
  Search,
  ShoppingBag,
  Smartphone,
  Star,
  Tag,
  User,
  Zap,
} from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";
import { MenuImage } from "@/components/menu/menu-item-image";
import { PPPLogo } from "@/components/brand/ppp-logo";
import type { MenuItem } from "@/data/menu";

const SCREENS = ["order", "menu", "customize", "cart"] as const;
type Screen = (typeof SCREENS)[number];

function price(item: MenuItem) {
  return item.price !== null ? `$${item.price.toFixed(2)}` : "—";
}

/** Chrome shared by every preview screen. */
function PhoneChrome({
  children,
  cartCount,
  active,
}: {
  children: React.ReactNode;
  cartCount: number;
  active: Screen;
}) {
  const { t } = usePPP();
  const tabs = [
    { id: "order", Icon: Home, label: t("Order", "Commander") },
    { id: "menu", Icon: MenuIcon, label: "Menu" },
    { id: "customize", Icon: Tag, label: t("Offers", "Offres") },
    { id: "cart", Icon: ShoppingBag, label: t("Cart", "Panier") },
  ] as const;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 pb-2 pt-5">
        <span className="flex items-center gap-1.5">
          <PPPLogo variant="appIcon" className="h-6" />
          <span className="font-display text-[0.6rem] uppercase leading-none tracking-widest">
            PPP Pizzeria
            <span className="block text-[0.5rem] text-muted-foreground">NDG</span>
          </span>
        </span>
        <span className="relative inline-flex items-center gap-1 bg-primary px-2 py-1 text-[0.5rem] font-bold uppercase tracking-widest text-primary-foreground">
          <ShoppingBag className="h-2.5 w-2.5" />
          {cartCount}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <nav className="grid grid-cols-4 border-t border-border bg-card">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[0.45rem] font-bold uppercase tracking-widest ${
              active === tab.id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.Icon className="h-3 w-3" />
            {tab.label}
          </span>
        ))}
      </nav>
    </div>
  );
}

export function AppPreview() {
  const { locationId, lang, t, openOrderSheet } = usePPP();
  const items = useMemo(() => menuRepository.getPopularItems(locationId, 6), [locationId]);
  const categories = useMemo(
    () => menuRepository.getCategories(locationId).slice(0, 5),
    [locationId],
  );
  const modifierItem = useMemo(
    () =>
      menuRepository
        .getItems(locationId)
        .find((i) => (i.modifierGroups ?? []).some((g) => g.choices.length > 1)) ?? items[0],
    [locationId, items],
  );
  const [screen, setScreen] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const promptRef = useRef<{ prompt: () => void } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as unknown as { prompt: () => void };
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    if (paused || reduced) return undefined;
    const id = window.setInterval(() => setScreen((s) => (s + 1) % SCREENS.length), 4600);
    return () => window.clearInterval(id);
  }, [paused, reduced]);

  if (items.length === 0) return null;
  const current: Screen = reduced ? "order" : (SCREENS[screen] ?? "order");
  const demo = items[0]!;
  const demoTwo = items[1] ?? demo;
  const group = modifierItem?.modifierGroups?.find((g) => g.choices.length > 1);

  const benefits = [
    { Icon: Zap, label: t("Fast ordering", "Commande rapide") },
    { Icon: Heart, label: t("Save favourites", "Favoris") },
    { Icon: Star, label: t("Member offers", "Offres membres") },
    { Icon: Clock, label: t("Reorder in a tap", "Recommander en 1 touche") },
  ];

  return (
    <section
      id="app"
      className="relative overflow-hidden border-y border-border bg-card/40"
      onPointerDown={() => setPaused(true)}
    >
      <div className="mx-auto grid max-w-[110rem] items-center gap-6 px-3 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("PPP on your phone", "PPP sur votre téléphone")}
          </p>
          <h2 className="mt-1 font-display text-4xl uppercase leading-[0.85] sm:text-7xl">
            {t("Your PPP.", "Votre PPP.")}
            <span className="block text-flame">{t("In your pocket.", "Dans votre poche.")}</span>
          </h2>
          <ul className="mt-5 grid max-w-lg grid-cols-2 gap-1.5">
            {benefits.map((b, i) => (
              <li
                key={b.label}
                className="rise-in flex items-center gap-2 border border-border bg-background px-2.5 py-2 text-[0.68rem] font-bold uppercase tracking-wide"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <b.Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{b.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            {t(
              "Create an account to keep your PPP experience together — addresses, favourites and offers in one place.",
              "Créez un compte pour garder votre expérience PPP au même endroit — adresses, favoris et offres.",
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (canInstall && promptRef.current) promptRef.current.prompt();
                else openOrderSheet();
              }}
              className="press-tap cta-glow inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              <Smartphone className="h-4 w-4" />
              {canInstall
                ? t("Add PPP to your phone", "Ajouter PPP à votre téléphone")
                : t("Start an order", "Commencer une commande")}
            </button>
            <Link
              to="/account/sign-up"
              className="press-tap inline-flex items-center border border-border px-5 py-3 font-display text-lg uppercase leading-none focus-ppp"
            >
              {t("Create account", "Créer un compte")}
            </Link>
          </div>
        </div>

        {/* Phone */}
        <div className="relative mx-auto w-full max-w-[19rem] lg:max-w-[21rem]">
          <span
            aria-hidden
            className="absolute inset-6 -z-10 rounded-full bg-primary/25 blur-3xl"
          />
          {/* secondary tilted phone */}
          <div
            aria-hidden
            className="absolute -right-6 top-8 hidden h-[26rem] w-[13rem] rotate-6 rounded-[2rem] border border-border bg-card/80 lg:block"
          />
          <div
            className={`relative aspect-[9/19] w-[240px] rounded-[2.2rem] border-[6px] border-foreground/80 bg-background shadow-2xl sm:w-[270px] lg:w-[300px] ${
              reduced ? "" : "phone-float"
            }`}
            style={{ marginInline: "auto" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <span className="absolute left-1/2 top-1 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-foreground/80" />
            <div className="h-full w-full overflow-hidden rounded-[1.7rem]">
              <div key={current} className="screen-in h-full">
                <PhoneChrome cartCount={current === "cart" ? 2 : 0} active={current}>
                  {current === "order" && (
                    <div className="flex h-full flex-col gap-2 p-2.5">
                      <div className="grid grid-cols-2 gap-1">
                        <span className="bg-primary py-1 text-center text-[0.5rem] font-bold uppercase tracking-widest text-primary-foreground">
                          {t("Pickup", "Cueillette")}
                        </span>
                        <span className="flex items-center justify-center gap-1 border border-border py-1 text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground">
                          <Bike className="h-2.5 w-2.5" />
                          {t("Delivery", "Livraison")}
                        </span>
                      </div>
                      <span className="flex items-center gap-1.5 border border-border px-2 py-1.5 text-[0.55rem] text-muted-foreground">
                        <Search className="h-2.5 w-2.5" />
                        {t("Search the menu", "Rechercher au menu")}
                      </span>
                      <p className="font-display text-[0.6rem] uppercase tracking-widest text-accent">
                        {t("Most ordered", "Plus commandés")}
                      </p>
                      <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-hidden">
                        {items.slice(0, 4).map((item) => (
                          <li key={item.id} className="border border-border bg-card">
                            <MenuImage
                              src={item.image}
                              alt={localizedName(item, lang)}
                              variant="hero"
                              className="h-12 w-full"
                            />
                            <span className="block px-1 py-1">
                              <span className="line-clamp-1 text-[0.5rem] font-bold uppercase">
                                {localizedName(item, lang)}
                              </span>
                              <span className="font-display text-[0.6rem] text-flame">
                                {price(item)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {current === "menu" && (
                    <div className="flex h-full flex-col gap-2 p-2.5">
                      <div className="no-scrollbar flex gap-1 overflow-hidden">
                        {categories.map((c, i) => (
                          <span
                            key={c.id}
                            className={`shrink-0 border px-1.5 py-1 text-[0.45rem] font-bold uppercase tracking-widest ${
                              i === 0
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {localizedName(c, lang)}
                          </span>
                        ))}
                      </div>
                      <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
                        {items.slice(0, 4).map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-2 border border-border bg-card p-1"
                          >
                            <MenuImage
                              src={item.image}
                              alt={localizedName(item, lang)}
                              variant="hero"
                              className="h-10 w-10 shrink-0"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-1 text-[0.52rem] font-bold uppercase">
                                {localizedName(item, lang)}
                              </span>
                              <span className="font-display text-[0.6rem] text-flame">
                                {price(item)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {current === "customize" && modifierItem && (
                    <div className="flex h-full flex-col p-2.5">
                      <MenuImage
                        src={modifierItem.image}
                        alt={localizedName(modifierItem, lang)}
                        variant="hero"
                        className="h-24 w-full"
                      />
                      <p className="mt-2 line-clamp-2 font-display text-[0.7rem] uppercase leading-tight">
                        {localizedName(modifierItem, lang)}
                      </p>
                      <p className="font-display text-sm text-flame">{price(modifierItem)}</p>
                      {group && (
                        <div className="mt-2">
                          <p className="text-[0.5rem] font-bold uppercase tracking-widest text-muted-foreground">
                            {lang === "fr" ? group.labelFr : group.labelEn}
                            {group.required && (
                              <span className="ml-1 text-primary">{t("Required", "Requis")}</span>
                            )}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {group.choices.slice(0, 3).map((c, i) => (
                              <li
                                key={c.id}
                                className={`flex items-center gap-1.5 border px-1.5 py-1 text-[0.5rem] uppercase ${
                                  i === 0 ? "border-primary" : "border-border"
                                }`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full border ${
                                    i === 0 ? "border-primary bg-primary" : "border-border"
                                  }`}
                                />
                                {lang === "fr" ? c.labelFr : c.labelEn}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <span className="mt-auto bg-primary py-1.5 text-center font-display text-[0.65rem] uppercase text-primary-foreground">
                        {t("Add to order", "Ajouter")}
                      </span>
                    </div>
                  )}

                  {current === "cart" && (
                    <div className="flex h-full flex-col gap-1.5 p-2.5">
                      <p className="font-display text-[0.6rem] uppercase tracking-widest text-accent">
                        {t("Your cart · preview", "Votre panier · aperçu")}
                      </p>
                      {[demo, demoTwo].map((item, i) => (
                        <div
                          key={`${item.id}-${i}`}
                          className="flex items-center gap-2 border border-border bg-card p-1"
                        >
                          <MenuImage
                            src={item.image}
                            alt={localizedName(item, lang)}
                            variant="hero"
                            className="h-10 w-10 shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-[0.52rem] font-bold uppercase">
                              {localizedName(item, lang)}
                            </span>
                            <span className="text-[0.5rem] text-muted-foreground">
                              {t("Qty", "Qté")} 1
                            </span>
                          </span>
                          <span className="font-display text-[0.6rem] text-flame">
                            {price(item)}
                          </span>
                        </div>
                      ))}
                      <span className="mt-auto flex items-center justify-between border-t border-border pt-1.5 text-[0.55rem] font-bold uppercase">
                        {t("Subtotal", "Sous-total")}
                        <span className="font-display text-sm text-flame">
                          ${(((demo.price ?? 0) + (demoTwo.price ?? 0)) as number).toFixed(2)}
                        </span>
                      </span>
                      <span className="bg-primary py-1.5 text-center font-display text-[0.65rem] uppercase text-primary-foreground">
                        {t("Checkout", "Passer la commande")}
                      </span>
                    </div>
                  )}
                </PhoneChrome>
              </div>
            </div>
          </div>

          {!reduced && (
            <div className="mt-3 flex justify-center gap-1.5">
              {SCREENS.map((s, i) => (
                <button
                  key={s}
                  aria-label={s}
                  onClick={() => {
                    setScreen(i);
                    setPaused(true);
                  }}
                  className={`h-1.5 w-6 transition-colors focus-ppp ${
                    i === screen ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
          )}
          <p className="mt-2 text-center text-[0.55rem] uppercase tracking-widest text-muted-foreground">
            <User className="mr-1 inline h-2.5 w-2.5" />
            {t("Web app preview · demo content", "Aperçu de l'app web · contenu démo")}
          </p>
        </div>
      </div>
    </section>
  );
}
