# PPPMTL — AGENT HANDOFF (read first)


## CURRENT HANDOFF — 2026-10-16 (America/Toronto)

**Repository:** `takatakca/pppmtl` (private), branch `main`, push/admin confirmed. **Main HEAD verified before this handoff update:** `99a20285128487132da2dc61914c95599639b646` (`docs/DB_ROLLOUT.md`); this handoff update and subsequent WORKLOG update create later commits. **Always fetch the real GitHub HEAD**. No open PRs at resume; issues #5 (TAKATAK Auth), #6 (durable checkout/outbox) and #7 (GitHub Actions runner provisioning) remain open.

### Last completed task

**Critical source repair:** `db/migrations/0002_ppp_atomic_payments.sql` was actually malformed. The previous agent's final string substitution truncated the `coalesce(p_payload_digest, '') !~ '^[a-f0-9]{64}$' OR` expression and repeated the remainder of the PL/pgSQL function after `COMMIT;`. Restored the complete validation and removed the second tail (commit `3eba0bbb1de512e3c56e89f26bcd0323941f10cc`).

**Preflight:** created `scripts/check-sql-migrations.mjs`, `scripts/__tests__/check-sql-migrations.test.mjs`, wired the Node structural test to the PostgreSQL job in `.github/workflows/ci.yml`. The checks detect duplicate/missing transaction bounds, unmatched dollar quotes and missing Clover 0002 digest/status guards. Node 22 was used to run a local reproduction of the five checker tests; **all five passed**. Independently inspected current GitHub migration file text: each of 0001 and 0002 has exactly one BEGIN/COMMIT, and 0002 has two function bodies/four dollar delimiters. **This is not a PostgreSQL syntax/execution test**.

**Server code:** added `src/lib/orders/postgres-transactions.server.ts` and `src/lib/orders/__tests__/postgres-transactions.test.ts` with an injected pool/client boundary, `BEGIN` → bound tenant-local `set_config` → COMMIT/ROLLBACK and guaranteed release, SQL-backed guest-order idempotency, Clover checkout session write before redirection and previously verified signed-event persistence. Guest storage rejects any browser-claimed customer identity and refuses `isGuest=false` without master verification; checkout destination requires Clover HTTPS hostname. **No database driver/pool has been provisioned or integrated into `order-service.ts` yet. Mock Vitest tests were authored but have not executed.**

**Docs:** updated `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DB_ROLLOUT.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md`; `WORKLOG.md` claimed active task and must be marked partial at completion.

### Current and next work

1. **#7 — CI infrastructure:** run 38848538433 from the previous session had both jobs fail with no assigned runner and `steps=[]`. Newly pushed commits launched fresh CI attempts, including `38883685755` (pending when checked); distinguish queued work from failed runnerless jobs. Inspect Actions account/repository billing, hosted runner availability and policy. Once a runner actually executes jobs, run the exact current-main quality/test/build + PostgreSQL 0001/0002 SQL smoke suite, fix *actual* failures. Do not keep rerunning identical runnerless attempts.
2. **#6 — Production durability:** provision an approved PostgreSQL service + restricted role (no new billable Supabase project), apply both reviewed migrations and run the signed-payment/RLS tests. Connect the injected adapter to the existing synchronous order API by a carefully reviewed async/storage transition; ensure a checkout is durably committed before returning its payment URL. Add verified location→tenant scope, durable signed-webhook inbox, parallel/lease recovery, Clover title+print worker with ambiguous print/manual-review handling, reconciled refund/cancellation and backup/restart proof. **Keep `ordersPersistAcrossRestarts=false`.**
3. **#5 — Verified central identity:** integrate a PPPMTL-specific TAKATAK authorization assertion and server-side tenant/product entitlements; never reuse 1LV keys. Keep guest ID null until verified. Replace temporary admin login with TAKATAK roles before launching.
4. **Deployment:** identify the actual Coolify/Contabo/other PPPMTL application, HTTPS domain and scoped secrets; use CI-gated deployment only after successful checks; verify exact release SHA and `/healthz`, not just a queued deployment. At this handoff, public site fetch returned HTTP 403 and `/healthz` could not be read. These do not prove a release.

