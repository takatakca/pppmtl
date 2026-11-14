/**
 * Conservative security headers for PPP's Nitro/TanStack server responses.
 *
 * This is defence in depth, NOT proof of edge/CDN configuration or a security
 * penetration test. Do not introduce a broad script/style CSP here: this app
 * uses inline styles, external fonts and payment-provider redirects.
 *
 * Applying only a frame-ancestors restriction does not block its own iframes,
 * scripts, inline styles, or the Google Maps iframe embedded by the storefront.
 */

const PRIVATE_PATH = /^\/(?:account|admin|checkout|orders|track|dev|_server)(?:\/|$)/i;
const API_PATH = /^\/api(?:\/|$)/i;
const FRAME_ANCESTORS = /(?:^|;)\s*frame-ancestors\b/i;

function decodedPath(url: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return "/";
  }

  // Be consistent for an encoded route alias (e.g. /%61dmin), without an
  // unbounded decode loop or letting malformed percent escapes throw.
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(path);
      if (next === path) break;
      path = next;
    } catch {
      break;
    }
  }
  return path.replace(/\\/g, "/");
}

function needsNoStore(request: Request, response: Response, privatePath: boolean): boolean {
  const method = request.method.toUpperCase();
  return (
    privatePath ||
    API_PATH.test(decodedPath(request.url)) ||
    (method !== "GET" && method !== "HEAD") ||
    response.headers.has("set-cookie") ||
    response.status === 401 ||
    response.status === 403 ||
    response.status >= 500
  );
}

/**
 * Preserve existing stronger policies. For immutable redirect Responses,
 * copy headers/body without consuming the stream or dropping Set-Cookie.
 */
export function applyHttpSecurityHeaders(request: Request, response: Response): Response {
  const path = decodedPath(request.url);
  const privatePath = PRIVATE_PATH.test(path);
  const headers = new Headers(response.headers);

  if (!headers.has("x-content-type-options")) headers.set("x-content-type-options", "nosniff");
  if (!headers.has("referrer-policy")) {
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
  }
  if (!headers.has("x-frame-options")) headers.set("x-frame-options", "SAMEORIGIN");

  const existingCsp = headers.get("content-security-policy") ?? "";
  if (!FRAME_ANCESTORS.test(existingCsp)) {
    headers.set(
      "content-security-policy",
      existingCsp
        ? `${existingCsp.replace(/;\s*$/, "")}; frame-ancestors 'self'`
        : "frame-ancestors 'self'",
    );
  }

  if (needsNoStore(request, response, privatePath)) headers.set("cache-control", "no-store");
  if (privatePath && !headers.has("x-robots-tag")) {
    headers.set("x-robots-tag", "noindex, nofollow");
  }

  try {
    // Keep the original Response and any streaming body where headers are mutable.
    for (const name of [
      "x-content-type-options",
      "referrer-policy",
      "x-frame-options",
      "content-security-policy",
      "cache-control",
      "x-robots-tag",
    ]) {
      const value = headers.get(name);
      if (value !== null && response.headers.get(name) !== value) {
        response.headers.set(name, value);
      }
    }
    return response;
  } catch (error) {
    // Node's Response.redirect() has an immutable header guard. Preserve its
    // status, Location, all cookies and streamed body in a fresh Response.
    if (error instanceof TypeError) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    throw error;
  }
}
