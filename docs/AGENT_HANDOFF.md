# PPPMTL — AGENT HANDOFF (read first)

## CURRENT HANDOFF — 2026-10-15, Montréal

**Repository:** `takatakca/pppmtl` (private) · **branch:** `main` · permission: GitHub write/admin.  
**Last pushed commit verified just before this handoff file update:** `74f7b478551d53a59002a6648572950bdc0254eb` (WORKLOG). This handoff update itself becomes the next commit; always fetch the actual branch head before further writes.  
**Open PRs:** none at session start. **Open issues:** #5 identity/permissions, #6 durable orders/Clover idempotency, #7 GitHub Actions runnerless failures.

### Last completed technical task

- Prior 2026-10-14 formatter cleanup succeeded via GitHub Actions bot commit `2de37b9afd521201d0f29dfff896f08a6fd7e0b5`.
- Hardened `src/lib/integration/providers/clover/checkout.ts`: only safe integer quantities 1–50 accepted; rejected fractions/non-finite values rather than rounding.
- Added `ordersPersistAcrossRestarts = false` in `order-store.server.ts`. `cloverCheckoutConfigured()` now **fails closed for real production checkout** (`NODE_ENV=production`, `CLOVER_ENV=production`) when durability is false; also requires the Clover webhook secret. It still allows configured sandbox tests; do not turn the durability flag on without a real transactional implementation.
- `src/lib/security/guest-identity.ts` makes every checkout a guest until a real TAKATAK session can be verified; browser-claimed `customerId` and `takatakCustomerId` are discarded in `placeOrder`.
- Added `src/lib/integration/__tests__/clover-readiness.test.ts` and `src/lib/security/__tests__/guest-identity.test.ts`; **tests have been written but not confirmed executed on a runner**.
- Investigated `takatakca/takatak-v1`: it has Supabase Auth and internal Master API OTP/identity routes. Existing master API authorization is specifically bound to 1LV; **never borrow `TAKATAK_1LV_API_KEY` for PPPMTL**. Requirements documented in `docs/IDENTITY_INTEGRATION.md`.
- Updated README/status/queue/deployment/decisions and switched the formatter workflow to manual trigger only, to avoid unplanned main pushes from bots.

### Currently blocked / next exact executable action

**#7 FIRST:** [Review run 38775503560](https://github.com/takatakca/pppmtl/actions/runs/38775503560) and the most recent failed [PPPMTL CI runs](https://github.com/takatakca/pppmtl/actions). October 15 runs, including 38775503560 and formatter 38775503784, report `runner_id=0`, empty `steps: []`, and their GitHub job-log fetch fails 404 `BlobNotFound`. This means no observed build, typecheck, lint or tests for the new code. GitHub's global status page lists Actions operational on October 15; this does not prove this repository's quota/billing/runner health. Review repository/org Actions/billing quotas, enabled runners and workflow job UI; resolve provisioning or ask GitHub support if necessary. Do not guess the cause and do not weaken CI. Then run **one real** `bun install --frozen-lockfile; NITRO_PRESET=node-server bun run build; bun run typecheck; bun run lint; bun run test` on current `main`, fix any actual diagnostics, and push.

**#6 SECOND:** `db/migrations/0001_ppp_orders.sql` exists but was not applied; no PostgreSQL connection, migration deploy, durable adapter, transactional webhook claims/outbox, backup or recovery test exists. Implement it with an authorized dedicated database (TAKATAK tenant scopes), verify retry/print idempotency and only then change checkout readiness.

**#5 THIRD:** implement scoped TAKATAK ↔ PPPMTL asserted customer identity and server-side tenant entitlements (see IDENTITY_INTEGRATION.md). Current temporary admin session is not TAKATAK SSO.

### Files changed during this continuation

`src/lib/integration/providers/clover/checkout.ts`, `src/lib/integration/providers/clover/config.server.ts`, `src/lib/integration/__tests__/clover-readiness.test.ts`, `src/lib/orders/order-store.server.ts`, `src/lib/orders/orders.functions.ts`, `src/lib/security/guest-identity.ts`, `src/lib/security/__tests__/guest-identity.test.ts`, `.github/workflows/format-once.yml`, `README.md`, `WORKLOG.md`, `docs/IDENTITY_INTEGRATION.md`, `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md`, and this handoff.

### Verification and access actually used

- Inspected GitHub repository permissions, `main` SHA, open issues/PRs, previous GitHub Actions run metadata, job summaries and historical logs through authenticated GitHub connector; commits above pushed and verified by head/sha reads.
- Latest **observed successful individual checks** remain from the 2026-10-14 CI run `38614204613`: Nitro build and TypeScript passed; ESLint failed Prettier formatting (formatter bot later changed source). **No comprehensive green CI on current head**.
- Attempted to fetch October 15 job logs, but GitHub returned 404 BlobNotFound; `runner_id=0` and no steps are observable. No evidence these jobs executed any build command.
- Consulted official Coolify API docs: `POST /api/v1/deploy?uuid=...` is supported, but no authenticated PPPMTL Coolify app or active deployment was found.
- Attempted external `https://pppmtl.com/healthz`; current web fetch could not access the URL. No live deployed SHA/version, HTTP health or Clover transaction is verified.
- Local container has no GitHub DNS/network credentials for cloning the private repository and cannot install the project's locked dependencies there.
- External access still needed: actual production host/Coolify app, deployed branch/domain mapping, DB/Pg credentials and migration rights, properly scoped TAKATAK assertion auth backend, Clover merchant/webhook secrets, and functioning GitHub Actions runners. Never expose secrets in GitHub, UI or docs.

### Production/deployment status

**NOT DEPLOYED OR VERIFIED IN THIS SESSION.** The opt-in Coolify workflow remains skipped; deployment must be gated by green CI and a matching exact `main` SHA. Real Clover production charges are now blocked in source until order storage is durable. Continue with all independent code/docs work, but do not claim a live launch or complete issue #5/#6/#7.

### Resume instructions

Read `AGENTS.md`, this current section, `WORKLOG.md`, `docs/TASK_QUEUE.md` and `docs/DEPLOYMENT.md`. Check `main` and GitHub Actions, then resume issue #7 recovery; once a working runner exists, address real CI diagnostics and implement #6/#5. No force-push and no duplicating already merged work.

---

## HISTORICAL HANDOFF — 2026-10-14


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
