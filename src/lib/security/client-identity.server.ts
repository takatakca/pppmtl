/**
 * Who is calling, for rate limits only. SERVER ONLY. Never an authorization: an IP or a browser nonce proves nothing.
 *
 * IP: Cloudflare's `cf-connecting-ip` when present (Cloudflare sets it and overwrites any value a client sends),
 * else the first `X-Forwarded-For` entry (the reverse proxy replaces client-sent values), else the socket address.
 */
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { checkoutBrowserNonce } from "./order-access.server";

export function requestClientIp(): string | null {
  try {
    const cloudflare = getRequestHeader("cf-connecting-ip")?.trim();
    if (cloudflare) return cloudflare.slice(0, 64);
    return getRequestIP({ xForwardedFor: true })?.trim().slice(0, 64) || null;
  } catch {
    return null;
  }
}

/** The browser's HttpOnly nonce (set on first use); null outside a request. */
export function requestBrowserSession(): string | null {
  try {
    return checkoutBrowserNonce();
  } catch {
    return null;
  }
}
