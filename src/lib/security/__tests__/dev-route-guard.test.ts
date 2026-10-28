import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  devRequestAuthorized,
  devUnauthorizedResponse,
  isProtectedDevPath,
} from "../dev-route-guard.server";

const access = "access-token-is-long-enough-for-local-tests";
const signing = "signing-secret-at-least-32-characters-for-tests";

function signedCookie() {
  const until = Math.floor(Date.now() / 1000) + 300;
  const payload = `${until}.${"a".repeat(32)}`;
  return `${payload}.${createHmac("sha256", signing).update(payload).digest("hex")}`;
}

function request(cookie?: string) {
  return new Request("https://pppmtl.com/dev/menu-audit", {
    headers: cookie ? { cookie } : {},
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("internal /dev route access control", () => {
  it("matches /dev only, including encoded aliases, without blocking public endpoints", () => {
    for (const path of [
      "/dev",
      "/dev/",
      "/dev/menu-audit",
      "/Dev/menu-audit",
      "/%64ev/menu-audit",
      "/dev%2Fmenu-audit",
      "/dev%252Fmenu-audit",
    ]) {
      expect(isProtectedDevPath(path)).toBe(true);
    }
    for (const path of [
      "/menu",
      "/checkout",
      "/admin/orders",
      "/api/public/webhooks/clover",
      "/healthz",
      "/developer",
      "/dev-tools",
    ]) {
      expect(isProtectedDevPath(path)).toBe(false);
    }
  });

  it("fails closed without configured admin secrets or a signed cookie", () => {
    expect(devRequestAuthorized(request())).toBe(false);
    vi.stubEnv("PPP_ADMIN_ACCESS_TOKEN", access);
    vi.stubEnv("PPP_ADMIN_SESSION_SECRET", signing);
    expect(devRequestAuthorized(request())).toBe(false);
    expect(devRequestAuthorized(request("ppp_admin_session=forged"))).toBe(false);
  });

  it("allows only a valid signed admin session and rejects duplicate cookies", () => {
    vi.stubEnv("PPP_ADMIN_ACCESS_TOKEN", access);
    vi.stubEnv("PPP_ADMIN_SESSION_SECRET", signing);
    const cookie = signedCookie();
    expect(devRequestAuthorized(request(`other=1; ppp_admin_session=${cookie}`))).toBe(true);
    expect(
      devRequestAuthorized(request(`ppp_admin_session=${cookie}; ppp_admin_session=${cookie}`)),
    ).toBe(false);
    vi.stubEnv("PPP_ADMIN_SESSION_SECRET", "a-different-long-signing-secret-for-tests");
    expect(devRequestAuthorized(request(`ppp_admin_session=${cookie}`))).toBe(false);
  });

  it("returns a non-cacheable HTTP 401 rather than rendering internal audit content", () => {
    const response = devUnauthorizedResponse();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});
