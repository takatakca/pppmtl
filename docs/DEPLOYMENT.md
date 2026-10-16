# PPPMTL — deployment and verification

The application is a **server-rendered TanStack Start / Nitro Node application**. Static shared hosting by itself cannot receive Clover signed webhooks or keep checkout secrets.

## Current evidence

- The repository has `main` as the release branch.
- `.github/workflows/ci.yml` runs typecheck, ESLint, Vitest and Nitro Node build when source changes on `main`.
- `.github/workflows/deploy-coolify.yml` is **opt-in only** and runs only when the main-branch CI workflow concludes successfully. The GitHub Actions variable `PPPMTL_DEPLOY_VIA_ACTIONS` must equal `true`.
- When disabled or missing secrets, no Coolify deployment is requested by this workflow. Native Coolify GitHub auto-deploy is an alternative; never configure both at the same time.
- `GET /healthz` is a server liveness endpoint; it is not proof that a payment or database integration is healthy.
- There is no verified PPPMTL production host, real-domain version, or active Coolify app connection established in this handoff.

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
