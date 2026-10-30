import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { authRepository } from "@/lib/customer/repositories";
import { useCustomerSession } from "@/lib/customer/session";
import type { AuthResult, AuthResultCode, RestaurantCustomer } from "@/lib/customer/types";

/** When the server function itself cannot be reached, say so — never a fake "code sent" or "verified". */
function unreachable<T>(): AuthResult<T> {
  return {
    ok: false,
    code: "unavailable",
    message: "We could not reach Food Hub. Check your connection and try again.",
  };
}

/**
 * Phone verification = sign-in = account. Food Hub (TAKATAK identity) texts the code and creates the customer
 * on the first verified code; this sheet only drives that flow through the site's server functions. When
 * Food Hub is not connected, or its customer routes are not deployed yet, the sheet says so — never a fake
 * success, never a fake "code sent".
 */

const RESEND_COOLDOWN_S = 30;
/** Food Hub voids the code after 5 wrong tries. */
const MAX_ATTEMPTS = 5;
const CODE_LENGTH = 6;

type Step = "phone" | "otp" | "verified";

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function formatCanadianPhone(raw: string) {
  const d = digitsOnly(raw).slice(0, 10);
  const area = d.slice(0, 3);
  const mid = d.slice(3, 6);
  const last = d.slice(6, 10);
  if (d.length > 6) return `(${area}) ${mid}-${last}`;
  if (d.length > 3) return `(${area}) ${mid}`;
  if (d.length > 0) return `(${area}`;
  return "";
}

