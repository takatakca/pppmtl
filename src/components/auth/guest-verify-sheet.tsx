import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { usePPP } from "@/context/ppp-store";

/**
 * Guest phone verification UI. Not wired up to a live SMS service yet, so
 * no code is ever actually sent or checked — this always tells the
 * customer honestly that verification isn't ready, never a fake success.
 * Currently unused; keep hidden from customer flows until phone
 * verification is live.
 */

const RESEND_COOLDOWN_S = 30;
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
}: {
  onVerified?: (phone: string) => void;
  onCancel?: () => void;
  className?: string;
}) {
  const { t } = usePPP();
  const [step, setStep] = useState<Step>("phone");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const phoneDigits = digitsOnly(phoneDisplay);
  const phoneValid = phoneDigits.length === 10;
  const locked = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (step !== "otp" || cooldown <= 0) return undefined;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [step, cooldown]);

  async function sendCode() {
    setPhoneError(null);
    if (!phoneValid) {
      setPhoneError(
        t("Enter a 10-digit phone number.", "Entrez un numéro de téléphone à 10 chiffres."),
      );
      return;
    }
    setSending(true);
    // No SMS is sent yet — this delay only mirrors what the real flow will feel like.
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    setStep("otp");
    setDigits(Array(CODE_LENGTH).fill(""));
    setOtpError(null);
    setAttempts(0);
    setCooldown(RESEND_COOLDOWN_S);
    window.requestAnimationFrame(() => inputsRef.current[0]?.focus());
  }

  async function resend() {
    if (cooldown > 0) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 500));
    setSending(false);
    setCooldown(RESEND_COOLDOWN_S);
    setDigits(Array(CODE_LENGTH).fill(""));
    setOtpError(null);
    window.requestAnimationFrame(() => inputsRef.current[0]?.focus());
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
    if (locked) return;
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setOtpError(t("Enter the 6-digit code.", "Entrez le code à 6 chiffres."));
      return;
    }
    setVerifying(true);
    setOtpError(null);
    await new Promise((r) => setTimeout(r, 500));
    setVerifying(false);
    // Phone verification isn't live yet — never claim success here.
    setAttempts((a) => a + 1);
    setOtpError(
      t(
        "Phone verification is coming soon — we can't check codes yet.",
        "La vérification par téléphone arrive bientôt — nous ne pouvons pas encore vérifier les codes.",
      ),
    );
    setDigits(Array(CODE_LENGTH).fill(""));
    inputsRef.current[0]?.focus();
    void onVerified;
  }

  return (
    <div className={`border border-border bg-card p-5 sm:p-7 ${className}`}>
      {step === "phone" && (
        <>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("Guest checkout", "Commande sans compte")}
          </p>
          <h2 className="mt-1 font-display text-3xl uppercase leading-[0.9]">
            {t("Verify your number", "Vérifiez votre numéro")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "We'll text you a code to confirm your order contact.",
              "Nous vous enverrons un code par texto pour confirmer votre contact de commande.",
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
                className="w-full bg-transparent py-3 pr-3 text-lg outline-none focus-ppp"
              />
            </span>
            {phoneError && (
              <span className="mt-1 block text-[0.7rem] text-primary">{phoneError}</span>
            )}
          </label>
          <p className="mt-2 text-[0.7rem] text-muted-foreground">
            {t(
              "Used only to confirm this order. Standard message rates may apply.",
              "Utilisé uniquement pour confirmer cette commande. Des frais de messagerie standards peuvent s'appliquer.",
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
              onClick={() => setStep("phone")}
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
            <p className="mt-3 border border-border bg-background p-3 text-[0.75rem] text-primary">
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
              onClick={verify}
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
              onClick={resend}
              disabled={cooldown > 0 || sending || locked}
              className="press-tap py-2 text-center text-[0.7rem] uppercase tracking-widest text-muted-foreground underline focus-ppp disabled:opacity-50 disabled:no-underline"
            >
              {cooldown > 0
                ? t(`Resend code in ${cooldown}s`, `Renvoyer le code dans ${cooldown}s`)
                : t("Resend code", "Renvoyer le code")}
            </button>
          </div>

          <p className="mt-3 text-[0.65rem] uppercase tracking-widest text-muted-foreground/70">
            {t(
              "Phone verification is coming soon.",
              "La vérification par téléphone arrive bientôt.",
            )}
          </p>
        </>
      )}
    </div>
  );
}
