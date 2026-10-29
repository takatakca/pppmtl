# PPPMTL PostgreSQL migration and tenant-isolation proof

**Status: NOT APPLIED to a live instance.** This runbook is for a provisioned PostgreSQL service or authorized tenant-scoped TAKATAK data service only. It does not create or bill for a Supabase project.

## Separation of responsibilities

- TAKATAK is the canonical authority for verified people and memberships. `ppp.orders.customer_ref` may store a verified reference after TAKATAK Auth is integrated; never create a second master customer table.
- PPPMTL stores its own restaurant-tenant order fulfilment, Clover provider IDs, deduplicated inbound events and outbox work.
- `tenant_id` must be derived **server-side** from a verified TAKATAK entitlement. Never allow it to come from cart JSON or a client-provided cookie.
- Use a dedicated, least-privilege PostgreSQL application role with neither `SUPERUSER` nor `BYPASSRLS`. All three PPP tables force row-level security even for table owners, but PostgreSQL superusers/BYPASSRLS roles can bypass it.

## Prerequisites

1. Confirm a supported PostgreSQL 15+ target, DNS, SSL/TLS validation, backup retention, network ACLs and non-billable/approved resource ownership.
2. Apply `db/migrations/0001_ppp_orders.sql` once on a reviewed staging database, through an approved migration role. This file has **not** been executed by this agent.
3. Grant the runtime role only the needed schema/table/sequence privileges. Never use migration credentials at runtime.
4. Before each tenant-scoped query, open a database transaction, establish `SET LOCAL ppp.tenant_id = '<server-verified-id>'`, execute statements in the *same transaction and connection*, then commit/rollback. Missing tenant context must yield zero rows/refused writes. Use parameterized queries throughout.
5. Add durable adapter code for atomic order creation and payment status, checkout ID uniqueness, immutable signed webhook claims, worker locks (`FOR UPDATE SKIP LOCKED`), expiry/retries and an idempotent Clover print outbox. The schema alone is **not** this implementation.
6. Verify successful backup/restore, parallel requests, process restarts, duplicate/out-of-order webhooks, cancellations/refunds and tenant boundaries before any live payment switch.

## Automated staging probe

The repository contains `db/tests/tenant-isolation.sql`. The CI `database-isolation` job creates an ephemeral `postgres:16` instance, applies the migration, grants a distinct non-superuser application role and runs that test as the limited role.

The test checks:
- Tenant B cannot SELECT tenant A's order.
- Tenant B cannot create an outbox effect referencing tenant A's order via a forged `order_id`.
- Tenant B cannot INSERT tenant A's row.
- All fixture writes are rolled back.

**CI currently blocked by GitHub-hosted runner provisioning issue #7; the automated probe is committed but its success is not yet verified.** To run manually, use `psql -v ON_ERROR_STOP=1 -f db/migrations/0001_ppp_orders.sql` on a disposable DB, set up equivalent limited privileges, then `psql -v ON_ERROR_STOP=1 -f db/tests/tenant-isolation.sql` under the runtime role.

## Rollout gate

Do not change `ordersPersistAcrossRestarts = false` in `src/lib/orders/order-store.server.ts` simply to enable checkout. Replace the in-memory adapter first, and prove storage/webhook/outbox durability on a real database. The `cloverCheckoutConfigured` function blocks real Clover charges even if `NODE_ENV` is set incorrectly, until actual durability exists.

## Atomic checkout and webhook SQL foundation — 2026-10-15 late session

A second migration is committed at `db/migrations/0002_ppp_atomic_payments.sql`, with rollback-only fixture checks in `db/tests/atomic-payments.sql`. **Neither migration has been executed against a real database by this agent.**

