import { GoogleGlyph } from "@/components/brand/social-icons";
import { usePPP } from "@/context/ppp-store";

/**
 * "Continue with Google" — follows Google's sign-in branding guidelines:
 * white surface, full-colour "G" glyph, neutral border, Roboto-esque weight
 * on the label. This is UI-only: no real OAuth is wired up yet.
 */
export function GoogleButton({
  onClick,
  className = "",
}: {
  onClick?: () => void;
  className?: string;
}) {
  const { t } = usePPP();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press-tap inline-flex w-full items-center justify-center gap-3 border border-border bg-white py-3.5 font-sans text-sm font-medium text-[#1f1f1f] shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors hover:bg-neutral-50 focus-ppp ${className}`}
    >
      <GoogleGlyph className="h-5 w-5 shrink-0" />
      {t("Continue with Google", "Continuer avec Google")}
    </button>
  );
}
