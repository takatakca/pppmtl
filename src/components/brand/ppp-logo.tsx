/**
 * The single canonical PPP Pizzeria brand mark. Swapping the artwork means
 * changing ONE constant below — no raw logo paths anywhere else in the app.
 */
const LOGO_SRC = "/brand/ppp-pizzeria-logo.png";

export type PPPLogoVariant = "header" | "footer" | "appIcon" | "promo" | "account";

const BOX: Record<PPPLogoVariant, string> = {
  header: "h-9 w-auto sm:h-10",
  footer: "h-12 w-auto",
  appIcon: "h-8 w-auto",
  promo: "h-24 w-auto sm:h-32",
  account: "h-14 w-auto",
};

export function PPPLogo({
  variant = "header",
  className = "",
  withWordmark = false,
}: {
  variant?: PPPLogoVariant;
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <img
        src={LOGO_SRC}
        alt="PPP Pizzeria"
        loading={variant === "header" ? "eager" : "lazy"}
        decoding="async"
        className={`${BOX[variant]} object-contain ${className}`}
      />
      {withWordmark && (
        <span className="font-display text-lg uppercase leading-none tracking-wide">
          PPP Pizzeria
        </span>
      )}
    </span>
  );
}