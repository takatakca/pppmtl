import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Star, X } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { getDiscountedItems } from "@/lib/promotions";
import { menuRepository } from "@/lib/menu-repository";
import { localizedName } from "@/lib/search";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { orderSearch } from "@/lib/order-links";

const SEEN_KEY = "ppp.promo.seen.v3";

type Campaign = "deal" | "popular" | "account";

/**
 * One marketing campaign per session, chosen by priority:
 * a real discount beats a real bestseller, which beats the account prompt.
 * Never fires on first paint — only after genuine engagement.
 */
export function PromoExperience() {
  const { lang, locationId, t } = usePPP();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const deal = getDiscountedItems(locationId, 1)[0];
  const popular = menuRepository.getPopularItems(locationId, 1)[0];
  const campaign: Campaign = deal ? "deal" : popular ? "popular" : "account";

  useEffect(() => {
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
      const depth = window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1);
      if (depth > 0.35) show();
    };
    const timer = window.setTimeout(show, 8000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const hero = campaign === "deal" ? deal!.item : campaign === "popular" ? popular! : null;

  const eyebrow =
    campaign === "deal"
      ? t("Offer of the day", "Offre du jour")
      : campaign === "popular"
        ? t("Most ordered right now", "Le plus commandé")
        : t("Your PPP account", "Votre compte PPP");

  const title =
    campaign === "account"
      ? t("Make your next order faster", "Commandez plus vite la prochaine fois")
      : localizedName(hero!, lang);

  return (
    <div
      className="dim-in fixed inset-0 z-[95] flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={eyebrow}
        onClick={(e) => e.stopPropagation()}
        className="sheet-up max-h-[75vh] w-full overflow-y-auto border border-border bg-card sm:max-h-none sm:max-w-[34rem]"
      >
        <div className="relative">
          {hero ? (
            <MenuItemImage
              src={hero.image}
              alt={localizedName(hero, lang)}
              size="hero"
              className="zoom-reveal h-40 w-full sm:h-52"
              priority
            />
          ) : (
            <div className="angle-panel flex h-32 w-full items-center justify-center bg-primary sm:h-40">
              <Star className="h-12 w-12 text-primary-foreground/40" />
            </div>
          )}
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label={t("Close", "Fermer")}
            className="press-tap absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center border border-border bg-background/90 focus-ppp"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <p className="inline-flex items-center gap-1.5 font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {campaign === "popular" && <Flame className="h-3.5 w-3.5" />}
            {eyebrow}
          </p>
          <p className="mt-1 font-display text-2xl uppercase leading-none sm:text-4xl">{title}</p>

          {campaign === "deal" && (
            <p className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className="price-in font-display text-4xl leading-none text-flame">
                ${(deal!.item.price as number).toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                ${(deal!.item.compareAtPrice as number).toFixed(2)}
              </span>
              <span className="sale-pop bg-primary px-2 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-primary-foreground">
                {deal!.percent}% {t("OFF", "DE RABAIS")}
              </span>
            </p>
          )}

          {campaign === "popular" && popular!.price !== null && (
            <p className="price-in mt-2 font-display text-4xl leading-none text-flame">
              ${popular!.price.toFixed(2)}
            </p>
          )}

          {campaign === "account" && (
            <ul className="mt-3 grid gap-1 text-sm text-muted-foreground">
              {[
                t("Save your favourites", "Enregistrez vos favoris"),
                t("Reorder past meals", "Recommandez vos repas"),
                t("Keep your rewards", "Conservez vos points"),
              ].map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          )}

          {campaign === "account" ? (
            <Link
              to="/account/sign-up"
              onClick={() => setOpen(false)}
              className="press-tap mt-4 block bg-primary py-3.5 text-center font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Create account", "Créer un compte")}
            </Link>
          ) : (
            <Link
              to="/order"
              search={orderSearch({ item: hero!.id })}
              onClick={() => setOpen(false)}
              className="press-tap mt-4 block bg-primary py-3.5 text-center font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Add it to my order", "L'ajouter à ma commande")}
            </Link>
          )}
          <button
            onClick={() => setOpen(false)}
            className="mt-2 w-full py-2 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground focus-ppp"
          >
            {campaign === "account" ? t("Maybe later", "Plus tard") : t("No thanks", "Non merci")}
          </button>
        </div>
      </div>
    </div>
  );
}
