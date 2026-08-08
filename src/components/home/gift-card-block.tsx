import { Link } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { PPPLogo } from "@/components/brand/ppp-logo";

/** Compact homepage gift-card promo. No fake balances, no fake denominations. */
export function GiftCardBlock() {
  const { t } = usePPP();

  return (
    <section id="gift-cards" className="mx-auto max-w-[110rem] px-3 py-8 sm:px-6 lg:py-12">
      <Link
        to="/gift-cards"
        className="group grid items-center gap-5 border border-border bg-card p-5 transition-colors hover:border-primary focus-ppp sm:p-8 lg:grid-cols-[1fr_auto]"
      >
        <div>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("PPP gift cards", "Cartes-cadeaux PPP")}
          </p>
          <h2 className="mt-1 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
            {t("Give PPP.", "Offrez PPP.")}
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t(
              "Chicken, pizza and poutine on Somerled — the easiest gift in NDG.",
              "Poulet, pizza et poutine sur Somerled — le cadeau le plus simple dans NDG.",
            )}
          </p>
          <span className="press-tap mt-4 inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-lg uppercase leading-none text-primary-foreground">
            <Gift className="h-4 w-4" />
            {t("Gift cards", "Cartes-cadeaux")}
          </span>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <span aria-hidden className="absolute inset-4 -z-10 bg-primary/25 blur-2xl" />
          <div className="aspect-[1.6/1] w-full -rotate-3 border border-primary/60 bg-background p-4 shadow-xl transition-transform duration-500 ease-out group-hover:-rotate-1 group-hover:scale-[1.03]">
            <div className="flex h-full flex-col justify-between">
              <PPPLogo variant="account" className="h-12" />
              <div>
                <p className="font-display text-2xl uppercase leading-none text-flame">
                  {t("Gift card", "Carte-cadeau")}
                </p>
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
                  PPP Pizzeria · NDG
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
