import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LANGUAGES } from "@/i18n/types";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import { track } from "@/lib/analytics";
import { useAcquisitionPopup } from "./use-acquisition-popup";
import popupFood from "@/assets/menu-rotisserie.jpg";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The single PPP acquisition experience: language first (only when the customer
 * has never chosen one), then the account stage. No coupon, no reward promise,
 * no fake account creation — email simply carries into the real sign-up route.
 */
export function AcquisitionPopup() {
  const { open, dismiss } = useAcquisitionPopup();
  const { lang, preferredLanguage, setPreferredLanguage, tr } = usePPP();
  const navigate = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<"language" | "account">(
    preferredLanguage ? "account" : "language",
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) track("acquisition_popup_shown", { step: preferredLanguage ? "account" : "language" });
  }, [open, preferredLanguage]);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;

  const benefits = [
    tr("popup.benefitFavourites"),
    tr("popup.benefitOrders"),
    tr("popup.benefitAddresses"),
    tr("popup.benefitMembership"),
  ];

  const submitEmail = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError(true);
      return;
    }
    track("acquisition_email_started");
    dismiss();
    void navigate({ to: "/account/sign-up" });
  };

  return (
    <div
      className="dim-in fixed inset-0 z-[95] flex items-end justify-center bg-background/85 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr("popup.welcome")}
        onClick={(e) => e.stopPropagation()}
        className="sheet-up relative flex max-h-[92dvh] w-full flex-col overflow-y-auto border border-border bg-card sm:max-h-[88vh] sm:w-[min(60rem,94vw)] sm:flex-row"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Food panel — real PPP catalog photography, cropped and vignetted */}
        <div className="relative h-[170px] shrink-0 overflow-hidden sm:h-auto sm:w-[44%]">
          <img
            src={popupFood}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-background/10 sm:to-background/70" />
          <div className="absolute inset-y-0 right-0 w-px bg-primary/60" />
          <p className="absolute bottom-3 left-4 font-display text-sm uppercase tracking-[0.35em] text-foreground/80">
            PPP Pizzeria
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-8">
          <button
            ref={closeRef}
            onClick={dismiss}
            aria-label={tr("common.close")}
            className="press-tap absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center border border-border bg-background/90 focus-ppp"
          >
            <X className="h-5 w-5" />
          </button>

          {step === "language" ? (
            <>
              <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                PPP Pizzeria
              </p>
              <h2 className="mt-1 font-display text-3xl uppercase leading-none sm:text-5xl">
                {tr("popup.welcome")}
              </h2>
              <p className="mt-3 text-[0.7rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                {tr("popup.chooseLanguage")}
              </p>
              <div className="mt-4 grid gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    lang={l.htmlLang}
                    onClick={() => {
                      setPreferredLanguage(l.code);
                      track("acquisition_language_selected", { lang: l.code });
                      setStep("account");
                    }}
                    className={`press-tap flex items-center justify-between border px-4 py-3.5 text-left font-display text-xl uppercase leading-none transition-colors focus-ppp ${
                      l.code === lang
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {l.label}
                    <span className="text-[0.65rem] tracking-[0.3em] opacity-70">
                      {l.shortLabel}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 pr-10">
                <div>
                  <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
                    {tr("popup.welcome")}
                  </p>
                  <h2 className="mt-1 font-display text-3xl uppercase leading-[0.9] sm:text-[2.75rem]">
                    {tr("popup.yourPpp")}
                    <br />
                    {tr("popup.yourOrders")}
                    <br />
                    {tr("popup.yourFavourites")}
                  </h2>
                </div>
              </div>

              <p className="mt-3 max-w-prose text-sm text-muted-foreground">
                {tr("popup.description")}
              </p>

              <ul className="mt-3 grid gap-1.5">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Google slots in here without a redesign once the flag flips. */}
              {GOOGLE_SIGN_IN_ENABLED && <div className="mt-4" />}

              <label
                htmlFor="ppp-welcome-email"
                className="mt-5 block text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground"
              >
                {tr("popup.emailAddress")}
              </label>
              <input
                id="ppp-welcome-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                aria-invalid={error}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitEmail();
                }}
                className={`mt-1.5 w-full border bg-background px-3 py-3 text-base focus-ppp ${
                  error ? "border-destructive" : "border-border"
                }`}
              />
              {error && (
                <p role="alert" className="mt-1.5 text-xs text-destructive">
                  {tr("auth.invalidEmail")}
                </p>
              )}

              <button
                onClick={submitEmail}
                className="press-tap mt-3 w-full bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground transition-transform hover:-translate-y-px focus-ppp"
              >
                {tr("popup.continue")}
              </button>

              <p className="mt-3 text-center text-[0.65rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                {tr("popup.alreadyMember")}{" "}
                <button
                  onClick={() => {
                    track("acquisition_signin_clicked");
                    dismiss();
                    void navigate({ to: "/account/sign-in" });
                  }}
                  className="text-foreground underline underline-offset-4 focus-ppp"
                >
                  {tr("popup.signIn")}
                </button>
              </p>

              <button
                onClick={() => {
                  track("acquisition_guest_clicked");
                  dismiss();
                }}
                className="press-tap mt-2 w-full border border-border py-3 text-[0.7rem] font-bold uppercase tracking-[0.25em] text-muted-foreground focus-ppp"
              >
                {tr("popup.guest")}
              </button>

              <div className="mt-4 flex justify-center">
                <LanguageSwitcher variant="popup" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
