/**
 * LIVE-PROVIDER SEAM.
 *
 * Every adapter below is disabled: no credentials exist, so nothing performs a
 * network call and nothing is invented. The contract each future adapter must
 * honour is: LIVE → CACHED last-known-good → the static external profile link.
 * A fabricated review or post is never an acceptable fallback.
 *
 * Turning one on later means implementing the adapter and flipping its flag —
 * the /around-the-web components consume these records unchanged.
 */

import { pppBusiness } from "@/config/business";
import { externalPresence } from "@/config/external-presence";
import { NDG_LOCATION_ID } from "@/config/locations";
import type {
  ReputationRepository,
  ReviewProvider,
  ReviewRecord,
  ReviewSourceSummary,
  SocialFeedRepository,
  SocialPostRecord,
} from "./types";

/** No credentials are configured for any provider yet. */
export const providerAdapters = {
  /** Google Business Profile API — ratings, review count, review text. */
  google: { id: "google", enabled: false },
  /** Meta Graph API — Facebook page + Instagram media. */
  meta: { id: "meta", enabled: false },
  /** TikTok Display API — recent public videos. */
  tiktok: { id: "tiktok", enabled: false },
  /** Yelp Fusion API — rating and review excerpts. */
  yelp: { id: "yelp", enabled: false },
} as const;

/**
 * Config-backed summaries. The Google numbers come from the owner-supplied
 * listing snapshot in `business.ts`; every other platform is link-only, which
 * is why its rating and count are `null` rather than a guess.
 */
export function getSummariesSync(locationId?: string): ReviewSourceSummary[] {
  const snapshot = pppBusiness.googleProfile;
  const all: ReviewSourceSummary[] = [
    {
      provider: "google",
      locationId: NDG_LOCATION_ID,
      rating: snapshot.rating ?? null,
      reviewCount: snapshot.reviewCount ?? null,
      externalUrl: pppBusiness.google.reviewsUrl,
      fetchedAt: snapshot.lastSyncedAt ?? null,
      dataMode: "snapshot",
    },
    {
      provider: "birdeye",
      locationId: NDG_LOCATION_ID,
      rating: null,
      reviewCount: null,
      externalUrl: externalPresence.discovery.birdeye,
      fetchedAt: null,
      dataMode: "link",
    },
  ];
  return locationId ? all.filter((s) => s.locationId === locationId) : all;
}

export const reputationRepository: ReputationRepository = {
  getSummaries: async (locationId?: string) => getSummariesSync(locationId),
  /**
   * No provider is connected, so there are no real review records to show.
   * Returning `[]` is what keeps the UI on "read reviews on the platform"
   * instead of inventing testimonials.
   */
  getReviews: async (_provider: ReviewProvider, _locationId?: string): Promise<ReviewRecord[]> =>
    [],
};

export const socialFeedRepository: SocialFeedRepository = {
  getPosts: async (): Promise<SocialPostRecord[]> => [],
};

/** Sync mirrors used during SSR; identical results, no promise boundary. */
export function getReviewsSync(): ReviewRecord[] {
  return [];
}

export function getSocialPostsSync(): SocialPostRecord[] {
  return [];
}