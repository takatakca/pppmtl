import { Facebook, Instagram } from "lucide-react";
import type { SocialPost } from "@/config/social-feed";
import { TikTokIcon, XIcon } from "@/components/brand/social-icons";
import { usePPP } from "@/context/ppp-store";

const platformMeta = {
  instagram: { name: "Instagram", Icon: Instagram },
  facebook: { name: "Facebook", Icon: Facebook },
  tiktok: { name: "TikTok", Icon: TikTokIcon },
  x: { name: "X", Icon: XIcon },
  google: { name: "Google", Icon: Instagram },
} as const;

/** One curated post. Renders as a link only when a real destination exists. */
export function SocialCard({ post }: { post: SocialPost }) {
  const { lang } = usePPP();
  const meta = platformMeta[post.platform];
  const caption = lang === "fr" ? post.captionFr : post.captionEn;

  const Tag = post.href ? "a" : "div";
  const interactiveProps = post.href
    ? { href: post.href, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Tag
      {...interactiveProps}
      className="group relative block w-[13.5rem] shrink-0 snap-start overflow-hidden border border-border bg-card transition-transform duration-300 ease-out motion-reduce:transition-none sm:w-full sm:hover:-translate-y-1"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[oklch(0.16_0_0)]">
        <img
          src={post.image}
          alt={caption}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center bg-background/85 text-primary backdrop-blur">
          <meta.Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <p className="p-3 text-xs leading-snug text-muted-foreground">{caption}</p>
    </Tag>
  );
}
