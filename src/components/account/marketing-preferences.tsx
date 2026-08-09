import { useState } from "react";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import {
  defaultMarketingPreferences,
  marketingPersistenceEnabled,
  type MarketingChannel,
  type MarketingPreferences,
} from "@/lib/marketing-consent";

/**
 * Email / SMS / push consent toggles. Local-only state: never pre-checked,
 * never claimed as saved unless a real backend is connected.
 */
export function MarketingPreferencesPanel({ className = "" }: { className?: string }) {
  const { t } = usePPP();
  const [prefs, setPrefs] = useState<MarketingPreferences>(defaultMarketingPreferences);

  function toggle(channel: MarketingChannel) {
    setPrefs((p) => {
      const key =
        channel === "email"
          ? "emailMarketingConsent"
          : channel === "sms"
            ? "smsMarketingConsent"
            : "pushMarketingConsent";
      const current = p[key];
      const now = new Date().toISOString();
      return {
        ...p,
        [key]: current.granted
          ? { granted: false, consentedAt: current.consentedAt, revokedAt: now }
          : { granted: true, consentedAt: now, revokedAt: null },
      };
    });
  }

  const rows: { id: MarketingChannel; icon: typeof Mail; label: string; body: string }[] = [
    {
      id: "email",
      icon: Mail,
      label: t("Email offers", "Offres par courriel"),
      body: t("Menu drops, deals and member news.", "Nouveautés, promos et nouvelles membres."),
    },
    {
      id: "sms",
      icon: MessageSquare,
      label: t("SMS offers", "Offres par SMS"),
      body: t("Occasional text deals — no spam.", "Textos promotionnels occasionnels — sans abus."),
    },
    {
      id: "push",
      icon: Bell,
      label: t("Push notifications", "Notifications push"),
      body: t(
        "Order status and reorder reminders in the app.",
        "Statut de commande et rappels pour recommander dans l'app.",
      ),
    },
  ];

  return (
    <section className={`border border-border bg-card p-5 ${className}`}>
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {t("PPP Member", "Membre PPP")}
      </p>
      <h2 className="mt-1 font-display text-3xl uppercase leading-none">
        {t("Communication preferences", "Préférences de communication")}
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const key =
            r.id === "email"
              ? "emailMarketingConsent"
              : r.id === "sms"
                ? "smsMarketingConsent"
                : "pushMarketingConsent";
          const granted = prefs[key].granted;
          return (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 border border-border px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <label
                    htmlFor={`marketing-${r.id}`}
                    className="block text-sm font-bold uppercase tracking-wide"
                  >
                    {r.label}
                  </label>
                  <p className="mt-0.5 text-[0.75rem] text-muted-foreground">{r.body}</p>
                </div>
              </div>
              <input
                id={`marketing-${r.id}`}
                type="checkbox"
                role="switch"
                aria-checked={granted}
                checked={granted}
                onChange={() => toggle(r.id)}
                disabled={!marketingPersistenceEnabled}
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)] focus-ppp"
              />
            </li>
          );
        })}
      </ul>
      {!marketingPersistenceEnabled && (
        <p className="mt-3 text-[0.6rem] uppercase tracking-widest text-muted-foreground/70">
          {t(
            "Preview — preferences are not saved yet.",
            "Aperçu — les préférences ne sont pas encore enregistrées.",
          )}
        </p>
      )}
    </section>
  );
}
