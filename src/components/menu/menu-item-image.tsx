import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

export type MenuImageSize = "compact" | "standard" | "promo" | "hero";

/**
 * The single menu image component for every customer surface.
 * Fixed boxes per size keep browsing dense and prevent layout shift.
 */
const BOX: Record<MenuImageSize, string> = {
  compact: "h-24 w-24 sm:h-26 sm:w-26",
  standard: "h-28 w-28",
  promo: "h-44 w-full sm:h-56",
  hero: "h-full w-full",
};

export function MenuItemImage({
  src,
  alt,
  size = "compact",
  className = "",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  size?: MenuImageSize;
  className?: string;
  priority?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "broken">(src ? "loading" : "broken");

  return (
    <div className={`relative shrink-0 overflow-hidden bg-muted ${BOX[size]} ${className}`}>
      {src && status !== "broken" && (
        <img
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0) setStatus("loaded");
          }}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("broken")}
          className={`h-full w-full object-cover ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {status !== "loaded" && (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
        >
          {status === "broken" ? (
            <UtensilsCrossed className="h-4 w-4" />
          ) : (
            <span className="h-full w-full animate-pulse bg-muted" />
          )}
        </span>
      )}
    </div>
  );
}