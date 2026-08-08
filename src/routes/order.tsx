import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bike, Mic, Phone, Search, ShoppingBag, X } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { ItemSheet } from "@/components/order/item-sheet";
import { CartPanel } from "@/components/order/cart-panel";
import { AllCategoriesSheet } from "@/components/order/all-categories-sheet";
import { MenuImage } from "@/components/menu/menu-item-image";
import { DeliveryAddressSheet } from "@/components/order/delivery-address-sheet";
import { usePPP, useSelectedLocation } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { cartTotals } from "@/lib/cart";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import type { MenuItem } from "@/data/menu";
import { pppBusiness } from "@/config/business";

export const Route = createFileRoute("/order")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { category?: string | undefined; item?: string | undefined; q?: string | undefined } => {
    const pick = (key: string) =>
      typeof search[key] === "string" && search[key] ? (search[key] as string) : undefined;
    return { category: pick("category"), item: pick("item"), q: pick("q") };
  },
  head: () => ({
    meta: [
      { title: "Order Online | PPP Pizzeria NDG — Pickup & Delivery" },
      {
        name: "description",
        content:
          "Build your PPP order from the Notre-Dame-de-Grâce menu: fried chicken, trios, poutine, subs, pitas and pizza. Pickup or delivery from 6280 Av. Somerled.",
      },
      { property: "og:title", content: "Order Online | PPP Pizzeria NDG" },
      {
        property: "og:description",
        content:
          "Search the PPP NDG menu by text or voice, build your order and continue by phone or app.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/order" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/order" }],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { locationId, mode, setMode, lang, t, openLocationSheet, openCart, cart } = usePPP();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/order" });
  const location = useSelectedLocation();
  const categories = menuRepository.getCategories(locationId);
  const [activeCategory, setActiveCategory] = useState(search.category || categories[0]?.id || "");
  const [query, setQuery] = useState(search.q ?? "");
  const [filter, setFilter] = useState<"all" | "popular" | "deals">("all");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const totals = cartTotals(cart);

  /* Deep links: /order?item=… opens the item, /order?category=… jumps to it. */
  useEffect(() => {
    if (search.category) setActiveCategory(search.category);
    if (search.q) setQuery(search.q);
    if (search.item) {
      const item = menuRepository.getItem(search.item);
      if (item) {
        setSelected(item);
        setActiveCategory(item.categoryId);
      }
    }
  }, [search.category, search.item, search.q]);

  const clearDeepLink = () => {
    if (search.item || search.category || search.q) {
      void navigate({ search: {}, replace: true });
    }
  };

  const voice = useVoiceSearch(lang, (text: string) => setQuery(text));
  const listening = voice.status === "listening";
  const voiceUnavailable =
    voice.status === "denied" || voice.status === "unsupported" || voice.status === "error";

  const results = useMemo(() => {
    const base =
      query.trim().length > 0
        ? menuRepository.search({ query, language: lang, locationId }).items
        : menuRepository.getItemsInCategory(activeCategory, locationId);
    if (filter === "popular") return base.filter((i) => i.badges.includes("popular"));
    if (filter === "deals") return base.filter((i) => i.compareAtPrice != null);
    return base;
  }, [query, lang, locationId, activeCategory, filter]);

  const activeName = categories.find((c) => c.id === activeCategory);
  const popular = useMemo(() => menuRepository.getPopularItems(locationId, 10), [locationId]);

  return (
    <div className="min-h-dvh bg-background pb-28 lg:pb-0">
      <PPPHeader />
      <main className="mx-auto max-w-[110rem] px-3 pt-16 sm:px-6 lg:pt-28">
        <h1 className="font-display text-xl uppercase leading-none sm:text-4xl">
          {t("Order", "Commander")}{" "}
          <span className="text-flame">{pppBusiness.shortLocationName}</span>
        </h1>

        {/* Order terminal: mode + location + search + voice, always reachable */}
        <div className="sticky top-14 z-40 -mx-3 mt-2 border-y border-border bg-background/95 px-3 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-24">
          <div className="grid gap-1.5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
            <div className="grid grid-cols-2 border border-border lg:w-56">
              {(["pickup", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    if (m === "delivery") setAddressOpen(true);
                  }}
                  aria-pressed={mode === m}
                  className={`press-tap inline-flex items-center justify-center gap-2 py-2 text-[0.65rem] font-bold uppercase tracking-widest transition-colors focus-ppp ${
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

            <div className="flex min-w-0 items-center gap-2 border border-border px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  clearDeepLink();
                }}
                enterKeyHint="search"
                aria-label={t("Search the menu", "Rechercher au menu")}
                placeholder={t(
                  "Search chicken, poutine, subs…",
                  "Chercher poulet, poutine, sous-marins…",
                )}
                className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label={t("Clear search", "Effacer")}
                  className="p-1 focus-ppp"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {voice.supported && (
                <button
                  onClick={listening ? voice.stop : voice.start}
                  aria-label={t("Search by voice", "Rechercher par la voix")}
                  className={`p-1.5 focus-ppp ${listening ? "listening-ring text-primary" : "text-primary"}`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={openLocationSheet}
              className="hidden truncate border border-border px-3 py-2.5 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground focus-ppp lg:block"
            >
              {location?.name ?? t("Choose a location", "Choisir un emplacement")}
            </button>
          </div>

          {voiceUnavailable && (
            <p
              role="status"
              className="mt-2 text-[0.65rem] uppercase tracking-widest text-muted-foreground"
            >
              {t(
                "Voice unavailable — type your search instead.",
                "Voix indisponible — tapez votre recherche.",
              )}
            </p>
          )}

          {mode === "delivery" && (
            <button
              onClick={() => setAddressOpen(true)}
              className="mt-1.5 block w-full truncate border border-dashed border-border px-3 py-1.5 text-left text-[0.62rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp"
            >
              {deliveryAddress
                ? `${t("Delivering to", "Livraison à")} · ${deliveryAddress}`
                : t("Add a delivery address", "Ajouter une adresse de livraison")}
            </button>
          )}

          {/* Sticky category rail */}
          <div className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setAllCategoriesOpen(true)}
              className="sticky left-0 z-10 shrink-0 border border-primary bg-background px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-widest text-primary focus-ppp"
            >
              {t("All", "Tout")} · {categories.length}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setQuery("");
                  setActiveCategory(c.id);
                  clearDeepLink();
                }}
                aria-pressed={!query && activeCategory === c.id}
                className={`shrink-0 border px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-widest transition-colors focus-ppp ${
                  !query && activeCategory === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "fr" ? c.nameFr : c.nameEn}
              </button>
            ))}
          </div>
        </div>

        {!query && popular.length > 0 && (
          <section className="mt-4">
            <h2 className="font-display text-xl uppercase leading-none text-muted-foreground sm:text-2xl">
              {t("Most ordered at NDG", "Les plus commandés à NDG")}
            </h2>
            <ul className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
              {popular.map((item) => (
                <li key={item.id} className="shrink-0">
                  <button
                    onClick={() => setSelected(item)}
                    className="press-tap food-motion w-40 border border-border text-left transition-colors hover:border-primary focus-ppp sm:w-44"
                  >
                    <MenuImage
                      src={item.image}
                      alt={lang === "fr" ? item.nameFr : item.nameEn}
                      variant="hero"
                      className="h-24 w-full"
                    />
                    <span className="block px-2.5 py-2">
                      <span className="line-clamp-1 block font-display text-base uppercase leading-tight">
                        {lang === "fr" ? item.nameFr : item.nameEn}
                      </span>
                      <span className="mt-1 block font-display text-lg leading-none text-flame">
                        {item.price !== null
                          ? `$${item.price.toFixed(2)}`
                          : t("See price", "Voir le prix")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <h2 className="min-w-0 truncate font-display text-2xl uppercase leading-none text-muted-foreground">
            {query
              ? t(`Results for “${query}”`, `Résultats pour « ${query} »`)
              : activeName
                ? lang === "fr"
                  ? activeName.nameFr
                  : activeName.nameEn
                : t("Menu", "Menu")}
          </h2>
          <p className="shrink-0 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
            {results.length} {t("items", "articles")}
          </p>
        </div>

        <div className="mt-2 flex gap-1.5">
          {(
            [
              ["all", t("All", "Tout")],
              ["popular", t("Most ordered", "Plus commandés")],
              ["deals", t("On sale", "En rabais")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`border px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-widest transition-colors focus-ppp ${
                filter === id
                  ? "border-accent text-accent"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <p className="mt-6 border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t(
              "Nothing matched that search. Try a category above, or call the restaurant.",
              "Aucun résultat. Essayez une catégorie ci-dessus ou appelez le restaurant.",
            )}
          </p>
        ) : (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 sm:gap-2 xl:grid-cols-3">
            {results.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setSelected(item)}
                  className="press-tap food-motion flex w-full items-stretch gap-3 border-b border-border bg-card text-left transition-colors hover:border-primary focus-ppp sm:border"
                >
                  <span className="order-1 min-w-0 flex-1 py-2.5 pl-3 sm:order-last sm:pl-0 sm:pr-3">
                    {item.badges && item.badges.length > 0 && (
                      <span className="mb-1 flex flex-wrap gap-1">
                        {item.badges.includes("popular") && (
                          <span className="border border-accent px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-accent">
                            {t("Popular", "Populaire")}
                          </span>
                        )}
                        {item.badges.includes("deal") && (
                          <span className="bg-primary px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-primary-foreground">
                            {t("20% off", "20 % de rabais")}
                          </span>
                        )}
                      </span>
                    )}
                    <span className="line-clamp-2 block font-display text-base uppercase leading-tight sm:text-lg">
                      {lang === "fr" ? item.nameFr : item.nameEn}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[0.7rem] leading-snug text-muted-foreground">
                      {lang === "fr" ? item.descriptionFr : item.descriptionEn}
                    </span>
                    <span className="mt-1.5 flex items-baseline gap-2">
                      <span className="font-display text-xl leading-none text-flame">
                        {item.price !== null
                          ? `$${item.price.toFixed(2)}`
                          : t("See price", "Voir le prix")}
                      </span>
                      {item.compareAtPrice != null && (
                        <span className="text-[0.7rem] text-muted-foreground line-through">
                          ${item.compareAtPrice.toFixed(2)}
                        </span>
                      )}
                    </span>
                  </span>
                  {/* Image sits right on mobile so names and prices scan first */}
                  <MenuImage
                    src={item.image}
                    alt={lang === "fr" ? item.nameFr : item.nameEn}
                    variant="list"
                    className="order-2 self-center sm:order-first sm:self-stretch"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 grid gap-2 border border-border p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="text-sm text-muted-foreground">
            {t(
              "Prefer to talk it through? The kitchen takes orders by phone.",
              "Vous préférez parler à quelqu'un ? La cuisine prend les commandes par téléphone.",
            )}
          </p>
          <a
            href={pppBusiness.phone.href}
            className="inline-flex items-center justify-center gap-2 border border-border px-5 py-3 font-display text-lg uppercase leading-none focus-ppp hover:border-primary"
          >
            <Phone className="h-4 w-4 text-primary" />
            {t("Call to order", "Appeler pour commander")}
          </a>
        </div>
      </main>

      <PPPFooter />

      {/* Contextual cart CTA replaces the home bottom bar inside the order flow */}
      <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <button
          onClick={openCart}
          className="flex w-full items-center justify-between bg-primary px-4 py-3.5 focus-ppp"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <span className="font-display text-lg uppercase leading-none text-primary-foreground">
            {t("View order", "Voir la commande")} · {totals.itemCount}
          </span>
          <span className="font-display text-lg leading-none text-primary-foreground">
            ${totals.knownSubtotal.toFixed(2)}
          </span>
        </button>
      </div>

      <button
        onClick={openCart}
        className="fixed bottom-6 right-6 z-[70] hidden items-center gap-3 bg-primary px-5 py-4 focus-ppp lg:inline-flex"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        <ShoppingBag className="h-5 w-5 text-primary-foreground" />
        <span className="font-display text-lg uppercase leading-none text-primary-foreground">
          {totals.itemCount} · ${totals.knownSubtotal.toFixed(2)}
        </span>
      </button>

      <AllCategoriesSheet
        open={allCategoriesOpen}
        onClose={() => setAllCategoriesOpen(false)}
        onSelect={(id) => {
          setQuery("");
          setActiveCategory(id);
        }}
      />
      <ItemSheet
        item={selected}
        onClose={() => {
          setSelected(null);
          clearDeepLink();
        }}
        onSelectItem={(next) => setSelected(next)}
      />
      <CartPanel />
      <DeliveryAddressSheet
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        onConfirm={setDeliveryAddress}
      />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
    </div>
  );
}