export function GuestVerifySheet({
  onVerified,
  onCancel,
  className = "",
  initialPhone = "",
}: {
  /** Called once with the verified number (E.164); the session is already refreshed. */
  onVerified?: (phone: string) => void;
  onCancel?: () => void;
  className?: string;
  /** Pre-fill from the checkout phone field. */
  initialPhone?: string;
}) {
  const { t, lang } = usePPP();
  const { refresh } = useCustomerSession();
  const [step, setStep] = useState<Step>("phone");
  const [phoneDisplay, setPhoneDisplay] = useState(() => formatCanadianPhone(initialPhone));
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [voided, setVoided] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const phoneDigits = digitsOnly(phoneDisplay);
  const phoneValid = phoneDigits.length === 10;
  const locked = voided || attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (step !== "otp" || cooldown <= 0) return undefined;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [step, cooldown]);

  /** Honest wording per outcome; Food Hub's own text is never shown raw. */
  function messageFor(code: AuthResultCode, fallback: string, retryAfterS?: number): string {
    switch (code) {
      case "rate_limited":
        return retryAfterS
          ? t(
              `Too many requests for this number. Try again in ${retryAfterS}s.`,
              `Trop de demandes pour ce numéro. Réessayez dans ${retryAfterS}s.`,
            )
          : t("Too many requests. Please wait a moment.", "Trop de demandes. Patientez un instant.");
      case "wrong_code":
        return t(
          "That code is not right. Check the text message and try again.",
          "Ce code n'est pas bon. Vérifiez le texto et réessayez.",
        );
      case "code_void":
        return t(
          "That code is no longer valid. Request a new one.",
          "Ce code n'est plus valide. Demandez-en un nouveau.",
        );
      case "invalid":
        return t(
          "Enter a 10-digit Canadian mobile number.",
          "Entrez un numéro de cellulaire canadien à 10 chiffres.",
        );
      case "signed_out":
        return t("Please verify your number again.", "Veuillez vérifier votre numéro à nouveau.");
      default:
        return fallback;
    }
  }

  const unavailableFor = (message: string) =>
    /not open yet|not available yet|not connected/i.test(message)
      ? t(
          "Phone sign-in is not available yet. You can still order as a guest.",
          "La connexion par téléphone n'est pas encore disponible. Vous pouvez quand même commander sans compte.",
        )
      : /unavailable|could not reach/i.test(message)
        ? t(
            "We could not reach the verification service. Please try again in a moment.",
            "Impossible de joindre le service de vérification. Réessayez dans un instant.",
          )
        : message;

  function resetOtp() {
    setDigits(Array(CODE_LENGTH).fill(""));
    setOtpError(null);
    setAttempts(0);
    setVoided(false);
  }

  async function requestCode(resending: boolean) {
    if (!phoneValid) {
      setPhoneError(
        t("Enter a 10-digit phone number.", "Entrez un numéro de téléphone à 10 chiffres."),
      );
      return;
    }
    setSending(true);
    setPhoneError(null);
    const result = await authRepository
      .startVerification(phoneDigits, lang === "fr" ? "fr" : "en")
      .catch(() => unreachable<{ expiresInS: number }>());
    setSending(false);
    if (!result.ok) {
      const message = unavailableFor(messageFor(result.code, result.message, result.retryAfterS));
      if (resending) {
        setOtpError(message);
        if (result.code === "rate_limited" && result.retryAfterS) setCooldown(result.retryAfterS);
      } else {
        setPhoneError(message);
      }
      return;
    }
    setStep("otp");
    resetOtp();
    setCooldown(RESEND_COOLDOWN_S);
    window.requestAnimationFrame(() => inputsRef.current[0]?.focus());
  }

  const sendCode = () => requestCode(false);

  async function resend() {
    if (cooldown > 0 || sending) return;
    await requestCode(true);
  }

  function setDigitAt(index: number, value: string) {
    const clean = digitsOnly(value).slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[index] = clean;
      return next;
    });
    if (clean && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter") void verify();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = digitsOnly(e.clipboardData.getData("text")).slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i] ?? "";
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function verify() {
    if (locked || verifying) return;
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setOtpError(t("Enter the 6-digit code.", "Entrez le code à 6 chiffres."));
      return;
    }
    setVerifying(true);
    setOtpError(null);
    const result = await authRepository
      .checkVerification(phoneDigits, code)
      .catch(() => unreachable<RestaurantCustomer>());
    setVerifying(false);
    if (!result.ok) {
      if (result.code === "wrong_code") {
        setAttempts((a) =>
          result.attemptsLeft !== undefined ? MAX_ATTEMPTS - result.attemptsLeft : a + 1,
        );
      } else if (result.code === "code_void") {
        setVoided(true);
      }
      setOtpError(unavailableFor(messageFor(result.code, result.message, result.retryAfterS)));
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
      return;
    }
    setVerifiedPhone(result.data.phone);
    setStep("verified");
    // The HttpOnly session cookie is already set by the server: load the account projection.
    await refresh();
    onVerified?.(result.data.phone);
  }

  return (
    <div className={`border border-border bg-card p-5 sm:p-7 ${className}`}>
      {step === "phone" && (
        <>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("Your PPP account", "Votre compte PPP")}
          </p>
          <h2 className="mt-1 font-display text-3xl uppercase leading-[0.9]">
            {t("Verify your number", "Vérifiez votre numéro")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "We'll text you a code. Your verified number is your account — no password, nothing to create.",
              "Nous vous enverrons un code par texto. Votre numéro vérifié est votre compte — aucun mot de passe, rien à créer.",
            )}
          </p>
          <label className="mt-4 block">
            <span className="block text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Mobile phone", "Téléphone mobile")}
            </span>
            <span className="mt-1 flex items-stretch border border-border bg-background focus-within:border-primary">
              <span className="flex select-none items-center px-3 text-sm text-muted-foreground">
                +1
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="(514) 555-0123"
                value={phoneDisplay}
                onChange={(e) => setPhoneDisplay(formatCanadianPhone(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendCode();
                }}
                className="w-full bg-transparent py-3 pr-3 text-lg outline-none focus-ppp"
              />
            </span>
            {phoneError && (
              <span role="alert" className="mt-1 block text-[0.7rem] text-primary">
                {phoneError}
              </span>
            )}
          </label>
          <p className="mt-2 text-[0.7rem] text-muted-foreground">
            {t(
              "Used to confirm your orders and sign you in. Standard message rates may apply.",
              "Utilisé pour confirmer vos commandes et vous connecter. Des frais de messagerie standards peuvent s'appliquer.",
            )}
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={sendCode}
              disabled={sending}
              className="press-tap inline-flex items-center justify-center gap-2 bg-primary py-3.5 font-display text-lg uppercase leading-none text-primary-foreground disabled:opacity-60 focus-ppp"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Send code", "Envoyer le code")}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="press-tap py-2 text-center text-[0.7rem] uppercase tracking-widest text-muted-foreground underline focus-ppp"
              >
                {t("Cancel", "Annuler")}
              </button>
            )}
          </div>
        </>
      )}

      {step === "otp" && (
        <>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("Verify your number", "Vérifiez votre numéro")}
          </p>
          <h2 className="mt-1 font-display text-3xl uppercase leading-[0.9]">
            {t("Enter your code", "Entrez votre code")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Code sent to", "Code envoyé au")} +1 {phoneDisplay}.{" "}
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                resetOtp();
              }}
              className="text-accent underline focus-ppp"
            >
              {t("Edit number", "Modifier le numéro")}
            </button>
          </p>

          <div className="mt-4 flex justify-between gap-1.5 sm:gap-2" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={d}
                disabled={locked || verifying}
                onChange={(e) => setDigitAt(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                aria-label={t(`Digit ${i + 1}`, `Chiffre ${i + 1}`)}
                className="h-14 w-full max-w-12 border border-border bg-background text-center font-display text-2xl outline-none focus:border-primary focus-ppp disabled:opacity-50"
              />
            ))}
          </div>

          {otpError && (
            <p
              role="alert"
              className="mt-3 border border-border bg-background p-3 text-[0.75rem] text-primary"
            >
              {otpError}
            </p>
          )}

          {locked && (
            <p className="mt-3 border border-border bg-background p-3 text-[0.75rem] text-muted-foreground">
              {t(
                "Too many attempts. Please request a new code.",
                "Trop de tentatives. Veuillez demander un nouveau code.",
              )}
            </p>
          )}

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => void verify()}
              disabled={verifying || locked}
              className="press-tap inline-flex items-center justify-center gap-2 bg-primary py-3.5 font-display text-lg uppercase leading-none text-primary-foreground disabled:opacity-60 focus-ppp"
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {t("Verify", "Vérifier")}
            </button>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={cooldown > 0 || sending}
              className="press-tap py-2 text-center text-[0.7rem] uppercase tracking-widest text-muted-foreground underline focus-ppp disabled:opacity-50 disabled:no-underline"
            >
              {sending ? (
                <Loader2 className="inline h-3 w-3 animate-spin" />
              ) : cooldown > 0 ? (
                t(`Resend code in ${cooldown}s`, `Renvoyer le code dans ${cooldown}s`)
              ) : (
                t("Resend code", "Renvoyer le code")
              )}
            </button>
          </div>

          <p className="mt-3 text-[0.65rem] uppercase tracking-widest text-muted-foreground/70">
            {t(
              "Codes expire after 10 minutes · 5 tries per code",
              "Les codes expirent après 10 minutes · 5 essais par code",
            )}
          </p>
        </>
      )}

      {step === "verified" && (
        <>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("Your PPP account", "Votre compte PPP")}
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-3xl uppercase leading-[0.9]">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t("Number verified", "Numéro vérifié")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("You're signed in to PPP with", "Vous êtes connecté à PPP avec")} +1 {phoneDisplay}.
            {verifiedPhone ? "" : ""}
          </p>
        </>
      )}
    </div>
  );
}
