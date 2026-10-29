import { describe, expect, it } from "vitest";
import { applyHttpSecurityHeaders } from "../http-response-headers.server";

function request(path: string, method = "GET") {
  return new Request(`https://pppmtl.com${path}`, { method });
}

describe("PPP HTTP security response baseline", () => {
  it("protects public SSR against clickjacking/MIME sniffing without blocking scripts", () => {
    const original = new Response("<h1>PPP</h1>", {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" },
    });
    const result = applyHttpSecurityHeaders(request("/menu"), original);
    expect(result.status).toBe(200);
    expect(result.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
    expect(result.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(result.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(result.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it.each([
    "/admin/orders",
    "/account/sign-in",
    "/checkout",
    "/orders",
    "/orders/ord_example",
    "/track",
    "/dev/menu-audit",
    "/%61dmin/orders",
    "/admin%252Forders",
    "/%64ev%2fmenu-audit",
  ])("keeps sensitive page %s out of caches and search engines", (path) => {
    const result = applyHttpSecurityHeaders(
      request(path),
      new Response("private", { headers: { "cache-control": "public, max-age=3600" } }),
    );
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("does not cache API responses, login attempts, server errors or responses with cookies", () => {
    const cases = [
      { path: "/api/public/webhooks/clover", method: "GET", response: new Response("ok") },
      { path: "/menu", method: "POST", response: new Response("ok") },
      { path: "/menu", method: "GET", response: new Response("oops", { status: 500 }) },
      {
        path: "/menu",
        method: "GET",
        response: new Response("ok", { headers: { "set-cookie": "session=a; HttpOnly" } }),
      },
    ];
    for (const { path, method, response } of cases) {
      expect(
        applyHttpSecurityHeaders(request(path, method), response).headers.get("cache-control"),
      ).toBe("no-store");
    }
  });

  it("preserves stronger existing headers and several Set-Cookie values", () => {
    const response = new Response("ok", {
      headers: {
        "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
        "x-frame-options": "DENY",
      },
    });
    response.headers.append("set-cookie", "a=1; HttpOnly; SameSite=Strict");
    response.headers.append("set-cookie", "b=2; HttpOnly; SameSite=Strict");

    const result = applyHttpSecurityHeaders(request("/account"), response);
    expect(result.headers.get("x-frame-options")).toBe("DENY");
    expect(result.headers.get("content-security-policy")).toBe(
      "default-src 'self'; frame-ancestors 'none'",
    );
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.getSetCookie()).toHaveLength(2);
  });

  it("adds only a frame-ancestors directive if another CSP already exists", () => {
    const response = new Response("ok", {
      headers: { "content-security-policy": "default-src 'self'; img-src https:" },
    });
    expect(
      applyHttpSecurityHeaders(request("/"), response).headers.get("content-security-policy"),
    ).toBe("default-src 'self'; img-src https:; frame-ancestors 'self'");
  });

  it("retains immutable redirect Location and status without throwing", () => {
    const response = Response.redirect("https://pppmtl.com/admin/sign-in", 302);
    const result = applyHttpSecurityHeaders(request("/admin/orders"), response);
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe("https://pppmtl.com/admin/sign-in");
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });
});
