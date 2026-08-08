import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";
import { ProductImage } from "@/components/order/product-image";

/** Ordering-first discovery rail built from the real "most ordered" placements. */
export function MostOrdered() {
  const { lang, locationId, t } = usePPP();
  const items = menuRepository.getPopularItems(locationId, 12);
  if (items.length === 0) return null;

  return (
    <section id="most-ordered" className="mx-auto max-w-[110rem] px-3 py-8 sm:px-6 lg:py-12">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 font-display text-[0.65rem] uppercase tracking-[0.35em] text-accent">
            <Flame className="h-3.5 w-3.5" />
            {t("Ordered again and again", "Commandé encore et encore")}
          </p>
          <h2 className="mt-1 truncate font-display text-4xl uppercase leading-none sm:text-6xl">
            {t("Most ordered", "Les plus commandés")}
          </h2>
        </div>
        <Link
          to="/order"
          className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
        >
          {t("See all", "Voir tout")}
        </Link>
      </div>

      <ul className="no-scrollbar edge-fade-x -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {items.map((item) => (
          <li key={item.id} className="w-48 shrink-0 sm:w-56">
            <Link
              to="/order"
              search={{ item: item.id }}
              className="press-tap group block h-full border border-border bg-card transition-colors hover:border-primary focus-ppp"
            >
              <ProductImage
                src={item.image}
                alt={localizedName(item, lang)}
                className="h-28 w-full sm:h-32"
              />
              <span className="block p-3">
                <span className="line-clamp-2 block font-display text-lg uppercase leading-tight">
                  {localizedName(item, lang)}
                </span>
                <span className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-xl leading-none text-flame">
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
                <span className="mt-2 block bg-primary py-2 text-center font-display text-sm uppercase leading-none text-primary-foreground">
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