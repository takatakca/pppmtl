import { Facebook, Instagram, Globe } from "lucide-react";
import { GoogleGlyph, TikTokIcon, XIcon } from "@/components/brand/social-icons";
import { platformMeta } from "@/config/platforms";

const glyphs = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: TikTokIcon,
  x: XIcon,
  google: GoogleGlyph,
} as const;

/**
 * Draws a platform's real mark: a local brand file when one exists, an
 * in-house glyph when we're allowed to draw it, and set type otherwise —
 * never an imitation of a logo we don't have.
 *
 * Always decorative: the platform name is printed next to it in text.
 */
export function PlatformMark({
  platformId,
  size = "md",
  className = "",
}: {
  platformId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = platformMeta(platformId);
  const box =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const glyph = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const frame = `grid ${box} shrink-0 place-items-center border border-border bg-background ${className}`;

  if (!meta) {
    return (
      <span className={frame} aria-hidden>
        <Globe className={`${glyph} text-muted-foreground`} />
      </span>
    );
  }

  if (meta.mark.kind === "asset") {
    return (
      <span className={frame} aria-hidden>
        <img
          src={meta.mark.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={size === "lg" ? "h-8 w-8 object-contain" : "h-6 w-6 object-contain"}
        />
      </span>
    );
  }

  if (meta.mark.kind === "glyph") {
    const Glyph = glyphs[meta.mark.glyph];
    return (
      <span className={frame} aria-hidden>
        <Glyph className={`${glyph} text-foreground`} />
      </span>
    );
  }

  return (
    <span className={frame} aria-hidden>
      <span
        className={`font-display uppercase leading-none tracking-tight text-foreground ${
          size === "lg" ? "text-base" : size === "sm" ? "text-[0.6rem]" : "text-[0.7rem]"
        }`}
      >
        {meta.mark.short}
      </span>
    </span>
  );
}