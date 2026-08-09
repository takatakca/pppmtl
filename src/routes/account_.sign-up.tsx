import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/account/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import { Field, PasswordField } from "@/components/account/field";
import { usePPP } from "@/context/ppp-store";
import { authRepository } from "@/lib/customer/repositories";
import {
  emailError,
  maskEmail,
  normalizeUsername,
  passwordError,
  passwordStrength,
  usernameError,
} from "@/lib/customer/validation";
import { canonicalUrl } from "@/config/site";

export const Route = createFileRoute("/account_/sign-up")({
  head: () => ({
    meta: [
      { title: "Create your PPP account | PPP Pizzeria NDG" },
      {
        name: "description",
        content:
          "Create a PPP account to order faster, save favourites, reorder past meals and keep your rewards at PPP Pizzeria Montreal in Notre-Dame-de-Grâce.",
      },
      { property: "og:title", content: "Create your PPP account" },
      {
        property: "og:description",
        content: "Order faster, save favourites and keep your PPP rewards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/account/sign-up") }],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { t } = usePPP();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const errors = {
    email: touched ? emailError(email) : null,
    username: touched ? usernameError(username) : null,
    password: touched ? passwordError(password) : null,
    confirm:
      touched && confirm !== password
        ? t("Passwords do not match.", "Les mots de passe ne correspondent pas.")
        : null,
  };
  const valid =
    !emailError(email) &&
    !usernameError(username) &&
    !passwordError(password) &&
    confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setPending(true);
    setNotice(null);
    const result = await authRepository.signUp({
      email: email.trim(),
      username: normalizeUsername(username),
      password,
      ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
    });
    setPending(false);
    // Password never leaves the form: clear it whatever the outcome.
    setPassword("");
    setConfirm("");
    if (result.ok) setSentTo(result.data.verificationEmailSentTo);
    else setNotice(result.message);
  }

  if (sentTo) {
    return (
      <AuthShell
        eyebrow={t("Almost there", "Presque terminé")}
        title={t("Check your email", "Vérifiez vos courriels")}
      >
        <div className="rise-in border border-border bg-card p-5">
          <MailCheck className="h-6 w-6 text-accent" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t("We sent a verification link to:", "Nous avons envoyé un lien de vérification à :")}
          </p>
          <p className="mt-1 font-display text-2xl uppercase">{maskEmail(sentTo)}</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={t("PPP customer account", "Compte client PPP")}
      title={
        <>
          {t("Create your", "Créez votre")}
          <br />
          <span className="text-flame">{t("PPP account", "compte PPP")}</span>
        </>
      }
      intro={t(
        "Order faster, save favourites, reorder past meals, keep your rewards, save delivery addresses and get member offers.",
        "Commandez plus vite, enregistrez vos favoris, recommandez vos repas, conservez vos points, sauvegardez vos adresses et recevez les offres membres.",
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
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <Field
          label={t("Email", "Courriel")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          {...(errors.email ? { error: errors.email } : {})}
        />
        <Field
          label={t("Username", "Nom d'utilisateur")}
          value={username}
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
          {...(errors.username
            ? { error: errors.username }
            : {
                hint: t(
                  "3–30 characters, letters and numbers.",
                  "3 à 30 caractères, lettres et chiffres.",
                ),
              })}
        />
        <Field
          label={t("First name (optional)", "Prénom (facultatif)")}
          value={firstName}
          autoComplete="given-name"
          onChange={(e) => setFirstName(e.target.value)}
        />
        <div>
          <PasswordField
            label={t("Password", "Mot de passe")}
            value={password}
            onValueChange={setPassword}
            capsHint
            {...(errors.password ? { error: errors.password } : {})}
          />
          {password.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="flex h-1 flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-full flex-1 transition-colors ${
                      i < strength.score ? "bg-accent" : "bg-muted"
                    }`}
                  />
                ))}
              </span>
              <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                {strength.label}
              </span>
            </div>
          )}
        </div>
        <PasswordField
          label={t("Confirm password", "Confirmer le mot de passe")}
          value={confirm}
          onValueChange={setConfirm}
          {...(errors.confirm ? { error: errors.confirm } : {})}
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
          {t("Create my PPP account", "Créer mon compte PPP")}
        </button>

        <p className="text-center text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          {t("Already have an account?", "Vous avez déjà un compte ?")}{" "}
          <Link to="/account/sign-in" className="text-accent underline focus-ppp">
            {t("Sign in", "Se connecter")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
