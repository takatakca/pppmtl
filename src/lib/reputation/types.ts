/**
 * Normalized reputation + social models for PPP's public presence.
 *
 * These shapes are provider-agnostic on purpose: a configured snapshot today
 * and a live Google Business Profile / Meta / TikTok / Yelp response later
 * both normalize into the same records, so the UI never has to change.
 */

export type ReviewProvider = "google" | "yelp" | "birdeye" | "tripadvisor" | "trustindex";

/** Where the numbers on screen came from. Internal — never printed publicly. */
export type DataMode = "link" | "snapshot" | "cached" | "live";

export interface ReviewSourceSummary {
  provider: ReviewProvider;
  /** `null` = brand-wide rather than one restaurant. */
  locationId: string | null;
  rating: number | null;
  reviewCount: number | null;
  externalUrl: string | null;
  fetchedAt: string | null;
  dataMode: DataMode;
}

export interface ReviewRecord {
  id: string;
  provider: ReviewProvider;
  locationId: string | null;
  rating?: number;
  authorDisplayName?: string;
  excerpt?: string;
  publishedAt?: string;
  externalUrl: string;
  sourceId?: string;
}

export interface ReputationRepository {
  getSummaries(locationId?: string): Promise<ReviewSourceSummary[]>;
  /** Real review excerpts only. Never synthesises testimonials. */
  getReviews(provider: ReviewProvider, locationId?: string): Promise<ReviewRecord[]>;
}

export type SocialProviderId = "instagram" | "facebook" | "tiktok" | "x";

export interface SocialPostRecord {
  id: string;
  provider: SocialProviderId;
  locationId: string | null;
  permalink: string;
  caption?: string;
  imageUrl?: string;
  publishedAt?: string;
}

export interface SocialFeedRepository {
  getPosts(input: {
    provider?: SocialProviderId;
    locationId?: string;
    limit?: number;
  }): Promise<SocialPostRecord[]>;
}