import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/account/auth-shell";
import { Field } from "@/components/account/field";
import { usePPP } from "@/context/ppp-store";
import { authRepository } from "@/lib/customer/repositories";
import { emailError, maskEmail } from "@/lib/customer/validation";

export const Route = createFileRoute("/account_/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your PPP password | PPP Pizzeria NDG" },
      {
        name: "description",
        content: "Request a secure password reset link for your PPP customer account.",
      },
      { property: "og:title", content: "Reset your PPP password" },
      { property: "og:description", content: "Request a secure password reset link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/account/forgot-password" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = usePPP();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (emailError(email)) return;
    setPending(true);
    setNotice(null);
    const result = await authRepository.requestPasswordReset(email.trim());
    setPending(false);
    if (result.ok) setSentTo(email.trim());
    else setNotice(result.message);
  }

  return (
    <AuthShell
      eyebrow={t("Account help", "Aide au compte")}
      title={t("Reset your password", "Réinitialiser le mot de passe")}
      intro={t(
        "Enter the email on your PPP account and we'll send a secure reset link.",
        "Entrez le courriel de votre compte PPP et nous enverrons un lien sécurisé.",
      )}
    >
      {sentTo ? (
        <div className="rise-in border border-border bg-card p-5">
          <MailCheck className="h-6 w-6 text-accent" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t(
              "If that account exists, a reset link was sent to:",
              "Si ce compte existe, un lien a été envoyé à :",
            )}
          </p>
          <p className="mt-1 font-display text-2xl uppercase">{maskEmail(sentTo)}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-3" noValidate>
          <Field
            label={t("Email", "Courriel")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...(touched && emailError(email) ? { error: emailError(email) } : {})}
          />
          {notice && (
            <p className="rise-in border border-border bg-card p-3 text-[0.75rem] text-muted-foreground">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="press-tap bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground disabled:opacity-60 focus-ppp"
          >
            {t("Send reset link", "Envoyer le lien")}
          </button>
          <p className="text-center text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            <Link to="/account/sign-in" className="text-accent underline focus-ppp">
              {t("Back to sign in", "Retour à la connexion")}
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
