import { Link } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";

/** Every published category, each a direct entry point into /order. */
export function CategoryGrid() {
  const { lang, locationId, t } = usePPP();
  const categories = menuRepository.getCategories(locationId);
  const items = menuRepository.getItems(locationId);
  if (categories.length === 0) return null;

  return (
    <section id="menu" className="mx-auto max-w-[110rem] px-3 py-8 sm:px-6 lg:py-12">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="font-display text-[0.65rem] uppercase tracking-[0.35em] text-accent">
            {t(
              `${categories.length} categories · ${items.length} items`,
              `${categories.length} catégories · ${items.length} articles`,
            )}
          </p>
          <h2 className="mt-1 truncate font-display text-4xl uppercase leading-none sm:text-6xl">
            {t("The full menu", "Le menu complet")}
          </h2>
        </div>
        <Link
          to="/order"
          className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
        >
          {t("Browse menu", "Parcourir")}
        </Link>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {categories.map((c) => {
          const count = items.filter((i) => i.categoryId === c.id).length;
          return (
            <li key={c.id}>
              <Link
                to="/order"
                search={{ category: c.id }}
                className="press-tap group relative block h-32 overflow-hidden border border-border transition-colors hover:border-primary focus-ppp sm:h-36"
              >
                <img
                  src={c.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-110 group-hover:opacity-70"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent px-2.5 pb-2 pt-8">
                  <span className="line-clamp-2 block font-display text-base uppercase leading-tight sm:text-lg">
                    {localizedName(c, lang)}
                  </span>
                  <span className="mt-0.5 block text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {count} {t("items", "articles")}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}