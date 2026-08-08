import { BadgePercent, ShoppingBag, User, Utensils } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";

/**
 * The single app-quality bottom dock: Order, Menu, Offers, Account.
 * Nothing else floats on mobile so ordering stays the dominant target.
 */
export function MobileOrderBar() {
  const { mode, t } = usePPP();

  const tabs = [
    { to: "/order", label: t("Menu", "Menu"), icon: Utensils },
    { to: "/offers", label: t("Offers", "Offres"), icon: BadgePercent },
    { to: "/account", label: t("Account", "Compte"), icon: User },
  ] as const;

  return (
    <nav
      aria-label={t("Primary", "Principal")}
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="flex items-stretch">
        <Link
          to="/order"
          className="press-tap flex min-h-11 min-w-[8.5rem] flex-col items-center justify-center gap-0.5 bg-primary px-4 py-2 text-primary-foreground focus-ppp"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="font-display text-base uppercase leading-none">
            {mode === "pickup" ? t("Order pickup", "Cueillette") : t("Order delivery", "Livraison")}
          </span>
        </Link>
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeProps={{ className: "text-foreground" }}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
