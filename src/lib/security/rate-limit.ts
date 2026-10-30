/**
 * Sliding-window rate limits, in memory (per server process / isolate). Pure apart from the clock, which tests
 * pass in. Best effort by design: it keeps one browser or one script from using up a shared upstream budget
 * (Food Hub's SMS sender), it is not an accounting system.
 */

export interface RateWindow {
  /** Hits allowed per window. */
  limit: number;
  windowMs: number;
}

export type RateDecision = { ok: true } | { ok: false; retryAfterS: number };

export interface RateLimiter {
  /** Counts the hit only when every key is under its limit (a refused attempt costs nothing). */
  hit(keys: Array<{ key: string; window: RateWindow }>, now?: number): RateDecision;
  reset(): void;
}

const MAX_KEYS = 5_000;

export function createRateLimiter(): RateLimiter {
  const hits = new Map<string, number[]>();

  function recent(key: string, window: RateWindow, now: number): number[] {
    const kept = (hits.get(key) ?? []).filter((t) => now - t < window.windowMs);
    if (kept.length) hits.set(key, kept);
    else hits.delete(key);
    return kept;
  }

  return {
    hit(keys, now = Date.now()) {
      let retryAfterMs = 0;
      for (const { key, window } of keys) {
        const kept = recent(key, window, now);
        if (kept.length >= window.limit) {
          const oldest = kept[0] ?? now;
          retryAfterMs = Math.max(retryAfterMs, window.windowMs - (now - oldest));
        }
      }
      if (retryAfterMs > 0) return { ok: false, retryAfterS: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      for (const { key } of keys) {
        const list = hits.get(key) ?? [];
        list.push(now);
        hits.set(key, list);
      }
      if (hits.size > MAX_KEYS) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
      return { ok: true };
    },
    reset() {
      hits.clear();
    },
  };
}

/**
 * Phone verification starts (each one texts a code through Food Hub). Food Hub allows 3 per phone per 10 min and
 * 60 per brand website per minute, and sees only this server: without these windows one client could use up the
 * whole site's budget. Per client IP and per browser session 6 per 10 min (Food Hub's own per-IP window), and the
 * whole site 30 per minute, half of Food Hub's brand cap.
 */
export const VERIFY_START_WINDOWS = {
  perClient: { limit: 6, windowMs: 10 * 60 * 1000 },
  perSession: { limit: 6, windowMs: 10 * 60 * 1000 },
  site: { limit: 30, windowMs: 60 * 1000 },
} as const satisfies Record<string, RateWindow>;

export const verifyStartLimiter = createRateLimiter();

/** One verification start for this client: `ip` and `session` may be null when unknown (then not counted). */
export function allowVerifyStart(
  client: { ip: string | null; session: string | null },
  now: number = Date.now(),
): RateDecision {
  const keys: Array<{ key: string; window: RateWindow }> = [
    { key: "site", window: VERIFY_START_WINDOWS.site },
  ];
  if (client.ip) keys.push({ key: `ip:${client.ip}`, window: VERIFY_START_WINDOWS.perClient });
  if (client.session) {
    keys.push({ key: `session:${client.session}`, window: VERIFY_START_WINDOWS.perSession });
  }
  return verifyStartLimiter.hit(keys, now);
}
