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
