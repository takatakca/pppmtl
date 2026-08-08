import { X } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { localizedDescription, localizedName } from "@/lib/search";

/**
 * Full catalog index. With 17 published categories the horizontal rail can only
 * ever show a slice, so this sheet gives the whole board at a glance with live
 * item counts.
 */
export function AllCategoriesSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
}) {
  const { lang, locationId, t } = usePPP();
  const categories = menuRepository.getCategories(locationId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[89] flex items-end justify-center bg-background/85 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-label={t("All categories", "Toutes les catégories")}
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col border border-border bg-card promo-in"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl uppercase leading-none">
            {t("All categories", "Toutes les catégories")}
            <span className="ml-2 text-accent">{categories.length}</span>
          </h2>
          <button
            onClick={onClose}
            aria-label={t("Close", "Fermer")}
            className="border border-border p-2 focus-ppp"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => {
              const count = menuRepository.getItemsInCategory(c.id, locationId).length;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      onSelect(c.id);
                      onClose();
                    }}
                    className="group flex w-full items-center gap-3 border border-border p-2 text-left transition-colors hover:border-primary focus-ppp"
                  >
                    <span className="h-14 w-14 shrink-0 overflow-hidden">
                      <img
                        src={c.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-110"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg uppercase leading-none">
                        {localizedName(c, lang)}
                      </span>
                      <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">
                        {localizedDescription(c, lang)}
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-lg leading-none text-accent">
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
