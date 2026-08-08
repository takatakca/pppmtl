import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/account/auth-shell";
import { Field, PasswordField } from "@/components/account/field";
import { usePPP } from "@/context/ppp-store";
import { authRepository } from "@/lib/customer/repositories";
import { emailError, safeReturnTo } from "@/lib/customer/validation";

export const Route = createFileRoute("/account_/sign-in")({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string | undefined } => ({
    returnTo: typeof search["returnTo"] === "string" ? (search["returnTo"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in to PPP | PPP Pizzeria NDG" },
      {
        name: "description",
        content: "Sign in to your PPP account to reorder faster from PPP Pizzeria Montreal in NDG.",
      },
      { property: "og:title", content: "Sign in to PPP" },
      { property: "og:description", content: "Reorder faster with your PPP account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/account/sign-in" }],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { t } = usePPP();
  const search = Route.useSearch();
  const returnTo = safeReturnTo(search.returnTo);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (emailError(email) || password.length === 0) return;
    setPending(true);
    setNotice(null);
    const result = await authRepository.signIn({ email: email.trim(), password });
    setPending(false);
    setPassword("");
    if (!result.ok) setNotice(result.message);
  }

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
        `After signing in you'll return to ${returnTo}.`,
        `Après la connexion, vous reviendrez à ${returnTo}.`,
      )}
    >
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <Field
          label={t("Email", "Courriel")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          {...(touched && emailError(email) ? { error: emailError(email) } : {})}
        />
        <PasswordField
          label={t("Password", "Mot de passe")}
          value={password}
          onValueChange={setPassword}
          autoComplete="current-password"
          capsHint
        />
        {notice && (
          <p className="rise-in border border-border bg-card p-3 text-[0.75rem] text-muted-foreground">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="press-tap mt-1 bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground disabled:opacity-60 focus-ppp"
        >
          {t("Sign in", "Se connecter")}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          <Link to="/account/forgot-password" className="text-accent underline focus-ppp">
            {t("Forgot password?", "Mot de passe oublié ?")}
          </Link>
          <Link to="/account/sign-up" className="text-accent underline focus-ppp">
            {t("Create an account", "Créer un compte")}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
