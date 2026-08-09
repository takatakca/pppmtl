import { Link } from "@tanstack/react-router";
import { Clock, Gift, Heart, MapPin, ShieldCheck, Star } from "lucide-react";
import { GoogleButton } from "@/components/auth/google-button";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import { usePPP } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";

/**
 * Anonymous visitor state of /account. Loyalty-first, never guilt-trips the
 * guest path. When accounts are not open yet, sign-in actions are replaced by
 * a plain "coming soon" note instead of buttons that go nowhere.
 */
export function SignedOutHero({ accountsAvailable }: { accountsAvailable: boolean }) {
  const { t } = usePPP();

  const perks = [
    {
      icon: Clock,
      title: t("One-tap reorder", "Recommander en une touche"),
      body: t("Your last PPP order, ready to send again.", "Votre dernière commande, prête à repartir."),
    },
    {
      icon: Star,
      title: t("Keep your points", "Conservez vos points"),
      body: t("Rewards follow your account, not your device.", "Les points suivent votre compte, pas l'appareil."),
    },
    {
      icon: Heart,
      title: t("Saved favourites", "Favoris enregistrés"),
      body: t("The combos you actually order, up front.", "Vos combos habituels, tout en haut."),
    },
    {
      icon: MapPin,
      title: t("Saved addresses", "Adresses enregistrées"),
      body: t("Delivery details filled in for you.", "Vos infos de livraison déjà remplies."),
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden border border-border bg-primary p-6 sm:p-10">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-primary-foreground/80">
          PPP {pppBusiness.shortLocationName}
        </p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] text-primary-foreground sm:text-7xl">
          {t("My PPP", "Mon PPP")}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-primary-foreground/90">
          {t(
            "One identity for every PPP order: faster checkout, your rewards, your favourites — and you can always order as a guest.",
            "Une seule identité pour toutes vos commandes PPP : paiement plus rapide, vos points, vos favoris — et vous pouvez toujours commander sans compte.",
          )}
        </p>

        <div className="mt-5 grid max-w-sm gap-2">
          {accountsAvailable ? (
            <>
              {GOOGLE_SIGN_IN_ENABLED && <GoogleButton />}
              <Link
                to="/account/sign-up"
                className="press-tap bg-background py-3.5 text-center font-display text-xl uppercase leading-none focus-ppp"
              >
                {t("Create my PPP account", "Créer mon compte PPP")}
              </Link>
              <Link
                to="/account/sign-in"
                search={{ returnTo: "/account" }}
                className="press-tap border border-primary-foreground/40 py-3.5 text-center font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
              >
                {t("Sign in", "Se connecter")}
              </Link>
            </>
          ) : (
            <p className="border border-primary-foreground/40 px-4 py-3 text-sm text-primary-foreground/90">
              {t(
                "PPP accounts open soon. Ordering, pickup and delivery all work right now without one.",
                "Les comptes PPP arrivent bientôt. La commande, la cueillette et la livraison fonctionnent déjà sans compte.",
              )}
            </p>
          )}
          <Link
            to="/order"
            className="press-tap py-3 text-center text-sm font-bold uppercase tracking-widest text-primary-foreground underline underline-offset-4 focus-ppp"
          >
            {t("Order without an account", "Commander sans compte")}
          </Link>
        </div>
      </section>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {perks.map((p) => (
          <section key={p.title} className="border border-border bg-card p-5">
            <p.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-display text-2xl uppercase leading-none">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-2 flex items-start gap-3 border border-border bg-card p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground">
          {t(
            "Guest orders are verified by text message so your order stays yours. We never create an account for you, and we never add you to marketing without asking.",
            "Les commandes sans compte sont vérifiées par texto pour rester les vôtres. Nous ne créons jamais de compte à votre place et ne vous abonnons jamais au marketing sans votre accord.",
          )}
        </p>
      </section>

      <section className="mt-2 flex items-start gap-3 border border-border bg-card p-5">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          {t(
            "Gift cards don't need an account either — buy and send one any time.",
            "Les cartes-cadeaux ne nécessitent pas de compte — achetez-en une quand vous voulez.",
          )}{" "}
          <Link to="/gift-cards" className="text-accent underline focus-ppp">
            {t("PPP gift cards", "Cartes-cadeaux PPP")}
          </Link>
        </p>
      </section>
    </>
  );
}