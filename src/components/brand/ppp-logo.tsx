import { useBrand } from "@/context/brand";
import { brandMarkSvg } from "@/components/brand/brand-mark";

/**
 * The brand mark of the site being visited. PPP Pizzeria keeps its artwork (ONE constant below); the franchise
 * brands picked by the domain (src/config/brands.ts) show their text-logo mark (brand-mark.ts).
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

const MARK_BOX: Record<PPPLogoVariant, string> = {
  header: "h-9 w-9 sm:h-10 sm:w-10",
  footer: "h-12 w-12",
  appIcon: "h-8 w-8",
  promo: "h-24 w-24 sm:h-32 sm:w-32",
  account: "h-14 w-14",
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
  const brand = useBrand();
  const isPPP = brand.id === "ppp";
  return (
    <span className="flex items-center gap-2">
      {isPPP ? (
        <img
          src={LOGO_SRC}
          alt="PPP Pizzeria"
          loading={variant === "header" ? "eager" : "lazy"}
          decoding="async"
          className={`${BOX[variant]} object-contain ${className}`}
        />
      ) : (
        <span
          className={`block shrink-0 [&>svg]:h-full [&>svg]:w-full ${MARK_BOX[variant]} ${className}`}
          // Built from the brand config only (no user input).
          dangerouslySetInnerHTML={{ __html: brandMarkSvg(brand) }}
        />
      )}
      {withWordmark && (
        <span className="font-display text-lg uppercase leading-none tracking-wide">
          {brand.name}
        </span>
      )}
    </span>
  );
}
