import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { menuRepository } from "@/lib/menu-repository";
import { MenuRail } from "@/components/menu/menu-rail";
import { ProductCard } from "@/components/menu/product-card";
import { ItemSheet } from "@/components/order/item-sheet";
import type { MenuItem } from "@/data/menu";

/**
 * Ordering-first discovery built from the real "most ordered" placements.
 * Mobile uses compact row cards (96–104px thumbs) so several products fit
 * on one 390px screen; desktop keeps a denser card grid.
 */
export function MostOrdered() {
  const { locationId, t } = usePPP();
  const items = menuRepository.getPopularItems(locationId, 14);
  const [active, setActive] = useState<MenuItem | null>(null);
  if (items.length === 0) return null;

  return (
    <div id="most-ordered">
      <MenuRail
        kicker={
          <>
            <Flame className="h-3.5 w-3.5" />
            {t("Ordered again and again", "Commandé encore et encore")}
          </>
        }
        title={t("Most ordered", "Les plus commandés")}
        count={t(`${items.length} products`, `${items.length} produits`)}
        action={
          <Link
            to="/menu"
            className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
          >
            {t("See all", "Voir tout")}
          </Link>
        }
      >
        {items.map((item, i) => (
          <ProductCard
            key={item.id}
            item={item}
            index={i}
            onOpen={setActive}
            badge={t("Popular", "Populaire")}
          />
        ))}
      </MenuRail>
      <ItemSheet item={active} onClose={() => setActive(null)} onSelectItem={setActive} />
    </div>
  );
}
