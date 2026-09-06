import { Star, ArrowUpRight } from "lucide-react";
import { usePPP, useSelectedRestaurantLocation } from "@/context/ppp-store";
import { trackSocialLink } from "@/lib/analytics";
import { GoogleGlyph } from "@/components/brand/social-icons";
import { Reveal } from "@/components/motion/reveal";

/**
 * Compact trust band. Only renders a rating/review count when the location
 * actually has one configured (`locations.ts`). No invented stars, no
 * invented quotes — ever.
 */
export function WhatPeopleSay() {
  const { t } = usePPP();
  const location = useSelectedRestaurantLocation();
  const { rating, reviewCount, listingUrl, reviewsUrl } = location.google;
  const link = reviewsUrl ?? listingUrl;

  return (
    <section className="mx-auto max-w-[110rem] px-3 py-10 sm:px-6 lg:py-14">
      <Reveal className="flex flex-col items-start gap-5 border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-accent">
            {t("What people say", "Ce qu'on en dit")}
          </p>
          {rating && reviewCount ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(rating) ? "fill-primary text-primary" : "text-border"
                    }`}
                  />
                ))}
              </div>
              <span className="font-display text-2xl leading-none">{rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                {t(`from ${reviewCount} Google reviews`, `selon ${reviewCount} avis Google`)}
              </span>
            </div>
          ) : (
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t(
                "Reviews for this location aren't synced yet — see it live on Google.",
                "Les avis pour cet emplacement ne sont pas encore synchronisés — consultez-les sur Google.",
              )}
            </p>
          )}
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSocialLink("google")}
            className="inline-flex items-center gap-2 border border-border px-5 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-ppp"
          >
            <GoogleGlyph className="h-4 w-4 text-primary" />
            {t("Read reviews on Google", "Lire les avis sur Google")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </Reveal>
    </section>
  );
}
