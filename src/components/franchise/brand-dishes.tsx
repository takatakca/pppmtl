import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { useBrand, useBrandRails } from "@/context/brand";
import { MenuRail } from "@/components/menu/menu-rail";
import { ProductCard } from "@/components/menu/product-card";
import { ItemSheet } from "@/components/order/item-sheet";
import type { MenuItem } from "@/data/menu";

/** The brand's own 10–12 dishes, one rail per group, with PPP's product cards and item sheet. */
export function BrandDishes() {
  const { t, lang } = usePPP();
  const brand = useBrand();
  const rails = useBrandRails();
  const [active, setActive] = useState<MenuItem | null>(null);
  const total = rails.reduce((n, r) => n + r.items.length, 0);
  if (total === 0) return null;

  return (
    <div id="nos-plats" className="scroll-mt-28 pt-4">
      {rails.map(({ rail, items }, r) => (
        <MenuRail
          key={rail.title.fr}
          kicker={
            r === 0 ? (
              <>
                <Flame className="h-3.5 w-3.5" />
                {t(`${brand.name} · our dishes`, `${brand.name} · nos plats`)}
              </>
            ) : undefined
          }
          title={lang === "fr" ? rail.title.fr : rail.title.en}
          count={t(`${items.length} dishes`, `${items.length} plats`)}
          action={
            r === 0 ? (
              <Link
                to="/order"
                className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
              >
                {t("Order", "Commander")}
              </Link>
            ) : undefined
          }
        >
          {items.map((item, i) => (
            <ProductCard key={item.id} item={item} index={i} onOpen={setActive} />
          ))}
        </MenuRail>
      ))}
      <ItemSheet item={active} onClose={() => setActive(null)} onSelectItem={setActive} />
    </div>
  );
}
