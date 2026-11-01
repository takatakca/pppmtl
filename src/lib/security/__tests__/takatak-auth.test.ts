import { createHash, randomBytes } from "node:crypto";
import { SignJWT, exportJWK, generateKeyPair, type JWK } from "jose";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const cookies = new Map<string, string>();
vi.mock("@tanstack/react-start/server", () => ({
  getCookie: (name: string) => cookies.get(name),
}));

const {
  DEFAULT_TAKATAK_ISSUER,
  SESSION_COOKIE,
  currentTakatakCustomer,
  finishTakatakSignIn,
  resetTakatakKeysForTests,
  safeNextPath,
  signOutTakatak,
  startTakatakSignIn,
  takatakAuthConfigured,
} = await import("../takatak-auth.server");
const { cookieFrom, signValue, verifyValue } = await import("../signed-cookie");

const ISSUER = DEFAULT_TAKATAK_ISSUER;
const SITE = "https://pppmtl.com";
let key: CryptoKey;
let jwk: JWK;
let otherKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  key = pair.privateKey as CryptoKey;
  jwk = { ...(await exportJWK(pair.publicKey)), kid: "takatak-test", alg: "RS256", use: "sig" };
  otherKey = (await generateKeyPair("RS256")).privateKey as CryptoKey;
});

function configure() {
  vi.stubEnv("TAKATAK_OAUTH_CLIENT_ID", "ppp-client");
  vi.stubEnv("TAKATAK_OAUTH_CLIENT_SECRET", "ppp-secret-value");
  vi.stubEnv("PPP_ORDER_ACCESS_SECRET", "x".repeat(40));
  vi.stubEnv("PUBLIC_SITE_URL", SITE);
}

beforeEach(() => {
  cookies.clear();
  resetTakatakKeysForTests();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Every Set-Cookie of a response as name -> value. */
function setCookies(res: Response): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const i = pair!.indexOf("=");
    out.set(pair!.slice(0, i), pair!.slice(i + 1));
  }
  return out;
}

async function start(next = "/checkout") {
  const res = startTakatakSignIn(
    new Request(`${SITE}/auth/takatak/start?next=${encodeURIComponent(next)}`),
  );
  const location = new URL(res.headers.get("location")!, SITE);
  const flowCookie = setCookies(res).get("ppp_takatak_flow")!;
  return { res, location, flowCookie };
}

function idToken(claims: Record<string, unknown>, signer = key, aud = "ppp-client") {
  return new SignJWT({
    email: "marie@example.com",
    name: "Marie Tremblay",
    phone_number: "+15145550100",
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256", kid: "takatak-test" })
    .setIssuer(ISSUER)
    .setAudience(aud)
    .setSubject("takatak-user-1")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(signer);
}

function mockTakatak(token: () => Promise<string> | string, tokenStatus = 200) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url) === `${ISSUER}/oauth/token`) {
        return Response.json(
          { access_token: "at", token_type: "bearer", id_token: await token() },
          { status: tokenStatus },
        );
      }
      if (String(url) === `${ISSUER}/.well-known/jwks.json`) return Response.json({ keys: [jwk] });
      return new Response("not found", { status: 404 });
    }),
  );
  return calls;
}

async function callback(params: Record<string, string>, flowCookie: string) {
  return finishTakatakSignIn(
    new Request(`${SITE}/auth/takatak/callback?${new URLSearchParams(params)}`, {
      headers: { cookie: `ppp_takatak_flow=${flowCookie}` },
    }),
  );
}

describe("signed cookie values", () => {
  it("accepts its own signature only, before expiry", () => {
    const k = "k".repeat(40);
    const exp = Math.floor(Date.now() / 1000) + 60;
    const value = signValue({ sub: "a", exp }, k);
    expect(verifyValue<{ sub: string; exp: number }>(value, k)?.sub).toBe("a");
    expect(verifyValue(value, "z".repeat(40))).toBeNull();
    expect(verifyValue(`${value.slice(0, -1)}0`, k)).toBeNull();
    const forged = `${Buffer.from(JSON.stringify({ sub: "b", exp })).toString("base64url")}.${value.split(".")[1]}`;
    expect(verifyValue(forged, k)).toBeNull();
    expect(verifyValue(signValue({ sub: "a", exp: exp - 120 }, k), k)).toBeNull();
    expect(verifyValue("x".repeat(5000), k)).toBeNull();
    expect(cookieFrom("a=1; ppp_customer=abc.def; b=2", "ppp_customer")).toBe("abc.def");
  });
});

