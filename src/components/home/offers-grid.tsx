import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgePercent } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { getDiscountedItems } from "@/lib/promotions";
import { MenuRail } from "@/components/menu/menu-rail";
import { ProductCard } from "@/components/menu/product-card";
import { ItemSheet } from "@/components/order/item-sheet";
import type { MenuItem } from "@/data/menu";

/** Only real catalog discounts (compare-at price published) are shown. */
export function OffersGrid() {
  const { locationId, t } = usePPP();
  const deals = getDiscountedItems(locationId);
  const [active, setActive] = useState<MenuItem | null>(null);
  if (deals.length === 0) return null;

  return (
    <section id="offers" className="border-y border-border bg-card/40">
      <MenuRail
        kicker={
          <>
            <BadgePercent className="h-3.5 w-3.5" />
            {t(
              `${deals.length} items on sale today`,
              `${deals.length} articles en rabais aujourd'hui`,
            )}
          </>
        }
        title={t("Real deals", "Vrais rabais")}
        action={
          <Link
            to="/offers"
            className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
          >
            {t("All offers", "Toutes les offres")}
          </Link>
        }
      >
        {deals.map(({ item }, i) => (
          <ProductCard key={item.id} item={item} index={i} onOpen={setActive} />
        ))}
      </MenuRail>
      <ItemSheet item={active} onClose={() => setActive(null)} onSelectItem={setActive} />
    </section>
  );
}