### Files changed in this session

`db/migrations/0002_ppp_atomic_payments.sql`, `scripts/check-sql-migrations.mjs`, `scripts/__tests__/check-sql-migrations.test.mjs`, `.github/workflows/ci.yml`, `src/lib/orders/postgres-transactions.server.ts`, `src/lib/orders/__tests__/postgres-transactions.test.ts`, `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md`, `docs/DB_ROLLOUT.md`, `WORKLOG.md`, this handoff.

### Verification performed

- Read from authenticated GitHub: `main` branch SHA, repository access, AGENTS.md, prior handoff, issue/PR lists, CI workflows and runs, relevant SQL and order source. Pushed normal SHA-guarded file commits on authorized `main`; re-read the repaired migration, structural checker and the adapter. No force-push.
- Ran `node --test` on an equivalent local temporary copy of the five migration-preflight tests: **5 pass / 0 fail**. This verifies the checker logic only; the repository's exact files and complete Vitest/build were not executed locally.
- Inspected both migration files' actual GitHub contents with structural assertions; no double commit/trailing SQL issue remained.
- GitHub Actions runs up to `38883685755` were checked; prior attempted CI executions had `runner_id=0`/no steps. A new CI was pending at last check. No successful end-to-end CI, database migration, payment/refund or printer recovery was observed.
- Public `https://pppmtl.com/healthz` inaccessible; `https://pppmtl.com` returned 403 from web fetch. No functioning production SHA can be attested.

### Deployment status and outstanding accesses

**NOT DEPLOYED / VERIFIED IN THIS SESSION.** CI-triggered Coolify workflow has been skipped or awaits upstream status; the PPPMTL Coolify app and live database are not identified through connected tools. Production Clover Hosted Checkout is still fail-closed because orders remain in-memory. Need working GitHub-hosted runner allocation, an approved PostgreSQL target and migration credentials, PPP-specific verified TAKATAK assertion issuer/tenant mapping, merchant-side credentials, actual Coolify service and deploy API access. Never commit secrets. The connection to an external session orchestrator was not present; a prompt alone cannot restart stopped agent sessions.

### Next exact executable operation

Fetch `main` and latest CI jobs. If runnerless persists, implement/review the PostgreSQL-backed order/webhook/outbox path and scoped TAKATAK server assertions in source without enabling live payments. Execute full Postgres SQL/TypeScript checks as soon as an actual runner/DB exists; then complete deployment/rollback verification. Keep AGENTS/WORKLOG and these five docs in sync.

---



## CURRENT HANDOFF — 2026-10-15 late evening (America/Toronto)

