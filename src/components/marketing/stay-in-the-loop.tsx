import { useState } from "react";
import { Mail } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { marketingPersistenceEnabled } from "@/lib/marketing-consent";

/**
 * Optional marketing subscription. Consent is never pre-checked and is never
 * required to create a PPP account.
 */
export function StayInTheLoop({ compact = false }: { compact?: boolean }) {
  const { t } = usePPP();
  const [email, setEmail] = useState("");
  const [emailOffers, setEmailOffers] = useState(false);
  const [smsOffers, setSmsOffers] = useState(false);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className={`border border-border bg-card ${compact ? "p-4" : "p-5 sm:p-7"}`}
      aria-labelledby="stay-loop-title"
    >
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {t("Marketing", "Marketing")}
      </p>
      <h2
        id="stay-loop-title"
        className="mt-1 font-display text-3xl uppercase leading-none sm:text-4xl"
      >
        {t("Stay in the loop", "Restez informé")}
      </h2>
      <div className="mt-3 flex border border-border">
        <label className="sr-only" htmlFor="loop-email">
          {t("Email address", "Adresse courriel")}
        </label>
        <input
          id="loop-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("you@email.com", "vous@courriel.com")}
          className="w-full bg-secondary px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-primary px-5 text-xs font-bold uppercase tracking-widest text-primary-foreground focus-ppp"
        >
          <Mail className="h-4 w-4" />
          {t("Subscribe", "S'abonner")}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={emailOffers}
            onChange={(e) => setEmailOffers(e.target.checked)}
            className="mt-0.5 accent-[var(--primary)]"
          />
          {t(
            "Email me PPP offers and new menu drops.",
            "Recevoir les offres PPP et les nouveautés par courriel.",
          )}
        </label>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={smsOffers}
            onChange={(e) => setSmsOffers(e.target.checked)}
            className="mt-0.5 accent-[var(--primary)]"
          />
          {t("Text me offers (SMS).", "M'envoyer les offres par SMS.")}
        </label>
      </div>
      {!marketingPersistenceEnabled && (
        <p className="mt-3 text-[0.6rem] uppercase tracking-widest text-muted-foreground/70">
          {t(
            "Preview — subscriptions are not stored yet.",
            "Aperçu — les abonnements ne sont pas encore enregistrés.",
          )}
        </p>
      )}
    </form>
  );
}
