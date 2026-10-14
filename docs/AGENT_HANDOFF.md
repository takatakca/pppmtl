# PPPMTL — AGENT HANDOFF (read first)

**Date:** 2026-10-14 (America/Toronto)  
**Repository:** [takatakca/pppmtl](https://github.com/takatakca/pppmtl) (private)  
**Release branch:** `main` · GitHub connection: admin/push granted  
**Last confirmed pushed commit before this handoff document:** `326eaa047f8aa731eee3e1ef5c3a8e0dc6e0ac2c` (WORKLOG update).  
**This handoff document itself is a later commit:** always read the current branch SHA from GitHub before making changes. No force push.

## Last completed work

1. Reused and merged PR #4 (commit `c93d17b`): NDG 16:00–03:00, Saint-Léonard 10:00–23:00, Hochelaga all-brand location with hours unspecified until approval.
2. Hardened checkout return so `?paid=1` does not imply payment; preserved carts and rejected invalid modifier selections and quantities.
3. Implemented a **temporary** server-side auth seam:
   - `src/lib/security/admin.server.ts`, `admin.functions.ts`, `src/routes/admin.sign-in.tsx`: 8-hour signed HttpOnly admin cookie, secure operations sign-in/logout. Admin functions in `src/lib/orders/orders.functions.ts` and `src/lib/integration/integrations.functions.ts` now require a session.
   - `src/lib/security/order-access.server.ts`: signed 14-day browser-scoped order grants; server functions no longer trust a caller-supplied phone/customer ID to return another customer's orders.
   - Per-browser random HttpOnly checkout nonce added to the idempotency key; order IDs generated with `randomUUID()`.
   - Regression tests in `src/lib/security/__tests__/access.test.ts`.
4. Added `.github/workflows/ci.yml` (Bun install, Nitro build/route generation, typecheck, lint, Vitest) and gated the opt-in Coolify deployment workflow on successful `main` CI.
5. Established the required five documents (this file, PROJECT_STATUS, TASK_QUEUE, DEPLOYMENT, DECISIONS) and updated `AGENTS.md`, `WORKLOG.md`, `README.md`.

## Currently active task / next exact action

**FIRST:** inspect [GitHub Actions](https://github.com/takatakca/pppmtl/actions/workflows/ci.yml) for the newest `PPPMTL CI` run on the actual `main` head, fetch failed job logs, fix any remaining typecheck/lint/tests/build errors and push; repeat until a fully green CI run finishes.

At creation of this handoff, earlier CI run [38613539747](https://github.com/takatakca/pppmtl/actions/runs/38613539747) failed at `tsc --noEmit` because strict env access requires brackets and new routes had not been generated before typecheck. Both causes were addressed on `main` in commits `0ea598e`, `23a7cb6` and `6216d7b`. Intermediate runs were cancelled due to follow-up pushes; latest observed run `38613991887` was queued. **No passing CI suite or production build is claimed yet.**

**SECOND:** continue mandatory P0 items [#5](https://github.com/takatakca/pppmtl/issues/5) (per-tenant TAKATAK Auth, final authorizations) and [#6](https://github.com/takatakca/pppmtl/issues/6) (durable orders, checkout/webhook idempotency, retry outbox). Work on independent pieces while waiting for verified external credentials.

## Files changed this session

- `src/lib/security/admin.server.ts`
- `src/lib/security/admin.functions.ts`
- `src/lib/security/order-access.server.ts`
- `src/lib/security/__tests__/access.test.ts`
- `src/routes/admin.sign-in.tsx`
- `src/routes/admin.orders.tsx`, `src/routes/admin.integrations.tsx`
- `src/lib/orders/orders.functions.ts`, `src/lib/orders/order-service.ts`
- `.github/workflows/ci.yml`, `.github/workflows/deploy-coolify.yml`
- `AGENTS.md`, `README.md`, `WORKLOG.md`
- `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md`, this handoff.

## Commands / verification actually executed

- GitHub connector: read repository metadata, default branch, worklog, source files, open PRs/issues; fetched file SHAs.
- GitHub connector: committed each code/doc file to `main`, read back relevant files and verified branch head between stages.
- GitHub Actions CI was configured and triggered by commits. The failed run installed dependencies and executed `bun run typecheck`; subsequent build-first CI is awaiting a trustworthy final outcome.
- Container `git ls-remote` could not access github.com because the local container lacked DNS/network access; changes were made with the authenticated GitHub connector.
- No connected Coolify app, Clover payment credentials, external DB or stable production health evidence available. No successful live deployment or paid transaction was verified.

## Known problems and risks

- **CRITICAL #6:** order store and webhook replay/dedup are still in-process memory; unsafe for multi-instance or restart scenarios. Do not enable real paid production checkout until replaced by durable transactional storage and verified outbox.
- **CRITICAL #5:** temporary PPP bootstrap login is not central TAKATAK Auth; no actual tenant/entitlement backend is connected. Guest grants work only in the issuing browser and depend on its secure cookie; users cannot recover cross-device history yet.
- **Credentials:** these three independent 32+ character server secrets must be provisioned in production, never exposed in browser or Git:
  `PPP_ADMIN_ACCESS_TOKEN`, `PPP_ADMIN_SESSION_SECRET`, `PPP_ORDER_ACCESS_SECRET`. Without order secret, `placeOrder` fails closed.
- **Clover:** merchant ID, Hosted Checkout e-commerce private key, signed webhook secret, REST token and actual merchant tax/printing config need live secure setup.
- **Hostname / hosting:** `pppmtl.com` production target and current deployed SHA were not verified. Existing files mention both Lovable and Coolify; do not assume either is live.
- **Approved facts:** Hochelaga hours must stay unpublished until the owner approves exact times; external Uber Eats/DoorDash/other store hour updates remain outside this repo.
- CI can uncover additional build/typing/security issues. Do not merge via force-push; consult fresh head and review other agent changes.

## Deployment status

**NOT VERIFIED / NOT DECLARED SUCCESSFUL.** The optional Coolify workflow is intentionally skipped unless `PPPMTL_DEPLOY_VIA_ACTIONS=true` and the two Coolify secrets are configured. It now triggers only after a successful push-originated `main` CI result. Native Coolify GitHub deployment remains an alternative, not confirmed.

## Next action after green CI

Verify which live host actually serves pppmtl.com and which commit, configure server secrets and TLS via authorized host access, implement durable orders and TAKATAK Auth, run controlled Clover payment/retry/refund tests, then deploy and verify app health + live version. Update these files with actual SHAs, logs, test outputs, deployment UUID and any remaining barriers.

**Handoff rule:** resume from the newest source of truth in GitHub; do not repeat tasks already recorded as complete; do not invent a successful deployment.
