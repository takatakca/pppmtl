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
- It queues a deploy **after** `PPPMTL CI` succeeds on a `main` push; a queued deployment is **not** proof of success.
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
