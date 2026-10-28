import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, Smartphone, Star } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { Reveal, usePrefersReducedMotion } from "@/components/motion/reveal";

/** Animated tier dial: purely decorative, never a fake points balance. */
function TierDial() {
  const reduced = usePrefersReducedMotion();
  const [sweep, setSweep] = useState(reduced ? 78 : 0);
  useEffect(() => {
    if (reduced) return;
    const id = window.requestAnimationFrame(() => setSweep(78));
    return () => window.cancelAnimationFrame(id);
  }, [reduced]);

  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (sweep / 100) * c;

  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="stroke-primary-foreground/15 fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="fill-none stroke-primary-foreground"
          style={{
            strokeDasharray: c,
            strokeDashoffset: offset,
            transition: reduced ? undefined : "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground">
        <Star className="h-6 w-6" />
        <span className="mt-1 font-display text-[0.6rem] uppercase tracking-[0.25em]">Member</span>
      </div>
    </div>
  );
}

/** Membership-pass loyalty block — QSR, not SaaS pricing cards. */
export function Rewards() {
  const { t, openOrderSheet } = usePPP();

  return (
    <section id="rewards" className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
      <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="relative overflow-hidden border border-border bg-primary p-6 lg:p-10">
          <div className="flex flex-wrap items-center gap-6">
            <TierDial />
            <div>
              <p className="font-display text-xs uppercase tracking-[0.35em] text-primary-foreground/80">
                PPP Rewards
              </p>
              <h2 className="mt-2 font-display text-5xl uppercase leading-[0.9] text-primary-foreground lg:text-7xl">
                {t("Order.", "Commandez.")}
                <br />
                {t("Earn.", "Gagnez.")}
                <br />
                {t("Come back for more.", "Revenez pour plus.")}
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-md text-sm text-primary-foreground/85">
            {t(
              "Earn on eligible direct orders, track your rewards and unlock member offers. Marketplace orders don't earn points.",
              "Gagnez sur les commandes directes admissibles, suivez vos récompenses et débloquez des offres membres. Les commandes sur les applications tierces ne donnent pas de points.",
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="#account"
              className="press-tap cta-glow bg-background px-6 py-3 font-display text-lg uppercase leading-none focus-ppp"
            >
              {t("Join rewards", "Rejoindre")}
            </a>
            <button
              onClick={openOrderSheet}
              className="press-tap border border-primary-foreground/40 px-6 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Order & earn", "Commander et gagner")}
            </button>
          </div>
          <Star className="pointer-events-none absolute -bottom-8 -right-6 h-48 w-48 text-primary-foreground/10" />
        </Reveal>

        <div className="grid gap-2">
          <Reveal delay={70} className="border border-border bg-card p-5">
            <Gift className="h-5 w-5 text-accent" />
            <h3 className="mt-3 font-display text-3xl uppercase leading-none">
              {t("Gift cards", "Cartes-cadeaux")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "Preview PPP gift cards; online purchase is not available yet.",
                "Découvrez les cartes-cadeaux PPP; l'achat en ligne n'est pas encore disponible.",
              )}
            </p>
            <Link
              to="/gift-cards"
              className="mt-3 inline-block text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
            >
              {t("View gift cards", "Voir les cartes-cadeaux")}
            </Link>
          </Reveal>
          <Reveal delay={140} className="border border-border bg-card p-5">
            <Smartphone className="h-5 w-5 text-accent" />
            <h3 className="mt-3 font-display text-3xl uppercase leading-none">
              {t("We have an app", "Nous avons une app")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "Order ahead for pickup and skip the line.",
                "Commandez à l'avance pour la cueillette et évitez la file.",
              )}
            </p>
            <a
              href="#account"
              className="mt-3 inline-block text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
            >
              {t("Get the app", "Obtenir l'app")}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
