import { Link } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";
import { orderSearch } from "@/lib/order-links";
import { Reveal } from "@/components/motion/reveal";

/** Every published category, each a direct entry point into /order. */
export function CategoryGrid() {
  const { lang, locationId, t } = usePPP();
  const categories = menuRepository.getCategories(locationId);
  const items = menuRepository.getItems(locationId);
  if (categories.length === 0) return null;

  return (
    <section id="menu" className="mx-auto max-w-[110rem] px-3 py-5 sm:px-6 lg:py-10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-2">
        <div className="min-w-0">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t(
              `${categories.length} categories · ${items.length} items`,
              `${categories.length} catégories · ${items.length} articles`,
            )}
          </p>
          <h2 className="mt-0.5 truncate font-display text-2xl uppercase leading-none sm:text-5xl">
            {t("The full menu", "Le menu complet")}
          </h2>
        </div>
        <Link
          to="/order"
          search={orderSearch()}
          className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
        >
          {t("Browse menu", "Parcourir")}
        </Link>
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {categories.map((c, i) => {
          const count = items.filter((i) => i.categoryId === c.id).length;
          return (
            <Reveal as="li" key={c.id} delay={(i % 6) * 45}>
              <Link
                to="/order"
                search={orderSearch({ category: c.id })}
                className="press-tap food-motion card-lift group flex items-center gap-2.5 overflow-hidden border border-border bg-card transition-colors hover:border-primary focus-ppp"
              >
                <span className="h-16 w-16 shrink-0 overflow-hidden bg-muted sm:h-20 sm:w-20">
                  <img
                    src={c.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  />
                </span>
                <span className="min-w-0 flex-1 py-2 pr-2">
                  <span className="line-clamp-2 block font-display text-sm uppercase leading-tight sm:text-base">
                    {localizedName(c, lang)}
                  </span>
                  <span className="mt-0.5 block text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {count} {t("items", "articles")}
                  </span>
                </span>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}