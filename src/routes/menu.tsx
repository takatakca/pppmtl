import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Flame, Search } from "lucide-react";
import { PPPHeader } from "@/components/layout/ppp-header";
import { PPPFooter } from "@/components/layout/ppp-footer";
import { MobileOrderBar } from "@/components/layout/mobile-order-bar";
import { LocationSheet } from "@/components/layout/location-sheet";
import { OrderSheet } from "@/components/layout/order-sheet";
import { SearchOverlay } from "@/components/search/search-overlay";
import { CartPanel } from "@/components/order/cart-panel";
import { ItemSheet } from "@/components/order/item-sheet";
import { MenuRail } from "@/components/menu/menu-rail";
import { ProductCard } from "@/components/menu/product-card";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";
import type { MenuItem } from "@/data/menu";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Full Menu — PPP Pizzeria NDG | Chicken, Pizza, Poutine" },
      {
        name: "description",
        content:
          "Browse every PPP Pizzeria NDG category in one clean grid: fried chicken, trios, pizza, subs, poutine, pita plates, mexicain, desserts and drinks.",
      },
      { property: "og:title", content: "Full Menu — PPP Pizzeria NDG" },
      {
        property: "og:description",
        content: "One grid per category. Every product, every option, ready to order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/menu") }],
  }),
  component: MenuPage,
});

function MenuPage() {
  const { lang, locationId, t, openSearch } = usePPP();
  const categories = menuRepository.getCategories(locationId);
  const popular = menuRepository.getPopularItems(locationId, 14);
  const [active, setActive] = useState<MenuItem | null>(null);
  const [activeCat, setActiveCat] = useState("most-ordered");
  const navRef = useRef<HTMLDivElement>(null);

  // Scrollspy: the chip nav always reflects the rail currently on screen.
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-rail-root] section[id]"),
    );
    if (sections.length === 0) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat(visible.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [categories.length]);

  useEffect(() => {
    const chip = navRef.current?.querySelector<HTMLElement>(`[data-chip="${activeCat}"]`);
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeCat]);

  const total = menuRepository.getItems(locationId).length;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <PPPHeader />
      <main className="pt-14 lg:pt-24">
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-[110rem] px-3 py-4 sm:px-6 sm:py-7">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t(
                `${categories.length} categories · ${total} products`,
                `${categories.length} catégories · ${total} produits`,
              )}
            </p>
            <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <h1 className="min-w-0 font-display text-3xl uppercase leading-none sm:text-6xl">
                {t("The full PPP menu", "Le menu PPP complet")}
              </h1>
              <button
                onClick={() => openSearch()}
                className="press-tap inline-flex shrink-0 items-center gap-2 border border-border px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:border-primary hover:text-foreground focus-ppp"
              >
                <Search className="h-3.5 w-3.5" />
                {t("Search", "Rechercher")}
              </button>
            </div>
          </div>

          {/* Sticky one-line category nav */}
          <div
            ref={navRef}
            className="no-scrollbar sticky top-14 z-40 flex gap-1.5 overflow-x-auto border-t border-border bg-background/95 px-3 py-2 backdrop-blur-xl sm:px-6 lg:top-24"
          >
            {[
              { id: "most-ordered", label: t("Most ordered", "Plus commandés") },
              ...categories.map((c) => ({ id: c.id, label: localizedName(c, lang) })),
            ].map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                data-chip={c.id}
                className={`shrink-0 whitespace-nowrap border px-3 py-1.5 font-display text-xs uppercase leading-none transition-colors focus-ppp ${
                  activeCat === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </a>
            ))}
          </div>
        </section>

        <div data-rail-root>
          <MenuRail
            id="most-ordered"
            kicker={
              <>
                <Flame className="h-3.5 w-3.5" />
                {t("Ordered again and again", "Commandé encore et encore")}
              </>
            }
            title={t("Most ordered", "Les plus commandés")}
            count={t(`${popular.length} products`, `${popular.length} produits`)}
          >
            {popular.map((item, i) => (
              <ProductCard
                key={item.id}
                item={item}
                index={i}
                onOpen={setActive}
                badge={t("Popular", "Populaire")}
              />
            ))}
          </MenuRail>

          {categories.map((c) => {
            const items = menuRepository.getItemsInCategory(c.id, locationId);
            if (items.length === 0) return null;
            return (
              <section key={c.id} id={c.id} className="scroll-mt-28 py-3 sm:py-4">
                <div className="mx-auto grid max-w-[110rem] grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-3 sm:px-6">
                  <h2 className="mt-0.5 truncate font-display text-xl uppercase leading-none sm:text-3xl lg:text-4xl">
                    {localizedName(c, lang)}
                  </h2>
                  <span className="hidden text-[0.6rem] font-bold uppercase tracking-[0.25em] text-muted-foreground sm:inline">
                    {t(`${items.length} products`, `${items.length} produits`)}
                  </span>
                </div>
                <ul className="mx-auto mt-2 grid max-w-[110rem] grid-cols-2 gap-2 px-3 pb-2 pt-1 sm:grid-cols-3 sm:px-6 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((item, i) => (
                    <ProductCard key={item.id} item={item} index={i} onOpen={setActive} fluid />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>

      <PPPFooter />
      <MobileOrderBar />
      <SearchOverlay />
      <LocationSheet />
      <OrderSheet />
      <CartPanel />
      <ItemSheet item={active} onClose={() => setActive(null)} onSelectItem={setActive} />
    </div>
  );
}
