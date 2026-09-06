import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock, Heart, MapPin, Star, X } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { PPPLogo } from "@/components/brand/ppp-logo";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LANGUAGES } from "@/i18n/types";
import { GOOGLE_SIGN_IN_ENABLED } from "@/config/auth-flags";
import { GoogleButton } from "@/components/auth/google-button";
import { track } from "@/lib/analytics";
import { useAcquisitionPopup } from "./use-acquisition-popup";
import popupFood from "@/assets/menu-rotisserie.jpg";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The single PPP acquisition experience: language first (only when the customer
 * has never chosen one), then the join stage. No coupon, no reward promise, no
 * fake account creation — email simply carries into the real sign-up route.
 */
export function AcquisitionPopup() {
  const { open, dismiss } = useAcquisitionPopup();
  const { lang, preferredLanguage, setPreferredLanguage, tr } = usePPP();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<"language" | "account">(
    preferredLanguage ? "account" : "language",
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open)
      track("acquisition_popup_shown", { step: preferredLanguage ? "account" : "language" });
  }, [open, preferredLanguage]);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;

  const benefits = [
    { icon: Heart, label: tr("popup.benefitFavourites") },
    { icon: Clock, label: tr("popup.benefitOrders") },
    { icon: MapPin, label: tr("popup.benefitAddresses") },
    { icon: Star, label: tr("popup.benefitMembership") },
  ];

  const submitEmail = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError(true);
      return;
    }
    setSubmitting(true);
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ppp-welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="panel-in relative flex max-h-[92dvh] w-full flex-col overflow-y-auto border border-border bg-card shadow-[0_40px_120px_-40px_oklch(0_0_0/0.9)] sm:max-h-[88vh] sm:w-[min(62rem,94vw)] sm:flex-row"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Food panel — real PPP catalog photography, cropped and vignetted */}
        <div className="relative h-[180px] shrink-0 overflow-hidden sm:h-auto sm:w-[44%]">
          <img
            src={popupFood}
            alt="PPP Pizzeria rotisserie plate"
            className="image-in h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-background/10 sm:to-background/70" />
          <div className="absolute inset-y-0 right-0 hidden w-px bg-primary/60 sm:block" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-primary/60 sm:hidden" />
          <p className="absolute bottom-3 left-4 font-display text-sm uppercase tracking-[0.35em] text-foreground/80">
            PPP Pizzeria
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-8">
          <button
            ref={closeRef}
            onClick={dismiss}
            aria-label={tr("common.close")}
            className="press-tap absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center border border-border bg-background/90 focus-ppp"
          >
            <X className="h-5 w-5" />
          </button>

          {step === "language" ? (
            <div className="step-in stagger flex flex-col">
              <PPPLogo variant="account" />
              <h2
                id="ppp-welcome-title"
                className="mt-3 font-display text-3xl uppercase leading-none sm:text-5xl"
              >
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
                    aria-pressed={l.code === lang}
                    onClick={() => {
                      setPreferredLanguage(l.code);
                      track("acquisition_language_selected", { lang: l.code });
                      window.setTimeout(() => setStep("account"), 220);
                    }}
                    className={`lift-btn press-tap flex items-center gap-3 border px-4 py-3.5 text-left font-display text-xl uppercase leading-none focus-ppp ${
                      l.code === lang
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {l.label}
                    <span className="ml-auto text-[0.65rem] tracking-[0.3em] opacity-70">
                      {l.shortLabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="step-in stagger flex flex-col">
              <div className="flex items-center gap-3 pr-12">
                <PPPLogo variant="account" />
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  {tr("popup.welcome")}
                </span>
              </div>

              <h2
                id="ppp-welcome-title"
                className="mt-3 font-display text-3xl uppercase leading-[0.9] sm:text-[2.75rem]"
              >
                {tr("popup.join")}
              </h2>

              <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                {tr("popup.description")}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {benefits.map((b) => (
                  <div
                    key={b.label}
                    className="lift-btn flex items-start gap-2.5 border border-border bg-background/60 px-3 py-3"
                  >
                    <b.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm leading-snug">{b.label}</span>
                  </div>
                ))}
              </div>

              {/* Google slots in here without a redesign once the flag flips. */}
              {GOOGLE_SIGN_IN_ENABLED && (
                <div className="mt-4">
                  <GoogleButton />
                </div>
              )}

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
                placeholder={tr("popup.emailPlaceholder")}
                value={email}
                aria-invalid={error}
                aria-describedby={error ? "ppp-welcome-email-error" : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitEmail();
                }}
                className={`mt-1.5 w-full border bg-background px-4 py-3.5 text-base transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus-ppp ${
                  error ? "border-destructive" : "border-border"
                }`}
              />
              {error && (
                <p
                  id="ppp-welcome-email-error"
                  role="alert"
                  className="mt-1.5 text-xs text-destructive"
                >
                  {tr("auth.invalidEmail")}
                </p>
              )}

              <button
                onClick={submitEmail}
                disabled={submitting}
                className="lift-btn press-tap mt-3 w-full bg-primary py-3.5 font-display text-xl uppercase leading-none text-primary-foreground focus-ppp disabled:opacity-70"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
