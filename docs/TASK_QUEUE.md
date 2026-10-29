# PPPMTL — prioritized task queue

Updated: 2026-10-15 · GitHub is the source of truth.

## P0 — mandatory before enabling production payments

**Owner migration directive, 2026-10-28:** Replace UrbanPiper with own TAKATAK Food Hub; track PPP draft PR #23 and `docs/integrations/foodhub.md`. Before any production switch, compare with security PR #22 (legacy webhook overlap), merge/retest on the final SHA, validate Clover→Food Hub order mirror and a reversible external marketplace routing plan. No automatic Food Hub transmission, payments, or vendor cancellation actions from this source change.


1. **#6 Durable order store:** choose a production PostgreSQL service or TAKATAK tenant-scoped order API; implement schema/migrations, atomic order/payment transactions, unique provider checkout+payment ids, outbox for Clover title/print retries, durable webhook delivery claims, backup/restore; no duplicate charges or tickets. Tests must exercise parallel workers, restarts, duplicate callbacks, declined payments and refunds. Status: open, not implemented.
2. **#5 Verified identity and permissions:** replace temporary PPP admin credential with authenticated TAKATAK roles, tenant scope and entitlements; authorize customer order access with verified TAKATAK identity and/or signed guest grants. Status: *temporary server gate and cookie grants committed*, permanent integration open.
3. **Clover live credential onboarding:** configure merchant ID, Hosted Checkout private key, webhook signing secret, REST token, taxes and webhook URL on verified backend host. Confirm production merchant and HTTPS before payment test. Status: external access required.
4. **Server and CI validation:** successful typecheck, lint, tests, Node/Nitro build and a controlled real payment/refund test before launch. Status: CI added; outcome to read from GitHub Actions.

## P1 — operations and usability

5. Verify actual target hosting: do not assume old MochaHost or Coolify is active. Attach pppmtl.com domains and HTTPS, preserve email DNS, configure health check, back-ups and deployment rollback.
6. Admin workflow: improve sign-in UX, rate-limit attempts at trusted edge, add logout and operator auditing. Temporary admin cookie is 8 hours and HttpOnly; no privileged action is allowed without it. Do not publicly expose any admin data.
7. Connect TAKATAK customer profiles/rewards/favourites/addresses and real order history without creating a competing master customer database.
8. Update the `/track` and support flows to identify signed-browser receipts as such rather than promising lookup by phone alone. Use verified identities for cross-device support.
9. Verify external delivery menus/links and operating hours with owner-approved facts; Hochelaga hours remain unpublished pending approval.

## P2 — refinements

10. Full mobile visual QA of customizer, cart, checkout, brand domains and accessibility.
11. Verify webhook failure monitoring, metrics, alerts, analytics, uptime and incident-response procedure.
12. Remove stale Lovable placeholder references only after migrations/hosting are verified; preserve Git history and existing design.

## Work protocol

- Read `AGENTS.md`, `WORKLOG.md`, this queue and `AGENT_HANDOFF.md` before changing code.
- Claim a single task in `WORKLOG.md`; do not redo open agent work; make narrow commits to `main` only when permitted.
- Never mark an integration as live because a file or secret *name* exists. Obtain API/response evidence.
- Keep `AGENT_HANDOFF.md` and this queue aligned after every complete development session.

## Update 2026-10-15

- **Safety applied:** source now fails closed on real Clover production checkout until the order repository becomes durable (not just a configuration flag), and refuses malformed Clover quantities.
- **Identity boundary applied:** guest checkouts ignore caller-supplied TAKATAK/customer IDs; a dedicated TAKATAK-scoped auth assertion/service is still needed. Review [IDENTITY_INTEGRATION.md](IDENTITY_INTEGRATION.md) and do not borrow 1LV credentials.
- **#7 CI infrastructure blocker:** recent Actions runs have `runner_id=0`, no job steps, logs returning 404 BlobNotFound. Inspect repo/org Actions billing, quotas, disabled runners and policies; restore an actual runner, then run the full CI suite. GitHub's public service-status page cannot verify this account's runner availability.
- **Migration remains unapplied:** `db/migrations/0001_ppp_orders.sql` defines tenant-scoped order, webhook and outbox tables. It is not a working database or replacement for #6 without a verified PostgreSQL instance, application driver, transaction logic, backups and restart/replay tests.

