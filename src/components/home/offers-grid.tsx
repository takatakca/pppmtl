import { Link } from "@tanstack/react-router";
import { BadgePercent } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { getDiscountedItems } from "@/lib/promotions";
import { localizedDescription, localizedName } from "@/lib/search";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { orderSearch } from "@/lib/order-links";

/** Only real catalog discounts (compare-at price published) are shown. */
export function OffersGrid({ limit = 6 }: { limit?: number }) {
  const { lang, locationId, t } = usePPP();
  const deals = getDiscountedItems(locationId, limit);
  const total = getDiscountedItems(locationId).length;
  if (deals.length === 0) return null;

  const [lead, ...rest] = deals;

  return (
    <section id="offers" className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-[110rem] px-3 py-5 sm:px-6 lg:py-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-2">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              <BadgePercent className="h-3.5 w-3.5" />
              {t(`${total} items on sale today`, `${total} articles en rabais aujourd'hui`)}
            </p>
            <h2 className="mt-0.5 truncate font-display text-2xl uppercase leading-none sm:text-5xl">
              {t("Real deals", "Vrais rabais")}
            </h2>
          </div>
          <Link
            to="/offers"
            className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
          >
            {t("All offers", "Toutes les offres")}
          </Link>
        </div>

        <div className="mt-2 grid gap-2 lg:grid-cols-[1.4fr_1fr]">
          {lead && (
            <Link
              to="/order"
              search={orderSearch({ item: lead.item.id })}
              className="press-tap food-motion group relative block overflow-hidden border border-border focus-ppp"
            >
              <MenuItemImage
                src={lead.item.image}
                alt={localizedName(lead.item, lang)}
                size="hero"
                className="h-64 w-full lg:h-[24rem]"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <span className="sale-pop inline-block origin-left bg-primary px-2 py-1 font-display text-sm uppercase leading-none text-primary-foreground">
                  {lead.percent}% {t("OFF", "DE RABAIS")}
                </span>
                <span className="mt-2 block font-display text-2xl uppercase leading-none sm:text-3xl lg:text-5xl">
                  {localizedName(lead.item, lang)}
                </span>
                <span className="mt-1.5 flex items-baseline gap-3">
                  <span className="price-in font-display text-3xl leading-none text-flame sm:text-4xl lg:text-6xl">
                    ${(lead.item.price as number).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    ${(lead.item.compareAtPrice as number).toFixed(2)}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 hidden max-w-lg text-sm text-muted-foreground sm:block">
                  {localizedDescription(lead.item, lang)}
                </span>
              </span>
            </Link>
          )}

          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1 lg:gap-2">
            {rest.map(({ item, percent }, i) => (
              <li key={item.id} className="rise-in" style={{ animationDelay: `${i * 45}ms` }}>
                <Link
                  to="/order"
                  search={orderSearch({ item: item.id })}
                  className="press-tap food-motion flex h-full items-stretch gap-3 border border-border bg-background transition-colors hover:border-primary focus-ppp"
                >
                  <MenuItemImage
                    src={item.image}
                    alt={localizedName(item, lang)}
                    size="compact"
                  />
                  <span className="min-w-0 flex-1 py-2 pr-3">
                    <span className="sale-pop inline-block origin-left bg-primary px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-primary-foreground">
                      {percent}% {t("OFF", "RABAIS")}
                    </span>
                    <span className="mt-1 line-clamp-1 block font-display text-base uppercase leading-tight">
                      {localizedName(item, lang)}
                    </span>
                    <span className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-lg leading-none text-flame">
                        ${(item.price as number).toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        ${(item.compareAtPrice as number).toFixed(2)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}