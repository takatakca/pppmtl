/** Fail-closed protection for internal /dev pages before the SSR router runs. */
import { adminConfigured, verifyAdminSession } from "./admin.server";

const SESSION_COOKIE = "ppp_admin_session";

/** Match only /dev and descendants, including encoded separators used in URL aliases. */
export function isProtectedDevPath(pathname: string): boolean {
  let decoded = pathname;
  try {
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    // A malformed encoded /dev path must not bypass the guard.
    return /^\/dev(?:$|[/%\\])/i.test(decoded);
  }
  return /^\/dev(?:\/|$)/i.test(decoded.replace(/\\/g, "/"));
}

/** Validate the existing signed admin cookie without relying on request-scoped helpers. */
export function devRequestAuthorized(request: Request): boolean {
  if (!adminConfigured()) return false;

  let session: string | undefined;
  for (const entry of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0 || entry.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    // Reject duplicate cookies (including differing Path values) rather than picking one.
    if (session !== undefined) return false;
    session = entry.slice(separator + 1).trim();
  }

  const signing = process.env["PPP_ADMIN_SESSION_SECRET"]?.trim() ?? "";
  return verifyAdminSession(session, signing);
}

export function devUnauthorizedResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
