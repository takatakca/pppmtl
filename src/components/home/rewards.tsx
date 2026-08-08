import { Gift, Smartphone, Star } from "lucide-react";
import { usePPP } from "@/context/ppp-store";

/** Membership-pass loyalty block — QSR, not SaaS pricing cards. */
export function Rewards() {
  const { t, openOrderSheet } = usePPP();

  return (
    <section id="rewards" className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
      <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden border border-border bg-primary p-6 lg:p-10">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-primary-foreground/80">
            PPP Rewards
          </p>
          <h2 className="mt-2 font-display text-5xl uppercase leading-[0.9] text-primary-foreground lg:text-7xl">
            {t("Points on every", "Des points sur chaque")}
            <br />
            {t("direct order", "commande directe")}
          </h2>
          <p className="mt-3 max-w-md text-sm text-primary-foreground/85">
            {t(
              "Order straight from PPP, collect points and unlock free food. Marketplace orders don't earn points.",
              "Commandez directement chez PPP, accumulez des points et débloquez de la nourriture gratuite. Les commandes sur les applications tierces ne donnent pas de points.",
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="#account"
              className="bg-background px-6 py-3 font-display text-lg uppercase leading-none focus-ppp"
            >
              {t("Join rewards", "Rejoindre")}
            </a>
            <button
              onClick={openOrderSheet}
              className="border border-primary-foreground/40 px-6 py-3 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
            >
              {t("Order & earn", "Commander et gagner")}
            </button>
          </div>
          <Star className="pointer-events-none absolute -bottom-8 -right-6 h-48 w-48 text-primary-foreground/10" />
        </div>

        <div className="grid gap-2">
          <div className="border border-border bg-card p-5">
            <Gift className="h-5 w-5 text-accent" />
            <h3 className="mt-3 font-display text-3xl uppercase leading-none">
              {t("Gift cards", "Cartes-cadeaux")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "Send a PPP card in seconds — usable for pickup and delivery.",
                "Envoyez une carte PPP en quelques secondes — valide en cueillette et en livraison.",
              )}
            </p>
            <a
              href="#account"
              className="mt-3 inline-block text-[0.65rem] font-bold uppercase tracking-[0.25em] text-accent focus-ppp"
            >
              {t("Buy a gift card", "Acheter une carte")}
            </a>
          </div>
          <div className="border border-border bg-card p-5">
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
          </div>
        </div>
      </div>
    </section>
  );
}