**Repository:** `takatakca/pppmtl` · **branch:** `main`, direct pushes permitted and performed without force-push.  
**Latest main SHA confirmed immediately before this handoff update:** `861487b34d26e74fef1a3f65733fef6fff6694de` (`WORKLOG.md`). Updating THIS handoff produces a later SHA; read the actual GitHub branch HEAD at next launch.  
**Open issues:** [#5 authenticated TAKATAK/tenant permissions](https://github.com/takatakca/pppmtl/issues/5), [#6 durable order/payment/webhook store](https://github.com/takatakca/pppmtl/issues/6), [#7 GitHub Actions runner provisioning](https://github.com/takatakca/pppmtl/issues/7). No PRs open at the start.

### Last completed code tasks (committed, not production verified)

- `src/lib/integration/__tests__/clover.test.ts`: mocked Clover checkout now explicitly uses `CLOVER_ENV=sandbox`. Previously live-mode fail-closed safety prevented mocked checkout tests from executing their intended path.
- `src/lib/integration/providers/clover/orders.ts`: do not price or create a live Clover checkout using fallback static inventory when the Clover REST feed cannot be read. Sandbox may use the snapshot; production requires the provider-backed catalogue.
- `src/lib/integration/providers/clover/config.server.ts`: production payment readiness now also requires a REST token in addition to durable storage/merchant/Hosted Checkout/webhook credentials. **The in-memory storage guard still disables live payments.**
- `db/migrations/0002_ppp_atomic_payments.sql`: security-invoker `ppp.create_order_once` (tenant-scoped order idempotency) and `ppp.record_verified_clover_payment` (server-verified payment event deduplication, conflict checks, paid status update and a unique `CLOVER_TITLE` intent). Requires same-transaction `SET LOCAL ppp.tenant_id`; PUBLIC function EXECUTE revoked. No Clover signature is checked inside SQL; the caller must verify it. **No application DB driver calls these functions yet.**
- `db/tests/atomic-payments.sql`: rollback-only tests for same-tenant idempotency, duplicate signed webhook receipts, mismatched payload digest, paid order consistency, unique title-only outbox and cross-tenant session invisibility. `.github/workflows/ci.yml` now applies migrations 0001 and 0002 and runs both PostgreSQL tests as a restricted role.
- `src/lib/integration/core/webhook-body.server.ts` and `src/lib/integration/providers/clover/webhook.ts`: public incoming Clover webhook body limited to 128 KiB **while streaming**, ahead of HMAC/JSON work; return HTTP 413 for oversized, 400 for malformed body. Added `src/lib/integration/__tests__/webhook-body.test.ts` to cover raw bytes, streamed/declared size and handler rejection. Align test formatting with `.prettierrc`.
- Updated `docs/DB_ROLLOUT.md`, `docs/TASK_QUEUE.md`, `docs/PROJECT_STATUS.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md` and `WORKLOG.md` with explicit source-vs-deployed status and irreversible-payment release gates.

### Currently active / blocked work

**Priority 1 — #7:** Restore actual GitHub Actions runner assignment. Latest inspected run [38848450042](https://github.com/takatakca/pppmtl/actions/runs/38848450042) failed both `Typecheck, lint, tests and server build` and `PostgreSQL schema and tenant isolation` with `runner_id: 0` and **zero executed steps**. This is consistent with previous runnerless failures. Review GitHub repository/org billing, Actions restrictions and runner availability in Settings. No tool surfaced the admin billing/runner settings. Re-run CI on the exact current `main` SHA after the runner issue is resolved. Fix real build, types, lint, Vitest or PostgreSQL diagnostics only once the runner actually executes commands.

**Priority 2 — #6:** Obtain approved PostgreSQL connection/roles and staging migration access; review and run migrations 0001/0002 in order, test rollback/recovery, implement TypeScript transactional adapter and lifecycle that atomically stores checkout sessions before external redirection. Add durable webhook lease/retries, worker for Clover title, and print only after title with provider-side read-before-print and ambiguity/manual review. Tests must prove parallel requests, restarts, duplicate signatures and cross-tenant isolation. Schema/function SQL alone is **not** a working durable order service; keep `ordersPersistAcrossRestarts=false`.

**Priority 3 — #5:** Integrate validated TAKATAK identity and product/tenant entitlements through a dedicated PPPMTL-scoped API/assertion; never reuse another app's `TAKATAK_1LV_API_KEY`. Replace the temporary admin token with role-scoped operations login and authorize cross-device order history only via verified user identity.

**Priority 4 — deploy:** Identify PPPMTL's actual authorized Coolify/Contabo or other deployment target, provision scoped secrets and HTTPS without changing email DNS, then use **one** CI-gated deploy mechanism. Test exact commit SHA, HTTPS health and real credentials in staging. Do not enable live Clover production checkout without durable orders and verified backend/workers.

### Files written this continuation

`WORKLOG.md`, `src/lib/integration/__tests__/clover.test.ts`, `src/lib/integration/__tests__/clover-readiness.test.ts`, `src/lib/integration/providers/clover/orders.ts`, `src/lib/integration/providers/clover/config.server.ts`, `src/lib/integration/core/webhook-body.server.ts`, `src/lib/integration/providers/clover/webhook.ts`, `src/lib/integration/__tests__/webhook-body.test.ts`, `db/migrations/0002_ppp_atomic_payments.sql`, `db/tests/atomic-payments.sql`, `.github/workflows/ci.yml`, all five canonical docs and this file.

### Verification/commands genuinely performed

- Through the authenticated GitHub connector: read `AGENTS.md`, previous handoff, `WORKLOG.md`, queue/status, `main`, latest Actions runs/jobs, issues and PRs; reviewed relevant TypeScript, SQL and workflows; committed source changes on `main`, read-back/verified the latest branch head.
- GitHub Actions automatically launched after commits; checked run `38848450042`: both jobs failed **without an assigned runner or steps**. No successful new code build, typecheck, lint, Vitest, PostgreSQL migration/probe or outbox integration test can be claimed.
- Local runtime check: Node 22 exists, but Bun, `psql`, `postgres` server and authenticated private-repository clone/build access are unavailable. No real PostgreSQL or live Clover requests were executed.
- All source commits were published with ordinary updates. No force-push or secret was disclosed.

### Real deployment status

**NOT VERIFIED / NO SUCCESS CLAIMED.** The Coolify opt-in deploy workflow is skipped because CI has not succeeded and the target is not proven configured. No live application SHA, backend liveness, real card payment, database migration or print-out was observed. Live Clover payment remains fail-closed while the in-memory order store is in use. The newly added SQL functions must NOT be described as activated.

### Resume directly without redoing work

Re-read the first sections here, then `AGENTS.md`, `WORKLOG.md`, queue, deployment docs; fetch actual `main` HEAD and latest jobs. Do **not** rerun an identically runnerless CI repeatedly without a changed condition. Work on the next independently executable issue #6/#5 step while Actions runner provisioning is blocked, and preserve the above safeguards. No external autonomous session orchestrator was connected; automatic self-restart is not available from this chat alone.

---



## CURRENT HANDOFF — 2026-10-15, session continued after 15:04 Montréal

**Repository:** `takatakca/pppmtl` · **Release branch:** `main` (write permissions confirmed).  
**Last confirmed pushed commit BEFORE this handoff update:** `4942f45fcd817fe357111044ab09d94a4477938d` (WORKLOG). This file update creates another commit: always read the actual `main` SHA before writing further. No force push.  
**Open issues:** [#5 TAKATAK Auth and tenant permissions](https://github.com/takatakca/pppmtl/issues/5), [#6 PostgreSQL durable order/webhook/outbox](https://github.com/takatakca/pppmtl/issues/6), [#7 GitHub Actions runnerless jobs](https://github.com/takatakca/pppmtl/issues/7). No open PRs were found at resume.

### Last task completed (source commits pushed; production remains blocked)

- **Clover webhook correctness:** `src/lib/integration/providers/clover/webhook.ts` validates signed `PAYMENT` type, provider payment ID, checkout session ID and exact expected merchant before applying payment; rejects wrong merchant. Reversible REST lookup/title failures and unexpected exceptions release in-process replay claims, log a redacted error and return HTTP 503 plus Retry-After. Print failure is surfaced for manual review, not a claim that fulfilment succeeded.
- **Replay helper:** `src/lib/integration/core/webhook-security.ts` gained `releaseWebhookDelivery`. Reminder: still in-process memory, not durable and not exactly-once; #6 is critical.
- **Tests added:** `src/lib/integration/__tests__/clover.test.ts` has wrong-merchant, wrong-event, temporary REST error and thrown-exception retry cases. Also `clover-readiness.test.ts` verifies the live payment safety guard under multiple `NODE_ENV` values.
- **Clover payment gating:** `src/lib/integration/providers/clover/config.server.ts` blocks `CLOVER_ENV=production` when `ordersPersistAcrossRestarts=false`, regardless of Node environment.
- **PostgreSQL tenant safety:** `db/migrations/0001_ppp_orders.sql` now uses composite `(tenant_id, order_id)` foreign keys and `FORCE ROW LEVEL SECURITY` for all PPP tables; `db/tests/tenant-isolation.sql` tests no cross-tenant reads/writes/outbox references in a rollback-only transaction.
- **CI:** `.github/workflows/ci.yml` gained a PostgreSQL 16 service job that applies the migration on an ephemeral instance and runs the isolation test as a restricted role. **No PostgreSQL job has actually executed: GitHub runners are not being provisioned.**
- **CD:** `.github/workflows/deploy-coolify.yml` now uses the official `GET /api/v1/deployments/{uuid}` after the POST, waits for `finished`, requires deployment commit equals the passing CI SHA, and verifies optional `PPPMTL_HEALTHCHECK_URL` (default HTTPS `https://pppmtl.com/healthz`). Deploy job remains opt-in/disabled and untested against a real resource.
- **Documentation:** `docs/DB_ROLLOUT.md` created; `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md` and `WORKLOG.md` updated.

### Next exact action — unfinished task

**1. CI infrastructure first:** investigate [issue #7](https://github.com/takatakca/pppmtl/issues/7) with GitHub repository/organization Actions policies, billing quota and runner provisioning. Attempt #2 of run `38776419726` was re-triggered through the authenticated GitHub plugin but again failed without running steps. Newest verified CI run `38792461370` failed, as did both jobs of `38792224759`; the GitHub Actions job response had `runner_id=0`, an empty runner name and `steps=[]`. Previous job logs failed with 404 BlobNotFound. **Do not assume these are compile/test failures.** Once a runner becomes available, rerun current-main CI and correct any real Nitro, TypeScript, ESLint, Vitest or PostgreSQL test diagnostics.

**2. Durable payments:** implement a real authorized PostgreSQL connection, verified tenant-bound transactions, persistent order creation, provider IDs, webhook deduplication, recovery worker, print-once outbox, backup/restore and integration tests. SQL exists but has never been applied to production or staging. Do NOT flip `ordersPersistAcrossRestarts` without actually replacing the store. See `docs/DB_ROLLOUT.md`.

**3. Identity:** integrate the TAKATAK master authority via PPP-specific scoped verification and role/tenant entitlements. Do not reuse the existing 1LV credential. Existing temporary admin cookie and signed guest receipts are not full TAKATAK SSO (issue #5).

**4. Hosting:** identify/authorize PPPMTL's actual Coolify/Contabo application (or another verified target), set server secrets without exposing them, attach correct domain and HTTPS, keep DNS email records intact; enable one deployment mechanism only after green CI, and confirm resulting revision/health. Only after durable payment checks may actual merchant checkout be enabled.

### Verification performed and deployment evidence

- Read `AGENTS.md`, prior handoff, tasks/status, GitHub HEAD/PRs/issues, source, checkout/security/webhook modules, workflows and recent GitHub Actions jobs.
- Pushed normal GitHub commits on `main`, read back updated webhook code, migration and CI workflows. All source modifications are recorded in WORKLOG; no local git clone was possible because this environment cannot resolve private GitHub via container DNS.
- Retried one old failed CI job through the GitHub API; still failed before starting its runner. No new build, ESLint, TypeScript, Vitest or SQL probe success can be attested.
- Verified Coolify's documented POST `/api/v1/deploy` and GET `/api/v1/deployments/{uuid}` API contracts, but **did not** call a real authenticated Coolify instance.
- External check: `https://pppmtl.com` returned HTTP 403 via the public fetch tool and `https://pppmtl.com/healthz` could not be retrieved. Neither is evidence of a working release.
- **Real deployment status: NOT VERIFIED / NO SUCCESS CLAIMED.** Optional Coolify workflow runs are skipped. No live payment, checkout, webhook printer or DB transaction was performed.
- Access required: Actions runners, authorized database/migration/app role, PPP-specific TAKATAK assertion service, live merchant credentials, identified Coolify instance and scoped API token. Never record credential values in docs or GitHub history.

### Files changed in this continuation

`src/lib/integration/providers/clover/webhook.ts`, `src/lib/integration/core/webhook-security.ts`, `src/lib/integration/providers/clover/config.server.ts`, `src/lib/integration/__tests__/clover.test.ts`, `src/lib/integration/__tests__/clover-readiness.test.ts`, `db/migrations/0001_ppp_orders.sql`, `db/tests/tenant-isolation.sql`, `.github/workflows/deploy-coolify.yml`, `.github/workflows/ci.yml`, `docs/DB_ROLLOUT.md`, `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md`, `WORKLOG.md`, and this handoff.

### Agent continuity

Read this section and then the prior handoff. Do not redo merged PR #4 or previously shipped safety improvements. Maintain TAKATAK's central identity authority and strict tenant boundaries. An external orchestrator can restart future sessions only after it has been explicitly installed and authorized; a prompt cannot self-restart an interrupted agent. No orchestrator was connected or configured here.

---


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
