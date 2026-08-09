import { Star } from "lucide-react";
import { GoogleButton } from "@/components/auth/google-button";
import { usePPP } from "@/context/ppp-store";

/**
 * Checkout identity step. Loyalty-first framing: shows what signing in earns
 * without ever blocking or shaming guest checkout. Purely presentational —
 * wire the callbacks up wherever this is mounted (cart/checkout flow).
 */
export function IdentityGate({
  onGoogle,
  onSignIn,
  onCreateAccount,
  onGuest,
  className = "",
}: {
  onGoogle?: () => void;
  onSignIn?: () => void;
  onCreateAccount?: () => void;
  onGuest?: () => void;
  className?: string;
}) {
  const { t } = usePPP();

  return (
    <div className={`border border-border bg-card p-5 sm:p-7 ${className}`}>
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {t("Before you check out", "Avant de commander")}
      </p>
      <h2 className="mt-1 font-display text-3xl uppercase leading-[0.9] sm:text-4xl">
        {t("Get your PPP points.", "Obtenez vos points PPP.")}
      </h2>
      <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
        <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {t(
          "Sign in to attach this order to your PPP account and earn eligible rewards.",
          "Connectez-vous pour associer cette commande à votre compte PPP et gagner des récompenses admissibles.",
        )}
      </p>

      <div className="mt-4 grid gap-2">
        <GoogleButton {...(onGoogle ? { onClick: onGoogle } : {})} />
        <button
          type="button"
          onClick={onSignIn}
          className="press-tap border border-border py-3.5 font-display text-lg uppercase leading-none focus-ppp"
        >
          {t("Sign in", "Se connecter")}
        </button>
        <button
          type="button"
          onClick={onCreateAccount}
          className="press-tap bg-primary py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
        >
          {t("Create account", "Créer un compte")}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("or", "ou")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={onGuest}
        className="press-tap mt-4 w-full py-2 text-center text-sm font-bold uppercase tracking-widest text-foreground underline underline-offset-4 focus-ppp"
      >
        {t("Continue as guest", "Continuer sans compte")}
      </button>
      <p className="mt-2 text-center text-[0.65rem] text-muted-foreground">
        {t(
          "No account needed — guest orders are verified by text message.",
          "Aucun compte requis — les commandes sans compte sont vérifiées par texto.",
        )}
      </p>
    </div>
  );
}
