import { usePPP, useSelectedRestaurantLocation } from "@/context/ppp-store";
import { locationSocial } from "@/config/locations";
import { getSocialPosts } from "@/config/social-feed";
import { trackSocialLink } from "@/lib/analytics";
import { SocialFeed } from "@/components/social/social-feed";
import { pppSocials } from "@/components/home/follow-ppp";
import { Reveal } from "@/components/motion/reveal";

/** Compact homepage social band — curated posts + follow CTAs for the selected location. */
export function FreshFromPPP() {
  const { t } = usePPP();
  const location = useSelectedRestaurantLocation();
  const social = locationSocial(location);
  const posts = getSocialPosts(location.id, 8);

  const socials = pppSocials.filter((s) => Object.values(social).includes(s.href));

  return (
    <section className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("Fresh from PPP", "Fraîchement de chez PPP")}
          </p>
          <h2 className="mt-1 font-display text-4xl uppercase leading-[0.85] sm:text-5xl">
            {t("Straight from the kitchen", "Tout droit de la cuisine")}
          </h2>
        </div>
        {socials.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {socials.map((s) => (
              <li key={s.id}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialLink(s.id)}
                  aria-label={`Visit PPP Pizzeria on ${s.name}`}
                  className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground transition-transform duration-200 hover:scale-[1.05] hover:text-foreground focus-ppp"
                >
                  <s.Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {t("Follow", "Suivre")} {s.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
      <Reveal className="mt-6" delay={80}>
        <SocialFeed posts={posts} />
      </Reveal>
    </section>
  );
}
