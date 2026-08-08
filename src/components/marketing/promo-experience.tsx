import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { getDiscountedItems } from "@/lib/promotions";
import { localizedName } from "@/lib/search";
import { ProductImage } from "@/components/order/product-image";

const SEEN_KEY = "ppp.promo.seen.v1";

/**
 * One promotional moment per session, shown after the visitor engages
 * (scroll or dwell) — never on first paint, never twice.
 */
export function PromoExperience() {
  const { lang, locationId, t } = usePPP();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const deal = getDiscountedItems(locationId, 1)[0];

  useEffect(() => {
    if (!deal) return undefined;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return undefined;
    } catch {
      return undefined;
    }
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      try {
        window.sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      setOpen(true);
    };
    const onScroll = () => {
      if (window.scrollY > 600) show();
    };
    const timer = window.setTimeout(show, 12000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [deal]);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !deal) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-background/80 p-3 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Offer of the day", "Offre du jour")}
        onClick={(e) => e.stopPropagation()}
        className="promo-in w-full max-w-md border border-border bg-card"
      >
        <div className="relative">
          <ProductImage
            src={deal.item.image}
            alt={localizedName(deal.item, lang)}
            className="h-44 w-full"
          />
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label={t("Close", "Fermer")}
            className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center border border-border bg-background/90 focus-ppp"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <p className="font-display text-[0.65rem] uppercase tracking-[0.35em] text-accent">
            {t("Offer of the day", "Offre du jour")}
          </p>
          <p className="mt-1 font-display text-3xl uppercase leading-none">
            {localizedName(deal.item, lang)}
          </p>
          <p className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-4xl leading-none text-flame">
              ${(deal.item.price as number).toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground line-through">
              ${(deal.item.compareAtPrice as number).toFixed(2)}
            </span>
            <span className="bg-primary px-2 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-primary-foreground">
              −{deal.percent}%
            </span>
          </p>
          <Link
            to="/order"
            search={{ item: deal.item.id }}
            onClick={() => setOpen(false)}
            className="press-tap mt-4 block bg-primary py-3.5 text-center font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
          >
            {t("Add it to my order", "L'ajouter à ma commande")}
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 w-full py-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp"
          >
            {t("No thanks", "Non merci")}
          </button>
        </div>
      </div>
    </div>
  );
}