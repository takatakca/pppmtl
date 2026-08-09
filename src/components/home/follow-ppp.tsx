import { Facebook, Instagram } from "lucide-react";
import { usePPP } from "@/context/ppp-store";
import { externalPresence } from "@/config/external-presence";
import { trackSocialLink } from "@/lib/analytics";
import { TikTokIcon, XIcon } from "@/components/brand/social-icons";
import { Reveal } from "@/components/motion/reveal";

export const pppSocials = [
  {
    id: "instagram" as const,
    name: "Instagram",
    href: externalPresence.social.instagram,
    Icon: Instagram,
  },
  { id: "tiktok" as const, name: "TikTok", href: externalPresence.social.tiktok, Icon: TikTokIcon },
  {
    id: "facebook" as const,
    name: "Facebook",
    href: externalPresence.social.facebookNdg,
    Icon: Facebook,
  },
  { id: "x" as const, name: "X", href: externalPresence.social.x, Icon: XIcon },
];

/** Compact social module — icons only, no third-party timeline embeds. */
export function FollowPPP() {
  const { t } = usePPP();

  return (
    <section id="follow" className="mx-auto max-w-[110rem] px-3 pb-10 sm:px-6 lg:pb-14">
      <Reveal className="border border-border bg-card p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
              {t("PPP after hours", "PPP après les heures")}
            </p>
            <h2 className="mt-1 font-display text-5xl uppercase leading-[0.85] sm:text-6xl">
              {t("Follow PPP", "Suivez PPP")}
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t(
                "Drops, late-night specials and everything coming out of the NDG kitchen.",
                "Nouveautés, spéciaux de fin de soirée et tout ce qui sort de la cuisine NDG.",
              )}
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {pppSocials.map((s) => (
              <li key={s.id}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialLink(s.id)}
                  aria-label={`Visit PPP Pizzeria on ${s.name}`}
                  className="group inline-flex flex-col items-center gap-1.5 border border-border px-5 py-4 transition-all duration-200 hover:scale-[1.08] hover:border-primary focus-ppp"
                >
                  <s.Icon className="h-6 w-6 text-primary transition-colors group-hover:text-foreground" />
                  <span className="text-[0.55rem] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
                    {s.name}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
