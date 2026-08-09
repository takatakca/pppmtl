import type { SVGProps } from "react";

/** Minimal in-house glyphs for platforms lucide does not ship. */
export function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false" {...props}>
      <path d="M16.5 2h-2.8v13.1a2.6 2.6 0 1 1-2.1-2.55v-2.86a5.45 5.45 0 1 0 4.9 5.41V8.6a6.5 6.5 0 0 0 3.7 1.16V6.9A3.72 3.72 0 0 1 16.5 2Z" />
    </svg>
  );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false" {...props}>
      <path d="M17.2 3h3.3l-7.2 8.2L21.8 21h-6.5l-4.6-5.9L5.4 21H2.1l7.7-8.8L2.2 3h6.6l4.1 5.4L17.2 3Zm-1.2 16h1.8L8.1 4.9H6.2L16 19Z" />
    </svg>
  );
}

export function GoogleGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M21.6 12.2c0-.7-.06-1.35-.18-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.75 3-4.3 3-7.3Z"
      />
      <path
        fill="currentColor"
        opacity=".75"
        d="M12 22c2.7 0 4.96-.9 6.6-2.4l-3.2-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.8-1.75-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="currentColor"
        opacity=".55"
        d="M6.4 13.95a6 6 0 0 1 0-3.9V7.45H3.1a10 10 0 0 0 0 9.1l3.3-2.6Z"
      />
      <path
        fill="currentColor"
        opacity=".85"
        d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.85-2.85C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.9 5.45l3.3 2.6C7.2 7.7 9.4 5.95 12 5.95Z"
      />
    </svg>
  );
}
