import { ArrowRight, Gift, Smartphone, Star } from "lucide-react";
import { usePPP } from "@/context/ppp-store";

export function Rewards() {
  const { t } = usePPP();

  return (
    <section id="rewards" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface-panel p-8">
          <Star className="h-8 w-8 text-accent" />
          <h2 className="mt-4 font-display text-3xl uppercase">{t("PPP Rewards", "PPP Récompenses")}</h2>
          <p className="mt-3 text-muted-foreground">
            {t(
              "Earn points on every order, unlock offers, and keep receipts, favourites and reorders in one place.",
              "Accumulez des points à chaque commande, débloquez des offres et gardez reçus, favoris et recommandes au même endroit.",
            )}
          </p>
          <a
            href="#account"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary focus-ppp"
          >
            {t("Join the program", "Rejoindre le programme")} <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="surface-panel p-8">
          <Gift className="h-8 w-8 text-accent" />
          <h2 className="mt-4 font-display text-3xl uppercase">{t("Gift cards", "Cartes-cadeaux")}</h2>
          <p className="mt-3 text-muted-foreground">
            {t(
              "Give PPP to someone who deserves a poutine. Redeemable in restaurant and on direct orders.",
              "Offrez PPP à quelqu'un qui mérite une poutine. Échangeable en restaurant et sur les commandes directes.",
            )}
          </p>
          <a
            href="#account"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp"
          >
            {t("Buy a gift card", "Acheter une carte")} <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="surface-panel flex flex-col justify-between bg-primary p-8 text-primary-foreground">
          <div>
            <Smartphone className="h-8 w-8" />
            <h2 className="mt-4 font-display text-3xl uppercase leading-none">
              {t("We have an app", "On a une app")}
            </h2>
            <p className="mt-3 opacity-90">
              {t(
                "Order ahead, skip the line, reorder in two taps.",
                "Commandez à l'avance, évitez la file, recommandez en deux touches.",
              )}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#top" className="rounded-xl bg-background px-5 py-3 font-display text-base uppercase text-foreground focus-ppp">
              App Store
            </a>
            <a
              href="#top"
              className="rounded-xl border border-primary-foreground/60 px-5 py-3 font-display text-base uppercase focus-ppp"
            >
              Google Play
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}