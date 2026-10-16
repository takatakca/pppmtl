# PPPMTL — engineering decisions

Updated: 2026-10-15. Supersede only with documented owner approval and clear migration plan.

| Decision | Rationale | Consequence |
|---|---|---|
| Continue the existing `takatakca/pppmtl` source on `main` | Existing React/TanStack product, photos, real Clover catalog and franchise routing must be preserved | No rewrite or force-push |
| One multi-brand codebase | All franchise hosts share menu, cart and backend capabilities | Each host has its own appearance and canonical SEO |
| Clover Hosted Checkout for pickup | Card details never enter PPP application; provider is payment authority | No direct client Clover secret; verified webhook required |
| No acceptance of `?paid=1` as proof | Return URL is untrusted browser input | UI only confirms payment when server sees a verified event |
| Server-revalidated quantities and modifiers | Prevent malformed carts and unauthorized price manipulation | Reject invalid items; never silently round quantities |
| Temporary admin access via signed server-only session | TAKATAK Auth customer/admin backend is not connected | Explicit strong `PPP_ADMIN_* ` secrets; all admin RPCs deny access when absent; replace with TAKATAK roles |
| Signed HttpOnly guest receipt list | Until verified TAKATAK identity exists, caller-supplied phone/customer IDs cannot grant access | Only the checkout browser reads a limited list of its orders; 14-day expiry; secure signature |
| Checkout nonce for browser-specific idempotency | Matching phone/cart data across two guests is not equivalent to same order | Random server-issued browser scope supplements deterministic order key |
| Durable order state required before payment launch | In-memory orders and replay dedup cannot support restarts/multi-worker guarantees | Keep issue #6 open until transactional DB/outbox is integrated |
| Node/Nitro backend, not static copy | Checkout/webhook require confidential server execution | Deploy through verified Coolify/native Node host |
| CI before deployment | Core security and payment code may not go online after failing build/tests | Deploy fallback triggers only on successful main CI; native Coolify triggers require equivalent guard |
| Hochelaga hours unapproved | Owner has not confirmed hours | Keep null and exclude from SEO/structured hours; do not invent values |
| TAKATAK remains identity/data authority | Cross-brand customer resolution and company isolation belong to central TAKATAK services | Do not create a competing PPP master CRM |

See `docs/integrations/clover.md`, `docs/brands.md`, `AGENTS.md`, and `WORKLOG.md`.

## Decisions added 2026-10-15

| Decision | Why | Operational consequence |
|---|---|---|
| Fail closed on live Clover charges while using an in-memory order ring | Process restart or concurrent workers can lose the paid order and deduplication history | Production checkout readiness is false until a durable repository is implemented and verified; sandbox tests permitted with signed webhooks |
| Reject any fractional/non-finite Clover item quantity | Never round customer-supplied amounts into a payment | Exact positive safe integers only, at most 50 units |
| Discard all browser-supplied customer/master identity references on guest checkout | Forged identifiers are not verified TAKATAK sessions | Verified cross-device accounts will require a separate TAKATAK scoped-session integration |
| Do not reuse `TAKATAK_1LV_API_KEY` for PPPMTL | Central TAKATAK Master API currently scopes it to 1LV | Require a distinct audienced PPPMTL assertion/API contract |
| Treat runnerless CI failures as unverified | Runner `0` / missing job steps cannot prove source correctness or failure | Keep deployment gated, track #7, run build/typecheck/lint/tests on a working runner |

## Continuation decisions — 2026-10-15

| Decision | Rationale | Consequence |
|---|---|---|
| Validate webhook merchant identity and `PAYMENT` type after HMAC verification | A validly signed event for another merchant or event kind is not permission to update a PPP order | Reject before payment mutation; preserve processing for genuine events |
| Release transient in-memory delivery claims and return HTTP 503 | A provider REST/title exception must not permanently mark an event as completed | Replay is possible on retry; still replace with durable dedup/outbox before production |
| Disable **every** live Clover checkout until order persistence is durable | `NODE_ENV` can be incorrectly configured on a real server | `CLOVER_ENV=production` with in-memory order store always fails closed |
| Match all outbox/webhook order references to their tenant and force RLS | Prevent cross-tenant effects, including through the table-owner PostgreSQL role | Composite foreign keys, forced RLS and limited-role PostgreSQL CI test |
| Verify Coolify finished status, exact commit and public HTTPS health | A queued deployment response does not prove running revision | CI-gated opt-in workflow polls official API; no verified deployment yet |

## Late-session safety design (2026-10-15)

| Decision | Why | Status |
|---|---|---|
| Explicitly set Clover sandbox mode in mocked checkout tests | Live mode intentionally rejects in-memory orders; tests must never depend on production defaults | Test source committed; full CI still unavailable |
| Reject production payment/quote if live inventory is unavailable | Avoid charging cards from stale site snapshot prices or 86'd items | Source guard committed; live credential verification outstanding |
| Add tenant-local SQL `create_order_once` and `record_verified_clover_payment` | Database constraints must own idempotent order creation and webhook receipt before returning a paid result | SQL migration and tests committed, not deployed; still needs driver and worker |
| Schedule only the title outbox effect initially | Clover order must be titled before print can safely be scheduled | Atomic title queue coded in SQL; worker/print completion not yet implemented |
| Reject public webhook bodies larger than 128 KiB before HMAC | Avoid unbounded memory allocation from unauthenticated requests | Streaming cap and tests committed, server still unverified |
