# PPPMTL ↔ TAKATAK identity integration contract

Verified from the currently accessible repositories on 2026-10-15.

## Source of authority

- TAKATAK: `takatakca/takatak-v1` (Next.js / Supabase Auth, canonical `MasterIdentity`).
- PPPMTL: `takatakca/pppmtl` (restaurant brand storefront; orders belong to the restaurant tenant, not a second master CRM).
- TAKATAK already has internal `/api/v1/auth/otp/send`, `/api/v1/auth/otp/verify` and `/api/v1/identity/resolve-person` routes. Their current `authorizeMasterRequest` path uses a credential specifically scoped to **1LV** (`TAKATAK_1LV_API_KEY`). **Do not reuse that token for PPPMTL** or expose its endpoints to a browser with that credential.
- TAKATAK's `docs/mimt/AUTH_AND_CRM.md` explicitly requires verified Supabase Auth sessions and a short-lived scoped cross-product assertion. The PPP adapter remains disabled until that contract is implemented and verified.

## Current PPP protection

- `src/lib/security/guest-identity.ts` strips browser-claimed `customerId` / `takatakCustomerId`, forces `isGuest: true`.
- `src/lib/security/order-access.server.ts` gives each checkout browser an HMAC-signed HttpOnly list of its own receipt IDs. Phone/email alone do not authorize viewing or cancelling an order.
- `src/lib/security/admin.server.ts` is an isolated temporary operations bootstrap. It is **not** proof of any TAKATAK role, membership or service entitlement.

## New work needed in TAKATAK (requires own owner-approved endpoint/role)

1. Add a dedicated PPPMTL tenant identity integration with a separate scoped credential or mutually authenticated token verification, not a global key. It should verify an actual Supabase session or exchange an authentic short-lived, audience-bound assertion for PPPMTL. `aud=pppmtl`, expiration, issuer, signature, nonce and revoked-session check must be enforced server-side.
2. Return only `sub` (stable verified master identity reference), tenant identifier, verified contact claims and authorized PPPMTL roles/entitlements; do **not** grant admin privileges based on user email, phone, a self-supplied customerId or another application's memberships.
3. Include a transaction-safe `tenant_id` binding on all PPP order queries and the PostgreSQL RLS session. Guest receipts are scoped to the restaurant tenant and order, while cross-device history requires a verified TAKATAK session.
4. Implement server-side logout/revocation, verified mobile OTP/account recovery and rate limiting. No raw Supabase service-role key should be sent to PPPMTL's browser.
5. Add cross-tenant and cross-account tests plus production/staging signed-token and session-expiry checks. Keep separate restaurant branding and UI despite shared identity.

## Cutover

Enable authenticated PPPMTL accounts only when TAKATAK's scoped API, server-side authorization and tenant-safe durable order storage are deployed and tested. Retire the temporary admin access token once the authorized TAKATAK administrator roles are available. **There is no live TAKATAK SSO connection in PPPMTL at this handoff.**

## 2026-10-31 — "Sign in with TAKATAK" built on the PPP side (off until configured)

Owner decision: the customer goes to takatak.ca first (TAKATAK auth, Google there), then the account exists on pppmtl.com, then Clover checkout.

- TAKATAK's Supabase Auth (project `pcjfahhlozsseqqevimi`) is already an OAuth 2.1 / OIDC provider (discovery at `/auth/v1/.well-known/openid-configuration`, scopes openid email profile phone, PKCE S256) with its consent page at takatak.ca/oauth/consent.
- PPP is a confidential client (`src/lib/security/takatak-auth.server.ts`): `/auth/takatak/start` (state, nonce, PKCE S256, signed short-lived flow cookie) → TAKATAK authorize → `/auth/takatak/callback` (code exchange with client_secret_basic, ID token verified against TAKATAK's JWKS: issuer, audience, expiry, nonce; userinfo fallback for contact claims) → signed HttpOnly `ppp_customer` cookie (TAKATAK `sub`, name, e-mail, phone; 30 days). `/auth/signout` clears it.
- `placeOrder` takes the TAKATAK id ONLY from that cookie (`verifiedCheckoutCustomer`); browser-claimed ids are still dropped. Signed-in orders are stored with `ppp.orders.customer_ref = sub`; "My orders" and the order page also open for that customer on any device.
- Tests: `src/lib/security/__tests__/takatak-auth.test.ts` (forged key, wrong audience, replayed nonce, wrong state, cancelled consent), real-PostgreSQL customer_ref test, and a browser round trip against a stand-in provider.

Owner steps to switch it on: (1) TAKATAK Supabase → Authentication → Sign In / Providers → Google (Google Cloud OAuth client); (2) a "Continue with Google" button on takatak.ca's login page (repo takatakca/takatak-v1 — today it offers e-mail and SMS only); (3) Authentication → OAuth Server → add client, redirect `https://pppmtl.com/auth/takatak/callback`; (4) Coolify: `TAKATAK_OAUTH_CLIENT_ID`, `TAKATAK_OAUTH_CLIENT_SECRET`, redeploy.
