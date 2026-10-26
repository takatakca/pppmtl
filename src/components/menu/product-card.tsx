import { Heart, Plus } from "lucide-react";
import type { MenuItem } from "@/data/menu";
import { usePPP } from "@/context/ppp-store";
import { MenuImage } from "@/components/menu/menu-item-image";
import { localizedName } from "@/lib/search";

/**
 * The single rail product card. Fixed width so a category always reads as one
 * row, and the food image pops out of its frame on hover / focus.
 */
export function ProductCard({
  item,
  onOpen,
  badge,
  index = 0,
}: {
  item: MenuItem;
  onOpen: (item: MenuItem) => void;
  badge?: string;
  index?: number;
}) {
  const { lang, t, isFavourite, addFavourite, removeFavourite } = usePPP();
  const name = localizedName(item, lang);
  const favourited = isFavourite(item.id);
  const discount =
    item.price !== null && item.compareAtPrice != null && item.compareAtPrice > item.price
      ? Math.round((1 - item.price / item.compareAtPrice) * 100)
      : null;

  return (
    <li
      className="rise-in group relative w-[13.5rem] shrink-0 sm:w-[15rem]"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="press-tap flex h-full w-full flex-col border border-border bg-card text-left transition-[transform,box-shadow,border-color] duration-300 ease-out group-hover:-translate-y-1.5 group-hover:border-primary group-hover:shadow-[0_18px_40px_-18px_hsl(0_0%_0%/0.9)] focus-ppp"
      >
        <span className="relative block overflow-hidden">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100"
          />
          <MenuImage
            src={item.image}
            alt={name}
            variant="hero"
            className="h-32 w-full transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.10] sm:h-36"
          />
          {(discount ?? badge) && (
            <span className="absolute left-0 top-0 flex flex-col items-start gap-0.5">
              {discount && (
                <span className="sale-pop bg-primary px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-primary-foreground">
                  {discount}% {t("off", "rabais")}
                </span>
              )}
              {badge && (
                <span className="bg-accent px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-accent-foreground">
                  {badge}
                </span>
              )}
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col p-2.5">
          <span className="line-clamp-2 block min-h-[2.2rem] font-display text-sm uppercase leading-tight sm:text-base">
            {name}
          </span>
          <span className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-lg leading-none text-flame">
              {item.price !== null ? `$${item.price.toFixed(2)}` : t("See price", "Voir le prix")}
            </span>
            {item.compareAtPrice != null && (
              <span className="text-[0.65rem] text-muted-foreground line-through">
                ${item.compareAtPrice.toFixed(2)}
              </span>
            )}
          </span>
          <span className="mt-2 inline-flex items-center justify-center gap-1 bg-primary py-1.5 font-display text-xs uppercase leading-none text-primary-foreground transition-all duration-200 group-hover:brightness-110 group-hover:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.7)]">
            <Plus className="h-3 w-3" />
            {t("Add", "Ajouter")}
          </span>
        </span>
      </button>
      {/* A sibling of the card button, not a child: a button inside a button is invalid HTML
          and makes the server-rendered page fail hydration. It rises with the card on hover. */}
      <button
        type="button"
        aria-label={
          favourited
            ? t("Remove from favourites", "Retirer des favoris")
            : t("Add to favourites", "Ajouter aux favoris")
        }
        onClick={() => {
          if (favourited) removeFavourite(item.id);
          else addFavourite(item.id);
        }}
        className="absolute right-[calc(0.5rem+1px)] top-[calc(0.5rem+1px)] z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-sm transition-all duration-300 ease-out group-hover:-translate-y-1.5 hover:scale-110 focus-ppp active:scale-95"
      >
        <Heart
          className={`h-3.5 w-3.5 transition-all duration-200 ${
            favourited ? "fill-primary text-primary" : "fill-transparent text-white"
          }`}
        />
      </button>
    </li>
  );
}
