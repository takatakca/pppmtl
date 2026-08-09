import { Link } from "@tanstack/react-router";
import { Clock, Heart, MapPin, Star, UserPlus, Zap } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { Reveal } from "@/components/motion/reveal";
import { GoogleButton } from "@/components/auth/google-button";

/** Homepage entry point into the PPP customer account (create / sign in). */
export function AccountModule() {
  const { t } = usePPP();

  const perks = [
    { icon: Zap, label: t("Order faster", "Commandez plus vite") },
    { icon: Heart, label: t("Save favourites", "Favoris enregistrés") },
    { icon: Clock, label: t("Reorder in one tap", "Recommandez en 1 touche") },
    { icon: Star, label: t("Keep your rewards", "Conservez vos points") },
    { icon: MapPin, label: t("Saved addresses", "Adresses enregistrées") },
    { icon: UserPlus, label: t("Member offers", "Offres membres") },
  ];

  return (
    <section id="account" className="mx-auto max-w-[110rem] px-3 pb-10 sm:px-6 lg:pb-14">
      <Reveal className="grid gap-0 border border-border bg-card lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5 sm:p-8">
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("PPP customer account", "Compte client PPP")}
          </p>
          <h2 className="mt-1 font-display text-4xl uppercase leading-[0.88] sm:text-6xl">
            {t("Join PPP.", "Rejoignez PPP.")}{" "}
            <span className="text-flame">{t("Eat better.", "Mangez mieux.")}</span>
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-1.5">
            {perks.map((p) => (
              <li
                key={p.label}
                className="flex items-center gap-2 border border-border px-2.5 py-2 text-[0.68rem] font-bold uppercase tracking-wide"
              >
                <p.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid content-center gap-2 border-t border-border p-5 sm:p-8 lg:border-l lg:border-t-0">
          <GoogleButton />
          <Link
            to="/account/sign-up"
            className="press-tap cta-glow bg-primary py-3.5 text-center font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
          >
            {t("Create my account", "Créer mon compte")}
          </Link>
          <Link
            to="/account/sign-in"
            search={{ returnTo: "/account" }}
            className="press-tap border border-border py-3.5 text-center font-display text-xl uppercase leading-none focus-ppp"
          >
            {t("Sign in", "Se connecter")}
          </Link>
          <Link
            to="/order"
            className="text-center text-[0.65rem] uppercase tracking-widest text-muted-foreground underline focus-ppp"
          >
            {t("Or order as a guest", "Ou commander sans compte")}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