## Current next actions (continuation 2026-10-15)

1. **#7:** restore GitHub-hosted runner provisioning; run `PPPMTL CI` and fix real diagnostics (Nitro build, TypeScript, lint, Vitest **and** PostgreSQL RLS smoke job). Latest observed run `38792224759` had two failed unstarted jobs with `runner_id=0` and no steps; job logs are not evidence of an executed test.
2. **#6:** implement `db/migrations/0001_ppp_orders.sql` against an approved database, wire the actual driver/transactions/outbox and verify restart, concurrent, signed webhook replay and print-once behavior. Schema and `db/tests/tenant-isolation.sql` are committed but not run; see `docs/DB_ROLLOUT.md`.
3. **#5:** integrate central TAKATAK verified identity and restaurant-scoped entitlements; temporary signed admin cookie and browser guest receipt do not replace SSO.
4. Confirm the real Coolify PPPMTL resource, API access, domain routing and secrets. Optional post-CI pipeline now verifies completion/status/SHA/HTTPS health but is **disabled** until its authorized trigger and credentials are configured. Do not switch on paid Clover until #5/#6 are actually verified.

## Late-session additions (2026-10-15)

- The atomic PostgreSQL operations migration and corresponding rollback-only tests were committed; CI is configured to execute both SQL migrations and tenant/isolation/atomic tests once GitHub runners are available. **Implement the TypeScript/PostgreSQL transactional connection, outbox worker, lease/retry and verified tenant integration next.** See `docs/DB_ROLLOUT.md`.
- Clover production pricing cannot fall back to the committed snapshot if the live REST inventory is unavailable. Real payment readiness requires a REST token and a durable order repository.
- Webhook HTTP request bodies now have a verified-on-stream 128 KiB upper bound with regression coverage. Tests have not run on a real GitHub-hosted runner.
- GitHub issue #7 remains first infrastructure blocker. Preserve the release gate until a full green quality and PostgreSQL CI run exists for the actual main SHA.

## 2026-10-16 continuation — concrete remaining tasks

- **Integrity repaired:** fixed broken `0002_ppp_atomic_payments.sql` from the previous session; an automated Node preflight now refuses an unbalanced/truncated/duplicated migration. The preflight is structural only; PostgreSQL must still parse and execute 0001+0002.
- **Durable adapter started:** `src/lib/orders/postgres-transactions.server.ts` encapsulates `BEGIN`, parameter-bound `set_config('ppp.tenant_id', ..., true)`, COMMIT/ROLLBACK/release, SQL-order idempotency, Clover checkout-session binding and verified-payment persistence. Its unit tests are committed, not run via Vitest. It is not a live storage replacement.
- **Next executable #6:** provision an *approved* database and application role, run both migrations/probes in staging, wire the verified-tenant PostgreSQL pool into all order APIs without a second identity authority, implement lease/retry and operator-safe title/print outbox, and prove restart/concurrency behavior.
- **Next external #7:** inspect GitHub Actions billing, settings and runner registration; newest Actions jobs have continued to fail with no assigned runner/steps. Then rerun full CI and fix genuine diagnostics.
- **#5:** connect PPP-scoped TAKATAK assertions/entitlements before granting cross-device order retrieval or persistent authenticated customer IDs. Guest-only storage must reject browser-claimed master identities.

## 2026-10-16 — title/print worker increment

- Done in source: mismatched-cart idempotency-key reuse is rejected; signed live Clover webhooks refuse payment or print side effects without a durable order ledger.
- Added unapplied `db/migrations/0003_ppp_fulfillment_leases.sql`, regression `db/tests/fulfillment-leases.sql` and the CI SQL step. Leases use UUID fencing tokens; title calls may be retried after a provider read, while an uncertain printed ticket must enter FAILED/manual review, never automatic reprint.
- Added `claimFulfillmentWork`, `finishFulfillmentWork`, `quarantineExpiredPrintWork` PostgreSQL adapter methods and mocked tests. They require a verified TAKATAK tenant and do not start a worker.
- **Next #6:** identify/authorize actual PostgreSQL service; run 0001/0002/0003 as the limited app role; implement the runtime Postgres pool, durable order transitions, verified webhook inbox, real outbound Clover title/print worker, outage alerting, manual-review queue and concurrent restart tests. Never enable live checkout based only on source migrations.
- **Next #7:** restore GitHub Actions runner allocation (no runner steps reported), then run full Bun/Nitro/typecheck/ESLint/Vitest/PostgreSQL CI and repair actual diagnostics.
- **Next #5:** integrate scoped TAKATAK identity and product/tenant verification for all guest, operator and customer permissions.

