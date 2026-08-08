import { Search, ShoppingBag } from "lucide-react";
import { usePPP } from "@/context/ppp-store";

export function MobileOrderBar() {
  const { openSearch, mode, t } = usePPP();

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] border-t border-border bg-background/95 p-3 backdrop-blur-xl lg:hidden">
      <div className="flex gap-2">
        <button
          onClick={() => openSearch()}
          aria-label={t("Search the menu", "Rechercher au menu")}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border focus-ppp"
        >
          <Search className="h-5 w-5" />
        </button>
        <a
          href="#deals"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-display text-lg uppercase text-primary-foreground focus-ppp"
        >
          <ShoppingBag className="h-5 w-5" />
          {mode === "pickup" ? t("Order pickup", "Cueillette") : t("Order delivery", "Livraison")}
        </a>
      </div>
    </div>
  );
}