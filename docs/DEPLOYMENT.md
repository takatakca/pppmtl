# PPPMTL — deployment and verification

The application is a **server-rendered TanStack Start / Nitro Node application**. Static shared hosting by itself cannot receive Clover signed webhooks or keep checkout secrets.

## Current evidence

- The repository has `main` as the release branch.
- `.github/workflows/ci.yml` runs typecheck, ESLint, Vitest and Nitro Node build when source changes on `main`.
- `.github/workflows/deploy-coolify.yml` is **opt-in only** and runs only when the main-branch CI workflow concludes successfully. The GitHub Actions variable `PPPMTL_DEPLOY_VIA_ACTIONS` must equal `true`.
- When disabled or missing secrets, no Coolify deployment is requested by this workflow. Native Coolify GitHub auto-deploy is an alternative; never configure both at the same time.
- `GET /healthz` is a server liveness endpoint; it is not proof that a payment or database integration is healthy.
- **Production host (verified 2026-10-26):** Coolify application `pppmtl` (uuid `r13hz1mmbi4eeoc6ssxbvxnv`) on Contabo server vps2 (209.145.49.63), domains `https://pppmtl.com` and `https://www.pppmtl.com`, branch `main`, native Coolify GitHub auto-deploy enabled. A push to `main` triggered webhook deployment of `48c00a4` within seconds. The Actions workflow above must stay disabled.
- DNS stays in the MochaHost zone. Only the apex A record (and `www`, a CNAME to it) points to Coolify; mail records remain on MochaHost. A monitor-only DMARC record (`p=none`, reports to admin@pppmtl.com) was added on 2026-10-26 at the owner's request.

## Back-end prerequisites

Before enabling the customer repository (`backendEnabled`) and before any **live** Clover payment, the back-end wiring below must be in place. Variable names are documented in [`.env.example`](../.env.example); all values stay server-side only.