- `ppp.create_order_once(...)` inserts or reads an existing order under the verified transaction-local `ppp.tenant_id`, constrained by `(tenant_id,idempotency_key)`.
- `ppp.record_verified_clover_payment(...)` is **only for events already verified by a trusted server** (Clover HMAC, merchant, payment type, session correlation); it atomically deduplicates delivery keys, rejects mismatched payload hashes and conflicting payment IDs, marks the existing Clover order paid, and schedules a unique `CLOVER_TITLE` outbox record. **It does not verify the signature inside PostgreSQL or print a ticket.**
- No `CLOVER_PRINT` effect is queued before Clover confirms the title. Build the outbox worker, delivery claim/lease, title completion, print after title, retries, terminal manual review and audit before enabling real payments.
- Both routines execute as `SECURITY INVOKER`, require tenant context and revoke PUBLIC EXECUTE. Grant EXECUTE to a dedicated approved least-privilege application role only.
- The CI PostgreSQL 16 job now applies **0001 then 0002**, explicitly grants functions to its disposable runtime role, runs both isolation and atomic-payment probes, and rolls back test fixtures.

Migration order when an authorized DB exists:
```sh
psql -v ON_ERROR_STOP=1 -f db/migrations/0001_ppp_orders.sql
psql -v ON_ERROR_STOP=1 -f db/migrations/0002_ppp_atomic_payments.sql
```
Do not re-run `0001` blindly on a database with an existing schema: use the approved migration history and staging rehearsal. The SQL routines are not wired to the TypeScript in-memory store; issue #6 stays open.

## 2026-10-16 correction: migration 0002 and runtime adapter

A review of GitHub source found `0002_ppp_atomic_payments.sql` was invalid: its HMAC payload digest validator was truncated and a second tail of the function appeared **after COMMIT**. This was repaired on `main` (commit `3eba0bbb1`). Never use the earlier malformed blob.

`scripts/check-sql-migrations.mjs` now performs a dependency-free, structural check of each numbered migration (exactly one top-level BEGIN/COMMIT, terminal COMMIT, balanced function dollar delimiters, complete 0002 input constraints). `scripts/__tests__/check-sql-migrations.test.mjs` tests corrupt fixtures. The GitHub Actions PostgreSQL job runs both checks before applying SQL. A reproduced local Node test set passed 5/5, and the current SQL files were checked directly via GitHub for those same structural invariants; **SQL execution remains unverified** due to GitHub-hosted runner issues.

An injected storage seam is now in `src/lib/orders/postgres-transactions.server.ts` with mock tests in `src/lib/orders/__tests__/postgres-transactions.test.ts`. Its `withPppTenantTransaction` uses a fresh pool client and:
1. `BEGIN`;
2. parameter-bound `SELECT set_config('ppp.tenant_id',$1,true)`;
3. a tenant-scoped application operation;
4. `COMMIT` or `ROLLBACK`, then `release`.

`persistGuestOrderOnce` refuses unverified customer identities; `attachCloverCheckoutSession` requires an HTTPS Clover destination and an associated unpaid order; `persistVerifiedCloverPayment` delegates to the 0002 SQL procedure **only after verification at the server**. The code intentionally does not provision credentials, a database, TAKATAK assertions or outbox workers. Do **not** set `ordersPersistAcrossRestarts=true` or enable Clover production because this file exists. Complete the SQL driver/pool wiring, signed-event validation, worker leases/retry policy and restart tests before the next release.

## Migration 0003 — tenant-scoped fulfillment leases (2026-10-16)

**Not applied in production or staging.** Apply in order `0001`, `0002`, `0003` to an authorized PostgreSQL 16 database after backup and review. 0002 now refuses a reused idempotency key that specifies a different immutable cart/customer/location intent. The rollback-only test `db/tests/atomic-payments.sql` checks this condition.

`db/migrations/0003_ppp_fulfillment_leases.sql` adds an UUID `lease_token` and three SECURITY INVOKER SQL functions: `ppp.claim_due_fulfillment(integer,integer)`, `ppp.finish_fulfillment(bigint,uuid,boolean,boolean,text,boolean)`, and `ppp.quarantine_expired_prints()`. Claims require a transaction-local verified tenant, use `FOR UPDATE SKIP LOCKED`, enforce 30–600 second leases, and fence each claim. Only a confirmed title may create the unique print effect. A failed print, even after a retryable transport error, is marked FAILED; an expired RUNNING print is quarantined for operator review. Stale worker tokens cannot acknowledge an expired/reclaimed task. Public EXECUTE is revoked, and the CI disposable least-privilege role is explicitly granted access.

