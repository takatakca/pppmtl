import storefrontNight from "@/assets/storefront-night.jpg";
import { PlatformMark } from "@/components/presence/platform-mark";
import { usePointerDepth } from "@/components/motion/reveal";
import { usePPP } from "@/context/ppp-store";
import { presenceCounts } from "@/config/presence-directory";

/**
 * Editorial hero for /around-the-web. Counts are derived from the presence
 * registry so they can never drift from what the page actually renders.
 */
export function AroundHero() {
  const { t } = usePPP();
  const counts = presenceCounts();
  const { containerRef, layer } = usePointerDepth(8);

  const stats = [
    { value: counts.total, label: t("Live profiles", "Profils actifs") },
    { value: counts.ordering, label: t("Ordering channels", "Canaux de commande") },
    { value: counts.social, label: t("Social channels", "Réseaux sociaux") },
    { value: counts.reviews, label: t("Reviews & listings", "Avis et fiches") },
  ];

  const chips = ["google", "instagram", "facebook", "uber-eats", "doordash", "tripadvisor"];

  return (
    <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
          {t("PPP around the web", "PPP partout sur le web")}
        </p>
        <h1 className="mt-2 font-display text-5xl uppercase leading-[0.85] sm:text-7xl">
          {t("Real places.", "Vrais endroits.")}
          <br />
          {t("Real reviews.", "Vrais avis.")}
          <br />
          <span className="text-flame">{t("Real PPP.", "Vrai PPP.")}</span>
        </h1>
        <p className="mt-4 max-w-lg text-sm text-muted-foreground">
          {t(
            "People find PPP in more than one place. Here are the profiles, reviews and ordering pages that are actually ours — plus where the very first PPP kitchen lives on in the record.",
            "On trouve PPP à plus d'un endroit. Voici nos vrais profils, avis et pages de commande — et l'endroit où la toute première cuisine PPP demeure inscrite en ligne.",
          )}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-y-4 border-t border-border pt-5 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border-l border-border pl-3 first:border-l-0 first:pl-0 sm:pl-4"
            >
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-4xl leading-none">{s.value}</dd>
              <p className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </dl>
      </div>

      <div ref={containerRef} className="relative min-w-0">
        <div className="relative overflow-hidden border border-border" style={layer(0.4)}>
          <img
            src={storefrontNight}
            alt={t(
              "The PPP Pizzeria storefront in Notre-Dame-de-Grâce at night",
              "La devanture de PPP Pizzeria à Notre-Dame-de-Grâce, le soir",
            )}
            loading="eager"
            decoding="async"
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
        </div>

        <ul className="absolute inset-0 hidden sm:block" aria-hidden style={layer(1)}>
          {chips.map((id, i) => (
            <li
              key={id}
              className="chip-in absolute"
              style={{
                ["--chip-delay" as string]: `${140 + i * 90}ms`,
                top: `${[8, 24, 62, 44, 78, 12][i]}%`,
                left: `${[6, 78, 4, 86, 58, 44][i]}%`,
              }}
            >
              <PlatformMark
                platformId={id}
                size="sm"
                className="shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