describe("Sign in with TAKATAK", () => {
  it("only returns to a path on this site", () => {
    expect(safeNextPath("/checkout")).toBe("/checkout");
    expect(safeNextPath("/orders/ord_abc12?paid=1")).toBe("/orders/ord_abc12?paid=1");
    for (const bad of [
      "//evil.com",
      "https://evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "",
      null,
    ]) {
      expect(safeNextPath(bad)).toBe("/checkout");
    }
  });

  it("stays off, honestly, until the TAKATAK client is configured", async () => {
    expect(takatakAuthConfigured()).toBe(false);
    const { res } = await start();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/checkout?signin=unavailable");
  });

  it("sends the customer to takatak.ca with PKCE (S256), state and nonce", async () => {
    configure();
    const { location, flowCookie } = await start("/checkout");
    expect(`${location.origin}${location.pathname}`).toBe(`${ISSUER}/oauth/authorize`);
    const p = location.searchParams;
    expect(p.get("client_id")).toBe("ppp-client");
    expect(p.get("redirect_uri")).toBe(`${SITE}/auth/takatak/callback`);
    expect(p.get("response_type")).toBe("code");
    expect(p.get("scope")).toBe("openid email profile phone");
    expect(p.get("code_challenge_method")).toBe("S256");
    const flow = JSON.parse(Buffer.from(flowCookie.split(".")[0]!, "base64url").toString());
    expect(p.get("state")).toBe(flow.state);
    expect(p.get("nonce")).toBe(flow.nonce);
    expect(p.get("code_challenge")).toBe(
      createHash("sha256").update(flow.verifier).digest("base64url"),
    );
    expect(flow.next).toBe("/checkout");
  });

  it("signs the customer in from a valid TAKATAK ID token and keeps only id + contact details", async () => {
    configure();
    const { location, flowCookie } = await start("/checkout");
    const nonce = location.searchParams.get("nonce")!;
    const calls = mockTakatak(() => idToken({ nonce }));
    const res = await callback(
      { code: "one-time-code", state: location.searchParams.get("state")! },
      flowCookie,
    );
    expect(res.headers.get("location")).toBe("/checkout?signin=signed_in");

    const token = calls.find((c) => c.url.endsWith("/oauth/token"))!;
    expect((token.init!.headers as Record<string, string>)["Authorization"]).toBe(
      `Basic ${Buffer.from("ppp-client:ppp-secret-value").toString("base64")}`,
    );
    const body = new URLSearchParams(String(token.init!.body));
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code_verifier")).toBeTruthy();

    const session = setCookies(res).get(SESSION_COOKIE)!;
    cookies.set(SESSION_COOKIE, session);
    expect(currentTakatakCustomer()).toEqual({
      sub: "takatak-user-1",
      name: "Marie Tremblay",
      email: "marie@example.com",
      phone: "+15145550100",
    });
    // The flow cookie is cleared.
    expect(setCookies(res).get("ppp_takatak_flow")).toBe("");
  });

  it("refuses a wrong state, a replayed nonce, a forged signature or another app's token", async () => {
    configure();
    const cases: Array<[string, (nonce: string) => Promise<string>, boolean]> = [
      ["wrong state", (n) => idToken({ nonce: n }), true],
      ["other nonce", () => idToken({ nonce: "replayed" }), false],
      ["forged key", (n) => idToken({ nonce: n }, otherKey), false],
      ["other audience", (n) => idToken({ nonce: n }, key, "another-app"), false],
    ];
    for (const [label, make, badState] of cases) {
      resetTakatakKeysForTests();
      const { location, flowCookie } = await start();
      const nonce = location.searchParams.get("nonce")!;
      mockTakatak(() => make(nonce));
      const state = badState ? "not-the-state" : location.searchParams.get("state")!;
      const res = await callback({ code: "c", state }, flowCookie);
      expect(res.headers.get("location"), label).toBe("/checkout?signin=failed");
      expect(setCookies(res).has(SESSION_COOKIE), label).toBe(false);
    }
  });

  it("treats a refused consent as cancelled and a missing flow cookie as failed", async () => {
    configure();
    const { location, flowCookie } = await start();
    const cancelled = await callback(
      { error: "access_denied", state: location.searchParams.get("state")! },
      flowCookie,
    );
    expect(cancelled.headers.get("location")).toBe("/checkout?signin=cancelled");
    const noCookie = await finishTakatakSignIn(
      new Request(`${SITE}/auth/takatak/callback?code=c&state=${randomBytes(8).toString("hex")}`),
    );
    expect(noCookie.headers.get("location")).toBe("/checkout?signin=failed");
  });

  it("signs out by clearing the session cookie", () => {
    configure();
    const res = signOutTakatak(new Request(`${SITE}/auth/signout?next=/checkout`));
    expect(res.headers.get("location")).toBe("/checkout");
    expect(setCookies(res).get(SESSION_COOKIE)).toBe("");
    cookies.set(SESSION_COOKIE, "tampered.value");
    expect(currentTakatakCustomer()).toBeNull();
  });
});
