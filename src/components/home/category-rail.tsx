import { categories } from "@/data/menu";
import { usePPP } from "@/context/ppp-store";
import { localizedDescription, localizedName } from "@/lib/search";
import { track } from "@/lib/analytics";

export function CategoryRail() {
  const { lang, openSearch, t } = usePPP();

  return (
    <section id="menu" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl uppercase sm:text-5xl">{t("The menu", "Le menu")}</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t(
              "Seven kitchens under one roof — pick a craving to see what's in it.",
              "Sept cuisines sous un même toit — choisissez une envie pour voir le contenu.",
            )}
          </p>
        </div>
        <button
          onClick={() => openSearch()}
          className="text-sm font-bold uppercase tracking-widest text-accent focus-ppp"
        >
          {t("Search the menu", "Rechercher au menu")}
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              track("search_category_selected", { categoryId: c.id, source: "rail" });
              openSearch(localizedName(c, lang));
            }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card text-left transition-transform hover:-translate-y-1 focus-ppp"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <img
              src={c.image}
              alt=""
              loading="lazy"
              className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="p-5">
              <h3 className="font-display text-2xl uppercase leading-none">{localizedName(c, lang)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{localizedDescription(c, lang)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}