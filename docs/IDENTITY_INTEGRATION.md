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
