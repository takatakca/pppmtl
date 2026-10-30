import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/components/account/auth-shell";
import { GuestVerifySheet } from "@/components/auth/guest-verify-sheet";
import { GoogleButton } from "@/components/auth/google-button";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import { usePPP } from "@/context/ppp-store";
import { useCustomerSession } from "@/lib/customer/session";
import { safeReturnTo } from "@/lib/customer/validation";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/account_/sign-in")({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string | undefined } => ({
    returnTo: typeof search["returnTo"] === "string" ? (search["returnTo"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in to PPP | PPP Pizzeria NDG" },
      {
        name: "description",
        content:
          "Sign in to PPP with your mobile number to reorder faster from PPP Pizzeria Montreal in NDG.",
      },
      { property: "og:title", content: "Sign in to PPP" },
      { property: "og:description", content: "Reorder faster with your PPP account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/account/sign-in") }],
  }),
  component: SignInPage,
});

/**
 * Sign-in = phone verification. There is no password, no e-mail credential and no "create account" step:
 * Food Hub (TAKATAK identity) creates the customer on the first verified code.
 */
function SignInPage() {
  const { t } = usePPP();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const returnTo = safeReturnTo(search.returnTo);
  const { status, accountsAvailable } = useCustomerSession();
  const closed = status !== "loading" && !accountsAvailable;

  return (
    <AuthShell
      eyebrow={t("Welcome back", "Content de vous revoir")}
      title={
        <>
          {t("Sign in to", "Connectez-vous à")}
          <br />
          <span className="text-flame">PPP</span>
        </>
      }
      intro={t(
        `Your mobile number is your account. After verifying it you'll return to ${returnTo}.`,
        `Votre numéro de cellulaire est votre compte. Après la vérification, vous reviendrez à ${returnTo}.`,
      )}
    >
      {GOOGLE_SIGN_IN_ENABLED && (
        <>
          <GoogleButton className="mb-1" />
          <div className="my-3 flex items-center gap-3 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("or", "ou")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      {status === "member" || status === "onboarding" ? (
        <div className="border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            {t("You are already signed in.", "Vous êtes déjà connecté.")}
          </p>
          <button
            type="button"
            onClick={() => void navigate({ to: returnTo })}
            className="press-tap mt-3 w-full bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
          >
            {t("Continue", "Continuer")}
          </button>
        </div>
      ) : closed ? (
        <p className="border border-border bg-card p-4 text-sm text-muted-foreground">
          {t(
            "Phone sign-in is not switched on yet. Ordering, pickup and delivery all work without an account.",
            "La connexion par téléphone n'est pas encore activée. La commande, la cueillette et la livraison fonctionnent sans compte.",
          )}
        </p>
      ) : (
        <GuestVerifySheet onVerified={() => void navigate({ to: returnTo })} />
      )}
    </AuthShell>
  );
}
