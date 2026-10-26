import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";
import { ProductCard } from "@/components/menu/product-card";
import { ItemSheet } from "@/components/order/item-sheet";
import type { MenuItem } from "@/data/menu";

/**
 * Homepage catalog browser: category chips on one line, the selected category
 * rendered as a grid of product cards — the same grammar as the menu page.
 */
export function CategoryExplorer() {
  const { lang, locationId, t } = usePPP();
  const categories = menuRepository.getCategories(locationId);
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [active, setActive] = useState<MenuItem | null>(null);
  if (categories.length === 0) return null;

  const current = categories.find((c) => c.id === catId) ?? categories[0]!;
  const items = menuRepository.getItemsInCategory(current.id, locationId);

  return (
    <section id="menu" className="border-y border-border bg-card/30 py-3 sm:py-5">
      <div className="mx-auto max-w-[110rem] px-3 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Browse the whole kitchen", "Parcourir toute la cuisine")}
            </p>
            <h2 className="mt-0.5 truncate font-display text-2xl uppercase leading-none sm:text-5xl">
              {t("Every category", "Toutes les catégories")}
            </h2>
          </div>
          <Link
            to="/menu"
            className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
          >
            {t("Full menu", "Menu complet")}
          </Link>
        </div>

        <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatId(c.id)}
              className={`press-tap shrink-0 whitespace-nowrap border px-3 py-1.5 font-display text-xs uppercase leading-none transition-colors focus-ppp ${
                c.id === current.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {localizedName(c, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[110rem] px-3 sm:px-6">
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <h3 className="truncate font-display text-xl uppercase leading-none sm:text-3xl">
            {localizedName(current, lang)}
          </h3>
          <span className="hidden text-[0.6rem] font-bold uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            {t(`${items.length} products`, `${items.length} produits`)}
          </span>
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-2 pb-2 pt-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item, i) => (
            <ProductCard key={item.id} item={item} index={i} onOpen={setActive} fluid />
          ))}
        </ul>
      </div>

      <ItemSheet item={active} onClose={() => setActive(null)} onSelectItem={setActive} />
    </section>
  );
}
