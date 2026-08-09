import { ArrowUpRight, Star } from "lucide-react";
import { PlatformMark } from "@/components/presence/platform-mark";
import { usePPP } from "@/context/ppp-store";
import { trackExternalPresenceClick } from "@/lib/analytics";
import type { ReviewSourceSummary } from "@/lib/reputation/types";

/**
 * Featured trust card. Renders whatever the reputation layer supplies — a
 * configured snapshot today, a live Google Business Profile response later —
 * with no component change. Rating and count simply disappear when unknown.
 */
export function GoogleTrustCard({
  summary,
  placeLabel,
}: {
  summary: ReviewSourceSummary;
  placeLabel: string | null;
}) {
  const { t } = usePPP();
  if (!summary.externalUrl) return null;

  const hasRating = summary.rating !== null;
  const stars = hasRating ? Math.round(summary.rating!) : 0;

  return (
    <article className="grid gap-6 border border-border bg-card p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <PlatformMark platformId="google" size="lg" />
          <div className="min-w-0">
            <p className="font-display text-3xl uppercase leading-none sm:text-4xl">Google</p>
            {placeLabel && (
              <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-[0.25em] text-accent">
                {placeLabel}
              </p>
            )}
          </div>
        </div>

        {hasRating && (
          <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="font-display text-6xl leading-none sm:text-7xl">
              {summary.rating!.toFixed(1)}
            </p>
            <div className="pb-1">
              <div className="flex gap-0.5" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${
                      n <= stars ? "fill-accent text-accent" : "text-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
              {summary.reviewCount !== null && (
                <p className="mt-1 text-[0.7rem] uppercase tracking-widest text-muted-foreground">
                  {summary.reviewCount}{" "}
                  {t(
                    summary.reviewCount === 1 ? "review" : "reviews",
                    summary.reviewCount === 1 ? "avis" : "avis",
                  )}
                </p>
              )}
            </div>
            <p className="sr-only">
              {t(
                `Rated ${summary.rating} out of 5 on Google`,
                `Note de ${summary.rating} sur 5 sur Google`,
              )}
            </p>
          </div>
        )}

        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          {t(
            "Google is PPP's main listing. Every rating and comment there is written by real customers — read them, or add yours after your next order.",
            "Google est la fiche principale de PPP. Chaque note et commentaire y est écrit par de vrais clients — lisez-les, ou ajoutez le vôtre après votre prochaine commande.",
          )}
        </p>
      </div>

      <div className="grid gap-2 lg:w-64">
        <a
          href={summary.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackExternalPresenceClick({
              provider: "google",
              category: "review",
              locationId: summary.locationId,
            })
          }
          className="press-tap inline-flex items-center justify-center gap-2 bg-primary px-5 py-3.5 font-display text-lg uppercase leading-none text-primary-foreground focus-ppp"
        >
          {t("Read PPP reviews on Google", "Lire les avis PPP sur Google")}
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}