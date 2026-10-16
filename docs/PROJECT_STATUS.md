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
