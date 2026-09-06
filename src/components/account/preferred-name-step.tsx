import { useState } from "react";
import { Lock } from "lucide-react";
import { Field } from "@/components/account/field";
import { usePPP } from "@/context/ppp-store";
import { useCustomerSession } from "@/lib/customer/session";
import { preferredNameError } from "@/lib/customer/validation";

/**
 * Onboarding step between "authenticated" and "member": the customer chooses
 * what PPP calls them. Confirmed once, then locked — every receipt, greeting
 * and order uses the same name from then on.
 */
export function PreferredNameStep() {
  const { t } = usePPP();
  const { customer, lockPreferredName } = useCustomerSession();
  const [name, setName] = useState(customer?.firstName ?? "");
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const error = preferredNameError(name);
  const clean = name.trim();

  async function confirm() {
    setPending(true);
    setNotice(null);
    const result = await lockPreferredName(clean);
    setPending(false);
    if (!result.ok) {
      setConfirming(false);
      setNotice(result.message ?? null);
    }
  }

  return (
    <section className="rise-in mx-auto max-w-xl border border-border bg-card p-6 sm:p-8">
      <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
        {t("One last thing", "Une dernière chose")}
      </p>
      <h1 className="mt-1 font-display text-4xl uppercase leading-[0.88] sm:text-5xl">
        {t("What should we call you?", "Comment devons-nous vous appeler ?")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "This is the name on your PPP greetings, receipts and pickup orders.",
          "C'est le nom utilisé pour vos accueils PPP, vos reçus et vos commandes à emporter.",
        )}
      </p>

      {confirming ? (
        <div className="mt-5 border border-primary bg-primary/5 p-5">
          <Lock className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t("We'll call you", "Nous vous appellerons")}
          </p>
          <p className="mt-1 font-display text-4xl uppercase leading-none">{clean}</p>
          <p className="mt-3 text-[0.75rem] text-muted-foreground">
            {t(
              "This name is set once. After you confirm it, PPP support has to change it for you.",
              "Ce nom est défini une seule fois. Après confirmation, le soutien PPP doit le modifier pour vous.",
            )}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              onClick={confirm}
              className="press-tap bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground disabled:opacity-60 focus-ppp"
            >
              {t("Confirm this name", "Confirmer ce nom")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="press-tap border border-border py-3.5 font-display text-xl uppercase leading-none focus-ppp"
            >
              {t("Change it", "Modifier")}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="mt-5 grid gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!error) setConfirming(true);
          }}
        >
          <Field
            label={t("Preferred name", "Nom d'usage")}
            autoComplete="given-name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            {...(touched && error ? { error } : {})}
            hint={t(
              "Set once — choose the one you like.",
              "Défini une seule fois — choisissez bien.",
            )}
          />
          {notice && (
            <p className="rise-in border border-border p-3 text-[0.75rem] text-muted-foreground">
              {notice}
            </p>
          )}
          <button
            type="submit"
            className="press-tap bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp"
          >
            {t("Continue", "Continuer")}
          </button>
        </form>
      )}
    </section>
  );
}
