import { Link } from "@tanstack/react-router";
import { ArrowRight, Timer } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { getDiscountedItems } from "@/lib/promotions";
import { localizedName } from "@/lib/search";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { orderSearch } from "@/lib/order-links";
import { Reveal } from "@/components/motion/reveal";

/**
 * Full-width campaign band between browsing sections. It only renders when a
 * real published discount exists, and it always names the actual product.
 */
export function DealBanner() {
  const { lang, locationId, t } = usePPP();
  const deals = getDiscountedItems(locationId, 3);
  const lead = deals[0];
  if (!lead) return null;

  return (
    <section className="relative isolate overflow-hidden border-y border-border bg-primary">
      <span aria-hidden className="night-grain pointer-events-none absolute inset-0 opacity-60" />
      <span
        aria-hidden
        className="red-light pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2"
      />
      <div className="relative mx-auto grid max-w-[110rem] items-center gap-4 px-3 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:py-8">
        <Reveal className="min-w-0">
          <p className="inline-flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-primary-foreground/80">
            <Timer className="h-3.5 w-3.5" />
            {t("Live price cut", "Rabais en cours")}
          </p>
          <h2 className="mt-1 font-display text-3xl uppercase leading-[0.85] text-primary-foreground sm:text-5xl lg:text-6xl">
            {lead.percent}% {t("off", "de rabais")}{" "}
            <span className="block truncate">{localizedName(lead.item, lang)}</span>
          </h2>
          <p className="mt-1.5 flex items-baseline gap-3">
            <span className="font-display text-3xl leading-none text-primary-foreground sm:text-4xl">
              ${(lead.item.price as number).toFixed(2)}
            </span>
            <span className="text-sm text-primary-foreground/70 line-through">
              ${(lead.item.compareAtPrice as number).toFixed(2)}
            </span>
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-primary-foreground/80">
              {t("save", "économisez")} ${lead.save.toFixed(2)}
            </span>
          </p>
        </Reveal>

        <Reveal delay={90} className="flex items-center gap-3">
          <div className="hidden gap-2 sm:flex">
            {deals.map((d, i) => (
              <MenuItemImage
                key={d.item.id}
                src={d.item.image}
                alt={localizedName(d.item, lang)}
                size="hero"
                className={`h-24 w-24 border-2 border-primary-foreground/20 ${
                  i === 0 ? "drift-y" : i === 1 ? "drift-y-rev" : "drift-x"
                }`}
              />
            ))}
          </div>
          <Link
            to="/order"
            search={orderSearch({ item: lead.item.id })}
            className="cta-motion press-tap inline-flex items-center gap-2 bg-background px-6 py-4 font-display text-xl uppercase leading-none text-foreground focus-ppp"
          >
            {t("Grab this deal", "Profiter du rabais")}
            <ArrowRight className="cta-arrow h-5 w-5 text-primary" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
