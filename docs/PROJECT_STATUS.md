# PPPMTL — project status

Updated: 2026-10-15 · branch: `main` · [repository](https://github.com/takatakca/pppmtl)

## Product identity and current implementation

- PPP Pizzeria Montreal and franchise storefronts share a TanStack Start / React 19 / TypeScript / Tailwind application.
- Main experience, category rails, cart, order customization, brand-by-host routing, SEO / sitemaps / llms.txt and multi-language copy already exist.
- Clover real-menu overlay with mapping, option pricing, real product photography, server-side pickup checkout, signed payment webhook handling and restaurant register/KDS title/print workflow exist in source code.
- UrbanPiper integrations are prepared but depend on provider credentials/mappings; third-party delivery remains through external marketplaces.
- Business facts from PR #4 were merged: NDG 16:00–03:00, Saint-Léonard 10:00–23:00, Hochelaga listed across brands with hours unpublished until confirmed.
- On 2026-10-14 the payment return screen was corrected not to treat `?paid=1` as proof of payment, order quantities/modifiers were hardened, and an authenticated operations/guest-receipt security seam was added.

## Readiness matrix

| Area | Source status | Production status |
|---|---|---|
| Brand storefronts and catalog | Implemented | DNS/live domains still to verify |
| Clover price mapping/checkout | Code present | Production secrets/real payment/refund not verified |
| Clover print and webhook | Code present | Durable replay tracking and retry missing |
| Orders and history | In-memory implementation | **Not production ready**; issue #6 |
| Admin/integrations | Temporary signed admin login and server guards | Requires env secrets and TAKATAK roles later; issue #5 |
| Guest receipts | Signed HttpOnly same-browser grants | Cross-device TAKATAK account backend unavailable |
| Tests/build | GitHub CI added, checks triggered | A green end-to-end result not yet established |
| Deployment | Opt-in Coolify workflow plus `/healthz` | No verified release or active target configuration |

## Security caveats

- **Do not enable paid production checkout** until durable orders, provider event deduplication and retry are implemented and tested. Current in-memory order state is insufficient for multi-worker restarts.
- Temporary admin login requires three separate server-side secrets: `PPP_ADMIN_ACCESS_TOKEN`, `PPP_ADMIN_SESSION_SECRET`, `PPP_ORDER_ACCESS_SECRET`; all at least 32 characters, not shared. This is not yet TAKATAK Auth.
- Customer phone number and user-controlled customerId do not authorize history. The current browser's signed grant determines which orders may be read or cancelled.
- A guest changing browsers, clearing cookies or returning after a restart may lose access to historical orders; Clover is the authoritative payment source.

## Open issues

- [#5 Authentication, authorization and tenant isolation](https://github.com/takatakca/pppmtl/issues/5)
- [#6 Durable order and Clover webhook pipeline](https://github.com/takatakca/pppmtl/issues/6)

See [TASK_QUEUE.md](TASK_QUEUE.md), [AGENT_HANDOFF.md](AGENT_HANDOFF.md), [DEPLOYMENT.md](DEPLOYMENT.md), and [DECISIONS.md](DECISIONS.md).

## 2026-10-15 safety changes

- Formatter bot successfully committed the previous Prettier cleanup as `2de37b9`. Subsequent GitHub Actions jobs on October 15 have failed before publishing runner steps/logs; follow [#7](https://github.com/takatakca/pppmtl/issues/7). **No full green CI is confirmed** for newer commits.
- Real Clover Hosted Checkout is **disabled for production Clover payments in every Node environment while the order store remains in memory**. Clover sandbox/test routes remain available only with webhook verification credentials. This blocks charging customers until #6 is actually implemented.
- Clover price validation now rejects fractional, NaN, infinite, zero and >50 quantities. Guest checkout discards unverified browser-claimed TAKATAK/customer identity IDs.
- Reviewed `takatakca/takatak-v1` auth source; its current internal identity endpoints use an unrelated 1LV-specific integration credential. Do **not** reuse it for PPPMTL. See [IDENTITY_INTEGRATION.md](IDENTITY_INTEGRATION.md).

## 2026-10-15 continuation — webhook, DB and delivery safety

- Clover Hosted Checkout now rejects signed events whose merchant ID does not match this site's merchant or whose type is not PAYMENT. On recoverable Clover REST lookup/title failures or unexpected processing exceptions, the process-local claim is released and HTTP 503/Retry-After is returned. A print failure is flagged for operator review rather than declared successful fulfilment. These are safety improvements, **not durable exactly-once guarantees** (#6 remains open).
- A production Clover payment cannot be enabled with the current in-memory store by changing `NODE_ENV`. `CLOVER_ENV=production` remains blocked until durable storage exists.
- PostgreSQL schema now uses same-tenant composite foreign keys for outbox/events, forces RLS for table owners and has a rollback-only isolation probe at `db/tests/tenant-isolation.sql`. Neither the schema migration nor the probe has been executed against a real PostgreSQL instance.
- CI has an additional ephemeral PostgreSQL 16 job. Latest verified GitHub CI run `38792224759` failed on two jobs with `runner_id=0` and `steps=[]`; no executable build/test result is available. Track issue #7.
- Optional Coolify workflow now polls the deployment's official API until `finished`, compares its actual commit with the green CI SHA and checks HTTPS `/healthz`. Deployment configuration remains disabled/unverified.

## Late-session hardening (2026-10-15)

- Clover integration mocks explicitly use `CLOVER_ENV=sandbox`; production quotations and payments now fail closed when live Clover inventory cannot be fetched. Production readiness also requires a Clover REST token and durable order storage (still absent).
- `db/migrations/0002_ppp_atomic_payments.sql` adds secure tenant-scoped, idempotent order-creation and verified-webhook/payment-to-title-outbox SQL operations; `db/tests/atomic-payments.sql` tests them. **Neither is applied or proven by a working PostgreSQL runner yet.** The backend still uses the in-memory order store.
- Public Clover webhook bodies are now capped at 128 KiB before signature verification; streaming/body-length regression tests committed.
- The production-payment lockout remains active; this is a security improvement, **not** a successful payment, fully durable implementation or live deployment.

## 2026-10-16 — SQL repair and transactional adapter progress

- Discovered that `db/migrations/0002_ppp_atomic_payments.sql` had an **invalid, truncated payment-digest expression and duplicated trailing SQL after its first COMMIT**. Repaired the migration in commit `3eba0bbb1`. Earlier claims that 0002 was ready to apply are superseded; the corrected SQL still requires a real PostgreSQL staging run.
- Added a dependency-free structural migration preflight (`scripts/check-sql-migrations.mjs`), five negative/positive `node:test` fixtures, and an extra PostgreSQL CI step. A local reproduction of the preflight tests passed 5/5; inspected both migrations' actual GitHub contents and saw one BEGIN/COMMIT pair and balanced function delimiters. **No live PostgreSQL syntax/execution proof.**
- Added `src/lib/orders/postgres-transactions.server.ts`: parameterized transaction-local tenant context, rollback/release safety, atomic create-order SQL function call, durable Clover checkout-session association, and recorded-payment SQL function call. Added mocked database transaction/identity/redirect tests. **These functions are not yet wired into the existing synchronous in-memory order path or any real database pool**; `ordersPersistAcrossRestarts=false` and Clover live payment guard remain unchanged.
- GitHub Actions job provisioning issue #7 remains open; neither the app build nor the PostgreSQL test suite is confirmed green on this source.

## 2026-10-16 — fulfillment worker and webhook safeguards (source-only)

- Updated PostgreSQL migration `0002_ppp_atomic_payments.sql` to **reject reused idempotency keys** when immutable checkout intent differs (location, provider, customer reference, items, customer, order type, address or notes). `db/tests/atomic-payments.sql` now checks changed cart and changed location rejection.
- The production Clover webhook refuses to reconcile/retitle/print when the active order store is still in memory: a valid signed payment event receives retryable HTTP 503. Sandbox webhook tests remain explicit; a new regression test covers this production block.
- Added `0003_ppp_fulfillment_leases.sql` and `db/tests/fulfillment-leases.sql`: RLS-scoped `claim_due_fulfillment` leases with per-claim UUID fencing tokens, `finish_fulfillment` with controlled title retry and print-after-title, and `quarantine_expired_prints` to require operator review for ambiguous physical prints. SQL is wired to the PostgreSQL CI job, but **has not run on a real database**.
- `src/lib/orders/postgres-transactions.server.ts` now includes typed, injected-pool claim/complete/quarantine primitives with unit tests. These are **not** a running worker, real provider integration or live payment backend.
- Structural source readback: migrations 0001/0002/0003 each have one top-level BEGIN/COMMIT and balanced function delimiters. GitHub Actions continues to fail without an allocated runner; no successful build, real SQL probe, production payment, or deployment is attested.

### 2026-10-16 — provider-aware worker source added

`src/lib/orders/clover-fulfillment-worker.server.ts` now implements **one opt-in batch** of paid-order/reconciliation work using the injected PostgreSQL pool: it reads the tenant-scoped PAID Clover order, verifies session and payment ID against the durable outbox, reads Clover provider state before touching a title/print, titles when necessary, skips already-printed orders and quarantines uncertain print outcomes. `src/lib/orders/__tests__/clover-fulfillment-worker.test.ts` adds mocked tests for title already present, incorrect payment association, already printed, uncertain print and expired-print counts. This source does **not** register a scheduler, live endpoint, verified TAKATAK tenant resolver or database connection; it has NOT executed on a GitHub runner or been deployed.

## 2026-10-28 — Mobile menu, Clover modifiers and project-history handoff

- Two simultaneous 28 Oct GitHub agents detected; preserved their commits rather than repeating edits: `b927e59f8` fixes category-chip scroll/jump/sticky rail; `b88ec0f62` fixes required-choice modal scroll; `747cb837c` reduces staggered mobile grid lag; `a9389f835` orders real Clover groups (base choice, sauce, garnish, beverage, trio, combo, extras); `c88097721` adds tests. All must be verified against a deployed exact SHA and real mobile interactions.
- CI has **assigned GitHub-hosted runners**. Run `40364935041` successfully built Nitro and typechecked, then stopped on 25 Prettier errors; PostgreSQL preflight failed one malformed Node fixture (4/5 pass). Fixed the fixture and moved its Node-only test out of Vitest discovery in commits `004e9c9`, `e1d64aa`, `9702122`; complete green CI still not proved.
- Historical evidence from 26 Oct: `48c00a4` hydration fix was verified deployed to native Coolify on Contabo vps2. A newer live SHA was **not** verified during this audit. A public HTTP check from this environment could not access `/menu` or `/healthz`.
- Google Drive PPP project handoff now at https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit and detailed GitHub note at [docs/agent-notes/2026-10-28-menu-clover-audit.md](agent-notes/2026-10-28-menu-clover-audit.md). Preserve owner-approved completed yellow Canva exports (issue #18) and the prepared-but-not-injected Clover secrets.

## 2026-10-28 — Verification update: full CI green after menu and Clover changes

- **GitHub Actions [40639386985](https://github.com/takatakca/pppmtl/actions/runs/40639386985) finished SUCCESS on commit `23043b539acdea63385d56bb3da6d31b2959c96e`.** The quality job passed Bun install, Nitro Node build, TypeScript, ESLint/Prettier and the complete configured application test suite. The database job passed migration structural preflight, PostgreSQL 16 migrations 0001–0003, limited-role tenant isolation, atomic payment and fulfillment-leasing SQL probes.
- The last SQL blocker was malformed `DO $` / `$;` in `db/tests/atomic-payments.sql`, repaired at `23043b5`; the preceding Node fixture missing `$$` was repaired at `74e1767`. Targeted source Prettier run `40639106678` successfully committed `783fe3e`.
- Green CI **does not prove interactive mobile behavior, a new live Coolify release, connected Clover merchant credentials or real transactions**. Source-only runtime and payment release gates #5/#6 remain in place; keep testing on the verified deployed SHA before reporting customer-visible success.

## 2026-10-28 — Second pass: menu-to-cart integrity (verified source)

- Advanced the owner-requested menu QA beyond scroll/visual work: `checkSelections` now rejects malformed JSON modifier values without throwing, and `canAddCartLine` gates the cart with current Clover required groups, availability, selected store and 1–50 safe integer quantity. Restored carts and reorders are checked/re-priced; reorder no longer mutates the live React state array. Mobile item dialogs reset to the first product choice on product swap and contain scrolling; cart has Escape and 50-unit limit.
- Additional tests exercise genuine PPP pita modifier requirements and malformed/null selections. Static snapshot check covered **175 items and 218 Clover groups**, finding zero missing references or groups whose available choices fell short of the required minimum.
- **CI proof:** GitHub Actions [40644711329](https://github.com/takatakca/pppmtl/actions/runs/40644711329) = SUCCESS on source SHA `3a584d6d8664d8621274618d04aa1367a3ffedef` (Node build, TS, lint, Vitest, PostgreSQL 16 migrations/tenant/payment/worker probes).
- **Not proven:** actual live Coolify SHA, mobile touch behavior, live Clover merchant/API, production DB/TAKATAK auth and paid checkout. Previous fail-closed payment gate remains. Full dated audit: [cart reliability notes](agent-notes/2026-10-28-cart-reliability-audit.md).

### 2026-10-28 — Runtime checkout API guard completed

Additional safe-request validation in `src/lib/orders/order-service.ts` and `src/lib/orders/orders.functions.ts` prevents malformed, null or oversized incoming browser checkout JSON from being dereferenced or reaching `createOrder` before server checks. Tests cover missing customer, wrong field types, invalid lines and >100 lines. **GitHub CI [40645275982](https://github.com/takatakca/pppmtl/actions/runs/40645275982) succeeded on code SHA `db58af73e7c1c42d3d261772195eb28de918a5c9`**, including all configured application tests and PostgreSQL 16 probes. This is not proof of an Oct 28 live Coolify rollout or paid Clover checkout; production prerequisites remain pending. See [full technical audit](agent-notes/2026-10-28-cart-reliability-audit.md).

## 2026-10-28 — Saved-cart recovery and modal keyboard reliability (third pass)

- Browser restoration now uses `reconcileSavedCart` to revalidate/prune/reprice historical cart lines against current Clover snapshot; instead of silently removing obsolete items or choices, the UI displays a dismissible English/French/Spanish notice with removal/update counts and a Review cart action. Valid Clover choices are preserved.
- `src/lib/use-dialog-keyboard.ts` supplies Tab/Shift-Tab focus containment, Escape close and previous-focus restoration for item customizer and cart; related-item swaps no longer rerun dialog focus restoration. Confirm interactions on real mobile/browser devices separately.
- Regression tests cover real pita choices, changed prices/options, invalid stores/items/quantities and malformed saved JSON. **GitHub CI [40646740316](https://github.com/takatakca/pppmtl/actions/runs/40646740316) SUCCESS for source SHA `297c0f9e2d4a657228638f90d7a0f5c5546acdd3`**, full app and PostgreSQL 16/RLS/payment/worker tests.
- No verified live Coolify image revision, device QA, production persistent orders, live Clover provider credential/merchant or production paid transaction. Existing payment safety gate remains intact. [Technical note](agent-notes/2026-10-28-cart-reliability-audit.md).

## 2026-10-28 — Evening release safety audit and inventory isolation

- **Source security fix:** `src/lib/orders/order-service.ts` now rejects sold-out items and products not offered by the requested restaurant before order creation. Previous negative availability check was built from an already filtered `getItems(locationId)` map and could miss invalid items. Clover delivery is refused at the server validation boundary (pickup only), before creating an order.
- Incoming checkout fields/choice counts are bounded by length as defense against malformed or oversized JSON. New regression tests cover merchant-sold-out item, wrong-store item, delivery rejection before creation, and oversized input; existing forged webhook tests preserved.
- **CI proof:** [40648225513](https://github.com/takatakca/pppmtl/actions/runs/40648225513) SUCCESS at source commit `eff248a211680e96b0879e455bdadc219e963202` (Nitro build/TypeScript/lint/tests and PostgreSQL 16 RLS/payment/worker). Additional admin auth guard commits `77555eb`, `8ce7481`, `2ea9781`, `28fbf21` reject malformed/oversized administrator credential payloads, with tests; check latest CI before claiming those commits individually verified.
- **Release decision:** site/UI source can be submitted to the already-authorized Coolify auto-deploy path only after verifying actual production SHA/health and mobile smoke; **paid checkout NO-GO** while in-process orders, unverified DB/merchant credentials and missing TAKATAK tenant scope remain. Read [evening release gate](agent-notes/2026-10-28-release-security-gate.md).
