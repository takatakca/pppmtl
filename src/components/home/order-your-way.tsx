import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePPP } from "@/context/ppp-store";
import { orderingChannels } from "@/config/external-presence";
import { trackExternalOrder } from "@/lib/analytics";
import { Reveal } from "@/components/motion/reveal";

/**
 * "Order PPP your way" — PPP Direct stays visually dominant, the three
 * marketplaces are clearly available but secondary.
 */
export function OrderYourWay() {
  const { t, openOrderSheet } = usePPP();

  return (
    <section id="order-your-way" className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
      <Reveal>
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {t("Online ordering", "Commande en ligne")}
        </p>
        <h2 className="mt-1 font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
          {t("Order PPP", "Commandez PPP")}{" "}
          <span className="text-flame">{t("your way", "à votre façon")}</span>
        </h2>
      </Reveal>

      <Reveal delay={80} className="mt-5 grid gap-2 border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("Best price · earn points", "Meilleur prix · gagnez des points")}
            </p>
            <h3 className="mt-1 font-display text-4xl uppercase leading-none sm:text-5xl">
              {t("Order direct with PPP", "Commander direct avec PPP")}
            </h3>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {t(
                "Pickup or delivery straight from our NDG kitchen on Somerled — full menu, every option, PPP Rewards on every order.",
                "Cueillette ou livraison directement de notre cuisine NDG sur Somerled — menu complet, toutes les options, points PPP à chaque commande.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/order"
              className="press-tap cta-glow inline-flex items-center gap-2 bg-primary px-7 py-4 font-display text-2xl uppercase leading-none text-primary-foreground focus-ppp"
            >
              <Sparkles className="h-5 w-5" />
              {t("Start order", "Commander")}
            </Link>
            <button
              onClick={openOrderSheet}
              className="press-tap border border-border px-5 py-4 font-display text-lg uppercase leading-none transition-colors hover:border-primary focus-ppp"
            >
              {t("Other ways to order", "Autres façons de commander")}
            </button>
          </div>
        </div>
      </Reveal>

      <p className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
        {t("Or order with a delivery app", "Ou commandez avec une app de livraison")}
      </p>
      <ul className="mt-2 -mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {orderingChannels.map((c, i) => (
          <li key={c.id} className="min-w-[11rem] shrink-0 snap-start sm:min-w-0">
            <Reveal delay={120 + i * 90}>
              <a
                href={c.url ?? "#order-your-way"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackExternalOrder(c.id)}
                aria-label={`${c.labelEn} — ${c.name}`}
                className="press-tap group flex h-full flex-col justify-between gap-4 border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary focus-ppp"
              >
                <img
                  src={c.logo ?? ""}
                  alt={c.name}
                  loading="lazy"
                  className="h-10 w-auto max-w-full self-start transition-transform duration-300 group-hover:-translate-y-1"
                />
                <span>
                  <span className="block font-display text-2xl uppercase leading-none">
                    {c.name}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {t(c.labelEn, c.labelFr)}
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </span>
              </a>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
