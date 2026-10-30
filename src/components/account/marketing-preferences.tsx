import { useState } from "react";
import { Bell, Loader2, MessageSquare } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { useCustomerSession } from "@/lib/customer/session";
import { marketingChannelPersisted } from "@/lib/marketing-consent";

/**
 * Consent toggles. "Offers & news" (text message / e-mail) is the one real flag: Food Hub keeps
 * `marketingConsent` on the customer record (Québec Law 25) and this panel reads and writes it through the
 * customer session — never pre-checked. Push notifications have no backend yet and stay a disabled preview.
 */
export function MarketingPreferencesPanel({ className = "" }: { className?: string }) {
  const { t } = usePPP();
  const { customer, updateProfile } = useCustomerSession();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const granted = customer?.marketingConsent === true;

  async function toggleOffers() {
    if (pending) return;
    setPending(true);
    setNotice(null);
    const result = await updateProfile({ marketingConsent: !granted });
    setPending(false);
    if (!result.ok) {
      setNotice(
        result.message ??
          t("Your choice was not saved. Try again.", "Votre choix n'a pas été enregistré. Réessayez."),
      );
    }
  }

  return (
    <section className={`border border-border bg-card p-5 ${className}`}>
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {t("PPP Member", "Membre PPP")}
      </p>
      <h2 className="mt-1 font-display text-3xl uppercase leading-none">
        {t("Communication preferences", "Préférences de communication")}
      </h2>
      <ul className="mt-3 space-y-2">
        <li className="flex items-start justify-between gap-3 border border-border px-4 py-3">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <label
                htmlFor="marketing-offers"
                className="block text-sm font-bold uppercase tracking-wide"
              >
                {t("Offers & news by text or e-mail", "Offres et nouvelles par texto ou courriel")}
              </label>
              <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                {t(
                  "Occasional menu drops and deals — no spam. Saved with your PPP account; order texts are always sent.",
                  "Nouveautés et promos occasionnelles — sans abus. Enregistré avec votre compte PPP; les textos de commande sont toujours envoyés.",
                )}
              </p>
            </div>
          </div>
          {pending ? (
            <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <input
              id="marketing-offers"
              type="checkbox"
              role="switch"
              aria-checked={granted}
              checked={granted}
              onChange={() => void toggleOffers()}
              disabled={!customer || !marketingChannelPersisted.sms}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)] focus-ppp"
            />
          )}
        </li>
        <li className="flex items-start justify-between gap-3 border border-border px-4 py-3 opacity-70">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <label
                htmlFor="marketing-push"
                className="block text-sm font-bold uppercase tracking-wide"
              >
                {t("Push notifications", "Notifications push")}
              </label>
              <p className="mt-0.5 text-[0.75rem] text-muted-foreground">
                {t(
                  "Not available yet — there is no PPP app to send them from.",
                  "Pas encore disponible — aucune application PPP ne peut les envoyer.",
                )}
              </p>
            </div>
          </div>
          <input
            id="marketing-push"
            type="checkbox"
            role="switch"
            aria-checked={false}
            checked={false}
            readOnly
            disabled
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)] focus-ppp"
          />
        </li>
      </ul>
      {notice && (
        <p role="alert" className="mt-3 border border-border p-3 text-[0.75rem] text-muted-foreground">
          {notice}
        </p>
      )}
    </section>
  );
}