The `src/lib/orders/postgres-transactions.server.ts` adapter now exposes injected-pool `claimFulfillmentWork`, `finishFulfillmentWork`, and `quarantineExpiredPrintWork` with mocked tests. **No provider-side reconciler or actual worker has been built or started**, and the storage flag stays `false`. Outbox exactly-once *intent* does not guarantee physical printer exactly-once execution; ambiguous outcomes require manual resolution. Review `db/tests/fulfillment-leases.sql` and require real PostgreSQL CI plus restart/failure-injection testing before live payment activation.

### 2026-10-16 — opt-in reconciler source

`src/lib/orders/clover-fulfillment-worker.server.ts` now contains `processPppCloverFulfillmentBatch`. It queries the tenant-specific paid order, verifies `providerOrderId` against the outbox dedup/session key and `providerPaymentId` against signed-event outbox payload before calling Clover. An existing website title is never blindly retitled, a previously printed order is not printed twice, and any unknown print result becomes a manual-review failure through 0003. Its new mocked Vitest suite covers these decisions.

**Not running in production.** The code does not supply a PostgreSQL driver, a trusted tenant assertion, an actual scheduler, provider credentials, merchant-authorized cancellation/refund or an operator manual-review interface. Do not conflate a committed worker module with an active, resilient ticket-printing service. Only a real PostgreSQL and Clover sandbox deployment with chaos/retry verification can remove #6.

## 2026-10-28 — Current PostgreSQL CI versus real deploy (supersedes 15/16 Oct runnerless status)

GitHub Actions runner provisioning now works. **CI `40648225513` completed SUCCESS** on `eff248a211680e96b0879e455bdadc219e963202`, including ephemeral PostgreSQL 16 application/migrations 0001/0002/0003, tenant RLS, atomic verified payment and worker lease/print safety probes. This is an executed test database with limited role, not a production/staging PostgreSQL service or an applied production migration. All earlier notes about runnerless SQL testing are historical.

The runtime still imports `src/lib/orders/order-store.server.ts` with `ordersPersistAcrossRestarts=false`. Do not flip that flag, store DB credentials in GitHub, or enable production Clover charges. An authorized real DB connection/pool, per-request verified TAKATAK tenant, migration history, backups, signed webhook inbox and monitored fulfillment workers require an actual approved deployment and failure/restart testing (#5/#6/#13). Source-level pre-launch improvement additionally rejects unavailable/cross-restaurant catalog items and unsupported Clover DELIVERY before an order is created. See [28 Oct release gate](agent-notes/2026-10-28-release-security-gate.md).

## 2026-10-29 — Runtime wiring and the production role

The runtime now uses PostgreSQL whenever `DATABASE_URL` is set (`src/lib/orders/database.server.ts`). Apply 0001 → 0003 as the admin user, then connect the site as a separate login role with exactly these grants (the same as CI's `ppp_ci_role`):

```sql
CREATE ROLE ppp_app LOGIN PASSWORD '<random>' NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA ppp TO ppp_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ppp TO ppp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ppp TO ppp_app;
GRANT EXECUTE ON FUNCTION ppp.create_order_once(text,text,text,text,jsonb,text) TO ppp_app;
GRANT EXECUTE ON FUNCTION ppp.record_verified_clover_payment(text,text,text,text,text) TO ppp_app;
GRANT EXECUTE ON FUNCTION ppp.claim_due_fulfillment(integer,integer) TO ppp_app;
GRANT EXECUTE ON FUNCTION ppp.finish_fulfillment(bigint,uuid,boolean,boolean,text,boolean) TO ppp_app;
GRANT EXECUTE ON FUNCTION ppp.quarantine_expired_prints() TO ppp_app;
```

A future migration that adds tables or functions must re-run the matching grants. Every query runs in `withPppTenantTransaction` with the tenant from `PPP_TENANT_ID` (default `pppmtl`). `src/lib/orders/__tests__/durable-orders.pg.test.ts` exercises the whole path as this role when `PPP_TEST_DATABASE_URL` is set.

Manual review: `SELECT order_id, effect, state, attempts, last_error FROM ppp.fulfillment_outbox WHERE state = 'FAILED';` (run with `SELECT set_config('ppp.tenant_id','pppmtl',false);` first as `ppp_app`). A FAILED print means the ticket may or may not have printed: check the Clover order before reprinting by hand.
