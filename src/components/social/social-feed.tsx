import type { SocialPost } from "@/config/social-feed";
import { SocialCard } from "@/components/social/social-card";

/**
 * Horizontal rail on mobile, editorial grid on desktop. Purely presentational
 * — data comes from `getSocialPosts()` so a live feed can replace the
 * curated config without touching this component.
 */
export function SocialFeed({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) return null;

  return (
    <div>
      <ul className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0">
        {posts.map((post) => (
          <li key={post.id} className="shrink-0 sm:shrink">
            <SocialCard post={post} />
          </li>
        ))}
      </ul>
    </div>
  );
}
