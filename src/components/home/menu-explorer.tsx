import { useState } from "react";
import { Plus } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedDescription, localizedName } from "@/lib/search";
import { track } from "@/lib/analytics";

/**
 * Two-level discovery: a sticky category strip and an item grid that swaps
 * instantly — no page change, no wasted space.
 */
export function MenuExplorer() {
  const { lang, locationId, openSearch, t } = usePPP();
  const categories = menuRepository.getCategories(locationId);
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");
  const active = categories.find((c) => c.id === activeId) ?? categories[0];
  const items = active ? menuRepository.getItemsInCategory(active.id, locationId) : [];

  if (!active) return null;

  return (
    <section id="menu" className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
          <h2 className="font-display text-4xl uppercase leading-none sm:text-6xl">
            {t("The menu", "Le menu")}
          </h2>
          <button
            onClick={() => openSearch()}
            className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
          >
            {t("Search the menu", "Chercher au menu")}
          </button>
        </div>

        <div className="no-scrollbar edge-fade-x -mx-3 mt-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                track("search_category_selected", { categoryId: c.id, query: "" });
              }}
              className={`group relative h-20 w-36 shrink-0 overflow-hidden border text-left transition-colors focus-ppp ${
                c.id === active.id ? "border-primary" : "border-border"
              }`}
            >
              <img
                src={c.image}
                alt=""
                loading="lazy"
                className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                  c.id === active.id ? "opacity-70" : "opacity-40"
                }`}
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent px-2 pb-1.5 pt-6 font-display text-sm uppercase leading-none">
                {localizedName(c, lang)}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 max-w-xl text-sm text-muted-foreground">{localizedDescription(active, lang)}</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                track("search_product_selected", { itemId: item.id, query: "" });
                openSearch(localizedName(item, lang));
              }}
              className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border border-border bg-background p-2 text-left transition-colors hover:border-primary focus-ppp"
            >
              <span className="h-16 w-16 shrink-0 overflow-hidden">
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-lg uppercase leading-none">
                  {localizedName(item, lang)}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {localizedDescription(item, lang)}
                </span>
                <span className="mt-1 block font-display text-base leading-none text-accent">
                  {item.price !== null ? `$${item.price.toFixed(2)}` : t("See price", "Voir le prix")}
                </span>
              </span>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}