### 2026-10-16 — next integration after worker source

The opt-in `processPppCloverFulfillmentBatch` worker and mocked tests have been committed. Migration 0003 excludes unrelated CUSTOMER_NOTIFICATION tasks from Clover claims. Next: wire a real PostgreSQL pool and trusted TAKATAK-verified tenant mapping; schedule bounded worker runs with alerts and operator reconciliation UI; resolve crash/retry tests under real PostgreSQL; validate that the signed webhook always persists the session/payment event before worker processing; verify merchant print behavior. Keep the server gate shut before these checks.

## 2026-10-28 — Owner-reported UX bug and verified next actions

1. **Menu lag / Desserts category:** commits `b927e59f8`, `b88ec0f62` and `747cb837c` changed scroll/sticky/animations; perform real mobile/desktop and keyboard test on deployed exact SHA, not just source review. Preserve PR #12 simplified layout.
2. **Required Clover modifier sequencing:** `a9389f835` sorts base / sauce / garnish / beverage / trio / combo / extras while keeping Clover min/max/ids/prices; `c88097721` adds tests. Check representative burger, pita, pizza, chicken, desserts/trio/combos and group membership. No fake group on unrelated items.
3. **CI repair:** runner now provisioned (supersedes earlier issue #7 status). Run 40364935041 had real execution: build/typecheck pass, lint 25 Prettier errors, SQL Node fixture 4/5. GPT-6 changed test to `scripts/sql-migration-check.cases.mjs` and fixed `$$` fixture; await newest build/lint/Vitest/SQL success, repair other formatting failures without bypassing tests.
4. **Real Clover and #5/#6:** project Drive journal reports merchant ecomm/webhook/REST credentials prepared externally, but **not installed in Coolify**. Do not enable card charges before verified PostgreSQL, webhook/outbox, tenant identity and signed end-to-end reconciliation. Keep the source-only distinction.
5. **Handoff:** [GitHub 2026-10-28 notes](agent-notes/2026-10-28-menu-clover-audit.md) and [Drive PPP project notes](https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit). Update both after further changes.

## 2026-10-28 — Post-CI priorities (green code SHA `23043b5`)

- **Completed verification:** CI run 40639386985 succeeded both quality and PostgreSQL jobs (Nitro build/TypeScript/lint/Vitest + PostgreSQL migrations 0001–0003 and transaction/RLS/worker probes). Runner provisioning issue #7 no longer prevents CI; assess issue closure separately with repository owner.
- **Next P0 visual check:** connect to authorized Coolify deployment for `pppmtl.com`, prove actual running SHA and HTTPS `/healthz`; reproduce and verify a **real mobile** Desserts/category tap, horizontal swipe, sticky navigation, product sheet required-group scrolling and rapid category switching. This was not physically browser-tested from the current environment.
- **Next P0 Clover verification:** on each representative real item (burger/pita/pizza/chicken/trio/combo/dessert), inspect actual linked modifier group order, required min/max, price and identity. Tokens prepared in merchant dashboard are **not** proof of production configuration or real payments; maintain fail-closed payment until durable DB, tenant assertions and webhook/outbox end-to-end release gates succeed (#5/#6/#13).
- **Agent rule:** start GitHub WORKLOG claim before coding; preserve concurrent changes; close/update handoff at end; mirror same verified results into the existing PPP Google Drive handoff document, not a duplicate file.

## 2026-10-28 — Next actionable tasks after cart safety fixes

1. **Source task complete:** `3a584d6` (CI `40644711329` SUCCESS) validates cart lines against actual product min/max, availability, location, quantity 1–50, and safely rejects malformed selections before reaching checkout; stale old cart/reorders are filtered and re-priced. Mobile modal background scroll, Escape handling and product-swap scroll reset were addressed in source.
2. **Highest priority live QA:** confirm actual Coolify app deployed SHA and `/healthz` for this code; real Android/iOS/desktop browser test of category Desserts, horizontal nav, item customization and old-cart behavior. GitHub Actions Coolify fallback is intentionally skipped; native Coolify auto-deploy is separate.
3. **P1 UX follow-up:** notify customers when outdated saved selections/lines are dropped from localStorage on restore; safety is now fail-closed, but silently losing a previously selected item is confusing. Verify focus trapping/scroll behavior on iOS.
4. **Keep payment release gates #5/#6/#13:** confirm actual production role-scoped DB, signed Clover callbacks and durable order/outbox, merchant keys configured in protected environment, TAKATAK identity and controlled refund/reconciliation. Do not activate live checkout based solely on green CI.
5. **Full technical evidence:** [2026-10-28 cart reliability audit](agent-notes/2026-10-28-cart-reliability-audit.md); append updates to the *existing* PPP Pizzeria Drive project handoff and global summary, not duplicate folders.

### 2026-10-28 — Checked off additional server input-safety task

- **Completed in source:** `db58af73` validates untrusted checkout JSON at runtime before creating orders or sanitizing guest identity. New malformed-body tests passed in **CI 40645275982 (success)** together with build, lint and PostgreSQL tenant/atomic-payment probes. It supplements the browser cart guards; do not redo it.
- **Still blocking release:** current Coolify container SHA/health not verified here, no real Android/iOS modal/cart QA or live Clover inventory assertion, production tenant/DB/merchant/outbox gates #5/#6/#13 unresolved. Do not activate payments.

## 2026-10-28 — UX/QA progress after saved-cart and modal repairs

- **Source complete (CI GREEN 40646740316 at `297c0f9`):** customer notice for restored cart removals/updated items, safe cart reconciliation/pricing tests, and keyboard focus trap for cart/customizer with Escape and focus restoration. Read [dated technical audit](agent-notes/2026-10-28-cart-reliability-audit.md).
- **P1 remain:** verify mobile/desktop keyboard, screen reader, swipe/scroll and recovery-notice behavior on actual public build; inspect native Coolify running SHA + `/healthz` instead of assuming CI is a deployment; confirm live Clover inventory choices and prices.
- **P0 remains #5/#6/#13:** durable production DB, scoped TAKATAK authorization, signed Clover webhook and outbox/print/replay safety, controlled real payment/refund. Leave checkout fail-closed pending actual integration evidence.

## 2026-10-28 — Evening go/no-go order

1. **Done in source, tested:** sold-out and cross-restaurant products can no longer escape validation because of an already-filtered menu map; Clover DELIVERY is refused before order creation. Input length guards and regression tests passed full CI `40648225513` at `eff248a211`. Admin malformed-login guard added afterward; verify current full CI.
2. **First external check required now:** inspect authorized native Coolify application `r13hz1mmbi4eeoc6ssxbvxnv` running SHA/container deployment log and `https://pppmtl.com/healthz`. GitHub Actions deployment fallback is intentionally skipped; do not turn it on beside native Coolify. A cached home page does not confirm the running commit.
3. **Then:** real Android/iOS and desktop smoke (Desserts swipe, required Clover options, cross-sell, cart saved-state warning, keyboard focus trap, no asset 404, checkout fail-closed).
4. **Payment release NO-GO until #5/#6/#13:** actual tenant-authorized PostgreSQL, applied migrations and backup/restore, order persistence before redirect, signed merchant-verified webhooks, durable inbox/outbox/worker, printer reconciliation and controlled refund test. No replacement of `ordersPersistAcrossRestarts=false` without wiring and proving all of these.
5. [Detailed source and production checklist](agent-notes/2026-10-28-release-security-gate.md).

## 2026-10-28 — Guest order input boundary (source completed)

DONE: validate guest order read/history/cancel runtime JSON, limit malformed receipt/admin cookies before signature verification and test the safe behavior. CI 40740927778 SUCCESS at 762972778 (both jobs). NEXT: verify native Coolify running SHA, anonymous /dev/menu-audit=401, /healthz=200, webhook GET=405, real mobile menu/cart, approved Canva imagery and rollback. NO-GO real Clover payments until authorized production PostgreSQL, tenant-scoped auth, signed webhook/outbox/worker and controlled charge/refund #5/#6/#13.
