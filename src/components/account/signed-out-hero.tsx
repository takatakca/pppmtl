import { Link } from "@tanstack/react-router";
import { Clock, Gift, Heart, MapPin, ShieldCheck, Star } from "lucide-react";
import { GoogleButton } from "@/components/auth/google-button";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import { usePPP } from "@/context/ppp-store";
import { pppBusiness } from "@/config/business";

/**
 * Anonymous visitor state of /account. Loyalty-first, never guilt-trips the
 * guest path. A verified mobile number is the account (no password, nothing to
 * create). While Food Hub is not connected, the sign-in action is replaced by a
 * plain "not open yet" note instead of a button that goes nowhere.
 */
export function SignedOutHero({ accountsAvailable }: { accountsAvailable: boolean }) {
  const { t } = usePPP();

  const perks = [
    {
      icon: Clock,
      title: t("One-tap reorder", "Recommander en une touche"),
      body: t(
        "Your last PPP order, ready to send again.",
        "Votre dernière commande, prête à repartir.",
      ),
    },
    {
      icon: Star,
      title: t("Your phone is the key", "Votre numéro est la clé"),
      body: t(
        "Points and gift cards will attach to your verified number once they open.",
        "Les points et les cartes-cadeaux se rattacheront à votre numéro vérifié dès leur ouverture.",
      ),
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
        <div className="stagger">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-primary-foreground/80">
            PPP {pppBusiness.shortLocationName}
          </p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] text-primary-foreground sm:text-7xl">
            {t("My PPP", "Mon PPP")}
          </h1>
          <p className="mt-3 font-display text-2xl uppercase leading-[0.95] text-primary-foreground/90 sm:text-3xl">
            {t("Your orders.", "Vos commandes.")}
            <br />
            {t("Your favourites.", "Vos favoris.")}
            <br />
            {t("Your PPP experience.", "Votre expérience PPP.")}
          </p>
          <p className="mt-3 max-w-xl text-sm text-primary-foreground/90">
            {t(
              "Order faster, find your favourites again, and keep your PPP details in one place — or order as a guest any time.",
              "Commandez plus vite, retrouvez vos favoris et gardez vos infos PPP au même endroit — ou commandez sans compte quand vous voulez.",
            )}
          </p>

          <div className="mt-5 grid max-w-sm gap-2">
            {accountsAvailable ? (
              <>
                {GOOGLE_SIGN_IN_ENABLED && <GoogleButton />}
                <Link
                  to="/account/sign-in"
                  search={{ returnTo: "/account" }}
                  className="lift-btn press-tap bg-background py-3.5 text-center font-display text-xl uppercase leading-none focus-ppp"
                >
                  {t("Sign in with my mobile number", "Me connecter avec mon cellulaire")}
                </Link>
                <p className="text-center text-[0.7rem] text-primary-foreground/80">
                  {t(
                    "A text message code, no password. First visit? That's your account.",
                    "Un code par texto, aucun mot de passe. Première visite ? C'est votre compte.",
                  )}
                </p>
              </>
            ) : (
              <p className="border border-primary-foreground/40 px-4 py-3 text-sm text-primary-foreground/90">
                {t(
                  "Phone sign-in is not switched on yet. Ordering, pickup and delivery all work right now without an account.",
                  "La connexion par téléphone n'est pas encore activée. La commande, la cueillette et la livraison fonctionnent déjà sans compte.",
                )}
              </p>
            )}
            <Link
              to="/order"
              className="press-tap py-3 text-center text-sm font-bold uppercase tracking-widest text-primary-foreground underline underline-offset-4 focus-ppp"
            >
              {t("Continue as guest", "Continuer comme invité")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {perks.map((p) => (
          <section key={p.title} className="food-pop press-tap border border-border bg-card p-5">
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
            "Your number is verified by text message so your orders stay yours. PPP keeps no password and no customer database of its own, and never adds you to marketing without asking.",
            "Votre numéro est vérifié par texto pour que vos commandes restent les vôtres. PPP ne garde aucun mot de passe ni base de données clients, et ne vous abonne jamais au marketing sans votre accord.",
          )}
        </p>
      </section>

      <section className="mt-2 flex items-start gap-3 border border-border bg-card p-5">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          {t(
            "Gift cards don't need an account either.",
            "Les cartes-cadeaux ne nécessitent pas de compte non plus.",
          )}{" "}
          <Link to="/gift-cards" className="text-accent underline focus-ppp">
            {t("PPP gift cards", "Cartes-cadeaux PPP")}
          </Link>
        </p>
      </section>
    </>
  );
}
