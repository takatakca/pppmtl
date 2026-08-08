import { useState } from "react";

/**
 * THE single restaurant image component. The website decides the box; the
 * provider image only fills it. No caller may set width/height beyond the
 * declared variants, so source aspect ratio can never drive layout height.
 */
export type MenuImageVariant =
  | "thumbnail"
  | "search"
  | "cart"
  | "list"
  | "card"
  | "category"
  | "featured"
  | "promo"
  | "hero"
  /* legacy aliases kept so existing callers stay valid */
  | "compact"
  | "standard";

const BOX: Record<MenuImageVariant, string> = {
  /* 64px — tiny scan-speed thumbs */
  thumbnail: "h-16 w-16",
  /* 64 → 72px — search results */
  search: "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]",
  /* 56 → 64px — cart lines */
  cart: "h-14 w-14 sm:h-16 sm:w-16",
  /* 104px mobile standard product row → 128px desktop compact */
  list: "h-[6.5rem] w-[6.5rem] sm:h-32 sm:w-32",
  /* 120 → 160px desktop compact card */
  card: "h-[7.5rem] w-full sm:h-40",
  /* 72 → 88px category tile */
  category: "h-[4.5rem] w-[4.5rem] sm:h-22 sm:w-22",
  /* merchandising + promotional — allowed to be expressive */
  featured: "h-40 w-full sm:h-52",
  promo: "h-44 w-full sm:h-56",
  hero: "h-full w-full",
  compact: "h-[6.5rem] w-[6.5rem] sm:h-32 sm:w-32",
  standard: "h-[7.5rem] w-full sm:h-40",
};

/** Branded fallback — never a broken icon, never an empty grey box. */
function PPPFallback({ loading }: { loading: boolean }) {
  return (
    <span
      aria-hidden
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[oklch(0.16_0_0)] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-primary"
    >
      <span
        className={`font-display text-[0.7rem] uppercase tracking-[0.35em] text-primary-foreground/70 ${
          loading ? "animate-pulse" : ""
        }`}
      >
        PPP
      </span>
      {!loading && (
        <span className="font-display text-[0.5rem] uppercase tracking-[0.3em] text-muted-foreground">
          NDG
        </span>
      )}
    </span>
  );
}

export function MenuItemImage({
  src,
  alt,
  size = "list",
  variant,
  fit = "cover",
  className = "",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  /** legacy prop name */
  size?: MenuImageVariant;
  variant?: MenuImageVariant;
  fit?: "cover" | "contain";
  className?: string;
  priority?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "broken">(src ? "loading" : "broken");
  const box = BOX[variant ?? size];

  return (
    <div className={`relative shrink-0 overflow-hidden bg-[oklch(0.16_0_0)] ${box} ${className}`}>
      {src && status !== "broken" && (
        <img
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0) setStatus("loaded");
          }}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("broken")}
          className={`h-full w-full transition-opacity duration-300 ${
            fit === "contain" ? "object-contain p-1.5" : "object-cover"
          } ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {status !== "loaded" && <PPPFallback loading={status === "loading"} />}
    </div>
  );
}

/** Preferred name going forward. */
export const MenuImage = MenuItemImage;
