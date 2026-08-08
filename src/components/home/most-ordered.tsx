import { Link } from "@tanstack/react-router";
import { Flame, Plus } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedDescription, localizedName } from "@/lib/search";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { orderSearch } from "@/lib/order-links";

/**
 * Ordering-first discovery built from the real "most ordered" placements.
 * Mobile uses compact row cards (96–104px thumbs) so several products fit
 * on one 390px screen; desktop keeps a denser card grid.
 */
export function MostOrdered() {
  const { lang, locationId, t } = usePPP();
  const items = menuRepository.getPopularItems(locationId, 12);
  if (items.length === 0) return null;

  return (
    <section id="most-ordered" className="mx-auto max-w-[110rem] px-3 py-5 sm:px-6 lg:py-10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            <Flame className="h-3.5 w-3.5" />
            {t("Ordered again and again", "Commandé encore et encore")}
          </p>
          <h2 className="mt-0.5 truncate font-display text-2xl uppercase leading-none sm:text-5xl">
            {t("Most ordered", "Les plus commandés")}
          </h2>
        </div>
        <Link
          to="/order"
          search={orderSearch()}
          className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
        >
          {t("See all", "Voir tout")}
        </Link>
      </div>

      {/* Mobile: compact row cards, 2–3 visible per screen */}
      <ul className="mt-2 grid gap-1.5 sm:hidden">
        {items.slice(0, 8).map((item, i) => (
          <li key={item.id} className="rise-in" style={{ animationDelay: `${i * 40}ms` }}>
            <Link
              to="/order"
              search={orderSearch({ item: item.id })}
              className="press-tap food-motion flex items-stretch gap-3 border border-border bg-card transition-colors hover:border-primary focus-ppp"
            >
              <MenuItemImage src={item.image} alt={localizedName(item, lang)} size="compact" />
              <span className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-2">
                <span className="line-clamp-1 font-display text-base uppercase leading-tight">
                  {localizedName(item, lang)}
                </span>
                <span className="line-clamp-1 text-[0.7rem] text-muted-foreground">
                  {localizedDescription(item, lang)}
                </span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-display text-lg leading-none text-flame">
                      {item.price !== null
                        ? `$${item.price.toFixed(2)}`
                        : t("See price", "Voir le prix")}
                    </span>
                    {item.compareAtPrice != null && (
                      <span className="text-[0.65rem] text-muted-foreground line-through">
                        ${item.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-primary px-2 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-primary-foreground">
                    <Plus className="h-3 w-3" />
                    {t("Add", "Ajouter")}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: dense card grid */}
      <ul className="mt-3 hidden gap-2 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to="/order"
              search={orderSearch({ item: item.id })}
              className="press-tap food-motion group block h-full border border-border bg-card transition-colors hover:border-primary focus-ppp"
            >
              <MenuItemImage
                src={item.image}
                alt={localizedName(item, lang)}
                size="hero"
                className="h-28 w-full"
              />
              <span className="block p-2.5">
                <span className="line-clamp-2 block font-display text-base uppercase leading-tight">
                  {localizedName(item, lang)}
                </span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-lg leading-none text-flame">
                    {item.price !== null
                      ? `$${item.price.toFixed(2)}`
                      : t("See price", "Voir le prix")}
                  </span>
                  {item.compareAtPrice != null && (
                    <span className="text-xs text-muted-foreground line-through">
                      ${item.compareAtPrice.toFixed(2)}
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block bg-primary py-1.5 text-center font-display text-xs uppercase leading-none text-primary-foreground">
                  {t("Add to order", "Ajouter")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}