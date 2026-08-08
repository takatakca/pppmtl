import { Gift, Home, Search, ShoppingBag, Utensils } from "lucide-react";
import { usePPP } from "@/context/ppp-store";

/**
 * Native-app style bottom bar. Ordering is the dominant target; food discovery
 * and rewards stay one tap away on every scroll position.
 */
export function MobileOrderBar() {
  const { openSearch, openOrderSheet, mode, t } = usePPP();

  const tabs = [
    { id: "home", label: t("Home", "Accueil"), icon: Home, href: "#top" },
    { id: "menu", label: t("Menu", "Menu"), icon: Utensils, href: "#menu" },
    { id: "rewards", label: t("Rewards", "Points"), icon: Gift, href: "#rewards" },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
      <div className="flex items-stretch">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </a>
        ))}
        <button
          onClick={() => openSearch()}
          aria-label={t("Search the menu", "Rechercher au menu")}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp"
        >
          <Search className="h-4 w-4" />
          {t("Search", "Chercher")}
        </button>
        <button
          onClick={openOrderSheet}
          className="flex min-w-[8.5rem] flex-col items-center justify-center gap-0.5 bg-primary px-4 py-2 text-primary-foreground focus-ppp"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="font-display text-base uppercase leading-none">
            {mode === "pickup" ? t("Order pickup", "Cueillette") : t("Order delivery", "Livraison")}
          </span>
        </button>
      </div>
    </div>
  );
}