- **Identity — Supabase Auth, canonical TAKATAK project.** Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the canonical « TAKATAK User Official Dashboard V1 » Supabase project (contract: [IDENTITY_INTEGRATION.md](IDENTITY_INTEGRATION.md)). PPPMTL never creates its own master customer table: customer identity belongs to TAKATAK (`takatakca/takatak-v1`), and PPP holds restaurant-tenant orders only. The Supabase **service_role** key is never used in PPP and must never be exposed to the browser.
- **Durable order storage — PostgreSQL.** Set `DATABASE_URL` to the PostgreSQL 15+ target and apply the migrations `db/migrations/0001` + `0002`, in order, before the runtime can persist orders across restarts and process the signed-event replay/outbox.
- **Clover.** Set `CLOVER_MERCHANT_ID`, `CLOVER_ECOMM_PRIVATE_KEY`, `CLOVER_WEBHOOK_SECRET`, the production `CLOVER_ENV`, `PUBLIC_SITE_URL=https://pppmtl.com`, and the permitted `CLOVER_TAX_RATES` / `CLOVER_PRINT_WEB_ORDERS` settings. `CLOVER_API_TOKEN` stays optional (current price/availability fetch and payment reconciliation; otherwise the Food Hub OAuth app covers order titling/printing).
- **Order access + temporary admin bootstrap.** Set `PPP_ORDER_ACCESS_SECRET`, `PPP_ADMIN_ACCESS_TOKEN` and `PPP_ADMIN_SESSION_SECRET`. The admin token is a temporary bootstrap credential only and is retired once authorized TAKATAK administrator roles are live.
- **Release gates.** Issues [#5](https://github.com/takatakca/pppmtl/issues/5) (server-function security) and [#6](https://github.com/takatakca/pppmtl/issues/6) (durable orders + webhook idempotency) gate production payments: do not enable the customer repository or live Clover checkout until both are closed and verified.

## Coolify configuration (after identifying the actual target)

1. Connect the **private** repository `takatakca/pppmtl` on `main`, Node.js 22.
2. Install from `bun.lock` with `bun install --frozen-lockfile`, then build using `NITRO_PRESET=node-server bun run build`. Start: `node .output/server/index.mjs` (port 3000).
3. Configure production domain(s) and TLS; keep all MX, SPF, DKIM and DMARC records untouched.
4. Set a health check for `GET /healthz` and read logs after deployment.
5. Set separate **server-side** secrets:
   - `PPP_ORDER_ACCESS_SECRET` (32+ random characters, stable across releases)
   - `PPP_ADMIN_ACCESS_TOKEN` (32+ random characters, temporary operations login credential)
   - `PPP_ADMIN_SESSION_SECRET` (32+ random characters, distinct from the credential)
   - `CLOVER_MERCHANT_ID`, `CLOVER_ECOMM_PRIVATE_KEY`, `CLOVER_WEBHOOK_SECRET` and optional `CLOVER_API_TOKEN`
   - `PUBLIC_SITE_URL=https://pppmtl.com`, production `CLOVER_ENV`, plus permitted tax/print settings when applicable
   **Never** commit these values or put them in client `VITE_*` variables. Rotate any exposed credentials.
6. Set Clover Hosted Checkout webhook to `https://pppmtl.com/api/public/webhooks/clover` **only when the production backend is ready**.

## GitHub Actions alternative to Coolify native push deployment

- In GitHub repository Variables: `PPPMTL_DEPLOY_VIA_ACTIONS=true`.
- In Actions secrets: `PPPMTL_COOLIFY_DEPLOY_WEBHOOK` (trusted HTTPS Coolify `/api/v1/deploy?uuid=...` endpoint) and `PPPMTL_COOLIFY_API_TOKEN` (least-privilege deploy-only bearer token).
- It requests a deploy **after** `PPPMTL CI` succeeds on a `main` push; then polls Coolify `GET /api/v1/deployments/{uuid}` for `finished`, checks its `commit` equals the verified CI SHA and verifies the HTTPS application health endpoint. Configure optional repository variable `PPPMTL_HEALTHCHECK_URL` (default `https://pppmtl.com/healthz`). A queued request alone is **not** proof of success.
- Keep native Coolify git-push deploy disabled if this fallback is enabled.

## Production release verification (not yet executed)

- Confirm current deployment SHA from Coolify logs or a trusted artifact manifest, not a bare HTTP 200.
- Verify `https://pppmtl.com/healthz`, page SSR, canonical URLs and each configured brand.
- Confirm admin endpoints reject unauthenticated callers and customer order RPCs reject unknown cookies/other customers.
- Confirm sensitive keys never appear in JS bundles, Git history, logs or network responses.
- With a test merchant and only after #5/#6: execute one real Clover pickup payment, signed webhook, retry/duplicate, print exactly once, refund, simulated restart and multi-worker retry.
- Record actual live SHA, deployment UUID, timestamp and verification outputs in `AGENT_HANDOFF.md`. Do **not** claim completion without evidence.

## Rollback

Revert a faulty commit using a new non-destructive commit, or redeploy a known-good immutable commit via authorized Coolify controls. Avoid force-push and preserve other agents' history.

## 2026-10-15 payment and pipeline status

- Never enable **live Clover Hosted Checkout** based solely on configured merchant keys. `src/lib/integration/providers/clover/config.server.ts` now rejects live production checkout while `src/lib/orders/order-store.server.ts` declares non-durable in-process storage. Finish transactional PostgreSQL order persistence and signed-event replay/outbox before lifting this guard. Sandbox testing is not authorization to accept real payments.
- CI and one-time formatter runs dated October 15 failed with `runner_id: 0`, empty job steps and job log downloads returning 404 BlobNotFound. Outcome is tracked in [issue #7](https://github.com/takatakca/pppmtl/issues/7). Check repository billing/Actions quotas and runner provisioning. No green commit verification or live deployment is established by those failed runs.
- Official Coolify API documentation supports `POST /api/v1/deploy?uuid=...` with a bearer token, returning a deployment UUID when a request is queued. Its response is **not** successful deployment verification. Validate against the exact installed Coolify instance before activation.

## Deployment verifier (added 2026-10-15)

The opt-in Coolify workflow uses the official POST `/api/v1/deploy` response's `deployment_uuid`, then calls authenticated GET `/api/v1/deployments/{uuid}` for up to 36 attempts. It refuses cancelled/failed or stale-SHA deployments, requires `status=finished`, and finally checks the configured HTTPS `/healthz` response identifies PPPMTL. It fails closed on API errors/verification timeout and never prints the bearer token. This feature is **committed but not tested against a real resource**, and does not replace merchant/payment testing or application-level transaction monitoring.

Real Clover payment remains disabled with the in-memory order store in **all** Node environments; do not infer that a development-mode node process permits safe live payments. See [DB_ROLLOUT.md](DB_ROLLOUT.md) for the RLS and outbox migration gate.

As of the latest check, the public PPPMTL homepage returned HTTP 403 via external retrieval, while `/healthz` could not be fetched. Neither proves that the intended application is running; real deployment SHA/health are **not verified**.

## 2026-10-15 late-session payment preflight

- The new database migration `0002_ppp_atomic_payments.sql` must be reviewed/applied **after** `0001_ppp_orders.sql` against the approved PostgreSQL target. Both are currently source-only. Their TypeScript driver and recovery worker are not connected; they do not make live checkout safe.
- The production Clover `CLOVER_API_TOKEN` or `CLOVER_API_KEY` is required to fetch current price/availability and reconcile payment in the restaurant; public payment redirects must not fall back to a committed inventory snapshot.
- Signed Clover webhook handlers reject public bodies larger than 128 KiB before HMAC processing. Confirm Clover sends supported event sizes in staging.
- Never flip `ordersPersistAcrossRestarts` merely because migrations exist. Transactional runtime storage, outbox processing, signed webhook replay recovery and verified TAKATAK tenant scope are launch prerequisites.

## 2026-10-16 release gate

- SQL `0002` was malformed in a prior commit and was **repaired**, not applied. The zero-dependency structural preflight is now run by the PostgreSQL CI job before `psql`; only a real PostgreSQL CI/staging execution can validate SQL semantics and RLS.
- `src/lib/orders/postgres-transactions.server.ts` is an injected PostgreSQL transaction boundary, not an actual configured DB pool. Never assume its presence means persistent orders. It must get its tenant from a verified TAKATAK server-side entitlement, never from browser fields.
- The runtime order service still uses in-process memory; no production Clover payment authorization, print-out, release revision, DB migration or provider webhook retry has been verified.
- Keep Coolify post-CI deploy disabled until the Actions runner, signed TAKATAK tenant identity, real PostgreSQL adapter/outbox, payment reconciliation, and authorized target configuration are verified.

## 2026-10-16 — release gate for queued kitchen actions

The PostgreSQL migration order is now `0001_ppp_orders.sql` → `0002_ppp_atomic_payments.sql` → `0003_ppp_fulfillment_leases.sql`. **None is confirmed applied to a live authorized database.** The CI PostgreSQL test role receives explicitly granted EXECUTE privileges and runs `tenant-isolation.sql`, `atomic-payments.sql` and `fulfillment-leases.sql`; those tests remain unexecuted because runner provisioning is failing.

The new 0003 procedure returns tenant-scoped outbox claims with fencing tokens and controlled leases. Title retries require a provider-side read to confirm whether the title already exists; print retries are deliberately withheld after ambiguous failures (manual review) to avoid duplicate kitchen tickets. A caller must have a verified TAKATAK tenant entitlement, actual scoped PostgreSQL connection, provider API credentials and a monitored worker. The typed TypeScript outbox primitives do not start this process.

Production Clover webhook processing is **fail-closed** (HTTP 503) while `ordersPersistAcrossRestarts=false`. The checkout readiness gate is still false in production. Do not turn it on until both the transactional ledger and the outbox/print recovery operations are deployed and validated end to end. Do not treat `/healthz` or a Coolify queued response as a paid-order readiness check.

### 2026-10-16 — worker activation prerequisites

The codebase now contains `processPppCloverFulfillmentBatch(pool, verifiedServerTenantId, maxTasks)`, but **no deployed scheduler or database connection starts it**. Never expose it as an unauthenticated HTTP route. Invoke only from a trusted background job with PPP-scoped TAKATAK entitlement and a restricted database role after applying and testing 0001–0003. Each worker batch must be monitored for `manualReview`/`quarantinedPrints`; uncertain physical prints require a restaurant operator to verify and clear them, not automated replay.

## 2026-10-28 — Live deployment vs source verification

- Historical Coolify production server/application was verified on 26 Oct for SHA `48c00a4`; native GitHub-App push deployment is active. **Do not enable Actions fallback alongside native deployment.**
- Mobile menu corrections `b927e59f8`/`b88ec0f62`/`747cb837c`, modifier ranking `a9389f835` and Node SQL suite corrections `004e9c9`/`e1d64aa`/`9702122` are committed; their exact current-running Coolify SHA has not been verified here. The public `/menu` and `/healthz` pages were inaccessible to the external verification tool; verify Coolify deployment ID, current container SHA and health using an authorized connector before success claim.
- GitHub Actions runner allocation now works; latest inspected initial CI run `40364935041` failed at Prettier and Node test fixture, NOT runner provisioning. Don't skip required build/test gate.
- Clover credentials may exist in secure merchant administration per TAKATAK central journal but were not confirmed set in Coolify; no `DATABASE_URL` validated. Production card checkout must remain disabled until #5/#6 end-to-end verified.
- Project documentation mirrored into Drive at https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit, GitHub source note `docs/agent-notes/2026-10-28-menu-clover-audit.md`.

## 2026-10-28 — CI green, live release evidence still outstanding

**Verification for code commit `23043b539acdea63385d56bb3da6d31b2959c96e`:** GitHub Actions `PPPMTL CI` run [40639386985](https://github.com/takatakca/pppmtl/actions/runs/40639386985) concluded `success`. Its Node quality and PostgreSQL schema/atomic-payment/worker-leasing jobs both completed successfully.

The repository still has native Coolify GitHub-App auto-deploy as the historically verified production mechanism, not the opt-in Actions fallback. **No deployment event/actual running revision was read from Coolify on this date.** Public `/menu`/`/healthz` could not be reached with the connected verification tools. Therefore `23043b5` is CI-validated source, **not verified customer-visible production**. Verify exact SHA/health with authorized Coolify access, and test the reported mobile Desserts/menu interactions before treating UX bug as closed.

No Clover production checkout may be enabled solely because the SQL staging CI passes: server durable order adapter, scoped identity, configured merchant secrets, production DB/migrations, retries, order title/print and refund/reconciliation remain subject to #5/#6/#13.

## 2026-10-28 — Second-pass source CI verified; deployed build remains unconfirmed

- Current verified application/source revision: `3a584d6d8664d8621274618d04aa1367a3ffedef`. GitHub Actions [40644711329](https://github.com/takatakca/pppmtl/actions/runs/40644711329) finished SUCCESS for both quality and PostgreSQL database/test jobs; latest documentation commits naturally produce later SHAs.
- Added client-side required Clover option validation, safe old-cart rehydration, immutable reorder, quantity cap, malformed JSON guard, cart Escape/scroll containment and item-dialog focus/scroll restoration. No backend merchant secrets, database credentials, payment routing or network callbacks changed.
- **Do not mistake green CI for live deployment.** Public `/menu` and `/healthz` could not be accessed by the verification environment (network/DNS restricted); no Oct 28 Coolify running image SHA or actual mobile touch test was obtained. Native Coolify GitHub-App auto-deploy is the historical channel. The Actions deployment fallback is disabled/skipped intentionally; don't enable both.
- Controlled release: verify Coolify exact running commit + HTTPS readiness; check mobile Desserts and customizer; then address #5/#6/#13 PostgreSQL/merchant/HMAC + outbox + end-to-end prerequisites before authorizing any real charge.

### 2026-10-28 — Runtime API hardening passed CI; not a verified deployment

GitHub Actions [40645275982](https://github.com/takatakca/pppmtl/actions/runs/40645275982) completed `success` for both quality and PostgreSQL checks at tested code SHA `db58af73e7c1c42d3d261772195eb28de918a5c9`. The checkout API now rejects malformed browser payloads before parsing guest identity or creating an order. No credentials or deployment workflows were changed. **The installed/running Coolify SHA was not inspected** because `pppmtl.com` was inaccessible (web fetch and external DNS unavailable in this environment), so preserve the payment fail-closed gate and verify a native Coolify release + `/healthz` before customer-facing claims.

## 2026-10-28 — Third-pass CI green, release still unverified

`297c0f9e2d4a657228638f90d7a0f5c5546acdd3` passed [PPPMTL CI 40646740316](https://github.com/takatakca/pppmtl/actions/runs/40646740316) in both jobs: Nitro build, TypeScript, lint/tests and PostgreSQL 16 migrations/tenant RLS/payment/worker probes. Third pass added only browser cart recovery and focus/scroll management plus tests; no merchant config, secrets or checkout release toggle changed. Public web fetch failed and Browser connector required originating browser context, so no 28 October Coolify running SHA/HTTPS health/mobile tests were proven. Keep Actions deploy fallback skipped in favor of the existing native Coolify GitHub-App channel; do not claim deployed without checking the actual running revision. Real payments remain blocked until #5/#6/#13 verified.

## 2026-10-28 — Evening release go/no-go (security audit)

**Code tests, not a deployment:** [PPPMTL CI run 40648225513](https://github.com/takatakca/pppmtl/actions/runs/40648225513) passed the quality and PostgreSQL jobs at `eff248a211680e96b0879e455bdadc219e963202`. The changes harden sold-out and cross-location cart rejection, Clover pickup-only validation, and request-size bounds. A follow-up bounded administrator login guard and tests were added on `main` (through `28fbf2149`); fetch its CI result for the actual code+docs HEAD.

**Live status NOT independently verified:** Web crawl yielded a previously indexed PPPMTL homepage, but direct `/menu`/`/healthz` retrieval was unavailable; this agent's container could not resolve the domain and the browser connector had no originating browser session. These are tool limitations, not evidence the site is down. Native Coolify GitHub App auto-deploy remains the historical path; GitHub Actions fallback intentionally skips. Verify exact running SHA, deployment finished, health/TLS, latest image and tested rollback in Coolify resource `r13hz1mmbi4eeoc6ssxbvxnv` before declaring public launch.

**PAYMENTS MUST REMAIN OFF:** `ordersPersistAcrossRestarts = false` is still true; backend order storage is a bounded in-memory ring. CI's PostgreSQL 16 tests use an ephemeral database and DO NOT mean production migrations have been applied or the runtime uses PostgreSQL. No verified TAKATAK tenant Auth, real Clover merchant HMAC environment, durable webhook/outbox and print/reconcile worker or controlled charge/refund has been established. Keep #5/#6/#13 open. See [release verification procedure](agent-notes/2026-10-28-release-security-gate.md).

## 2026-10-28 — Guest order security source verified, live still unverified

Latest tested source 762972778b989236279ef8447cd79de170339e9b passed CI 40740927778 SUCCESS, both Nitro TypeScript lint tests and PostgreSQL 16 tenant/payments/worker. New boundary validates guest order list/read/cancel payloads and bounds signed cookie lengths. Website /menu was readable via web today with 17 categories and 175 items, but /healthz could not be fetched and container DNS failed. No live Coolify running SHA, /dev anonymous 401 or mobile interaction proven. Native Coolify GitHub-App path remains; Actions fallback intentionally skipped. Preserve payments fail-closed with in-process orders and unverified tenant DB/webhook/worker #5/#6/#13.
