# PPPMTL — engineering decisions

Updated: 2026-10-15. Supersede only with documented owner approval and clear migration plan.

| Decision | Rationale | Consequence |
|---|---|---|
| Continue the existing `takatakca/pppmtl` source on `main` | Existing React/TanStack product, photos, real Clover catalog and franchise routing must be preserved | No rewrite or force-push |
| One multi-brand codebase | All franchise hosts share menu, cart and backend capabilities | Each host has its own appearance and canonical SEO |
| Clover Hosted Checkout for pickup | Card details never enter PPP application; provider is payment authority | No direct client Clover secret; verified webhook required |
| No acceptance of `?paid=1` as proof | Return URL is untrusted browser input | UI only confirms payment when server sees a verified event |
| Server-revalidated quantities and modifiers | Prevent malformed carts and unauthorized price manipulation | Reject invalid items; never silently round quantities |
| Temporary admin access via signed server-only session | TAKATAK Auth customer/admin backend is not connected | Explicit strong `PPP_ADMIN_* ` secrets; all admin RPCs deny access when absent; replace with TAKATAK roles |
| Signed HttpOnly guest receipt list | Until verified TAKATAK identity exists, caller-supplied phone/customer IDs cannot grant access | Only the checkout browser reads a limited list of its orders; 14-day expiry; secure signature |
| Checkout nonce for browser-specific idempotency | Matching phone/cart data across two guests is not equivalent to same order | Random server-issued browser scope supplements deterministic order key |
| Durable order state required before payment launch | In-memory orders and replay dedup cannot support restarts/multi-worker guarantees | Keep issue #6 open until transactional DB/outbox is integrated |
| Node/Nitro backend, not static copy | Checkout/webhook require confidential server execution | Deploy through verified Coolify/native Node host |
| CI before deployment | Core security and payment code may not go online after failing build/tests | Deploy fallback triggers only on successful main CI; native Coolify triggers require equivalent guard |
| Hochelaga hours unapproved | Owner has not confirmed hours | Keep null and exclude from SEO/structured hours; do not invent values |
| TAKATAK remains identity/data authority | Cross-brand customer resolution and company isolation belong to central TAKATAK services | Do not create a competing PPP master CRM |

See `docs/integrations/clover.md`, `docs/brands.md`, `AGENTS.md`, and `WORKLOG.md`.

## Decisions added 2026-10-15

| Decision | Why | Operational consequence |
|---|---|---|
| Fail closed on live Clover charges while using an in-memory order ring | Process restart or concurrent workers can lose the paid order and deduplication history | Production checkout readiness is false until a durable repository is implemented and verified; sandbox tests permitted with signed webhooks |
| Reject any fractional/non-finite Clover item quantity | Never round customer-supplied amounts into a payment | Exact positive safe integers only, at most 50 units |
| Discard all browser-supplied customer/master identity references on guest checkout | Forged identifiers are not verified TAKATAK sessions | Verified cross-device accounts will require a separate TAKATAK scoped-session integration |
| Do not reuse `TAKATAK_1LV_API_KEY` for PPPMTL | Central TAKATAK Master API currently scopes it to 1LV | Require a distinct audienced PPPMTL assertion/API contract |
| Treat runnerless CI failures as unverified | Runner `0` / missing job steps cannot prove source correctness or failure | Keep deployment gated, track #7, run build/typecheck/lint/tests on a working runner |

## Continuation decisions — 2026-10-15

| Decision | Rationale | Consequence |
|---|---|---|
| Validate webhook merchant identity and `PAYMENT` type after HMAC verification | A validly signed event for another merchant or event kind is not permission to update a PPP order | Reject before payment mutation; preserve processing for genuine events |
| Release transient in-memory delivery claims and return HTTP 503 | A provider REST/title exception must not permanently mark an event as completed | Replay is possible on retry; still replace with durable dedup/outbox before production |
| Disable **every** live Clover checkout until order persistence is durable | `NODE_ENV` can be incorrectly configured on a real server | `CLOVER_ENV=production` with in-memory order store always fails closed |
| Match all outbox/webhook order references to their tenant and force RLS | Prevent cross-tenant effects, including through the table-owner PostgreSQL role | Composite foreign keys, forced RLS and limited-role PostgreSQL CI test |
| Verify Coolify finished status, exact commit and public HTTPS health | A queued deployment response does not prove running revision | CI-gated opt-in workflow polls official API; no verified deployment yet |

## Late-session safety design (2026-10-15)

| Decision | Why | Status |
|---|---|---|
| Explicitly set Clover sandbox mode in mocked checkout tests | Live mode intentionally rejects in-memory orders; tests must never depend on production defaults | Test source committed; full CI still unavailable |
| Reject production payment/quote if live inventory is unavailable | Avoid charging cards from stale site snapshot prices or 86'd items | Source guard committed; live credential verification outstanding |
| Add tenant-local SQL `create_order_once` and `record_verified_clover_payment` | Database constraints must own idempotent order creation and webhook receipt before returning a paid result | SQL migration and tests committed, not deployed; still needs driver and worker |
| Schedule only the title outbox effect initially | Clover order must be titled before print can safely be scheduled | Atomic title queue coded in SQL; worker/print completion not yet implemented |
| Reject public webhook bodies larger than 128 KiB before HMAC | Avoid unbounded memory allocation from unauthenticated requests | Streaming cap and tests committed, server still unverified |

## 2026-10-16 — transaction and migration safeguards

| Decision | Rationale | Consequence |
|---|---|---|
| Reject malformed SQL migration files before PostgreSQL startup | Migration 0002 previously contained a truncated condition and duplicate SQL after COMMIT | Commit `scripts/check-sql-migrations.mjs` and five regression fixtures; still require real PostgreSQL integration tests |
| Always bind tenant scope through parameterized transaction-local `set_config` | Never interpolate user input into `SET LOCAL` and never share tenant state across pooled connections | New injected PostgreSQL adapter uses one `BEGIN` → tenant scope → SQL → COMMIT/ROLLBACK per connection |
| Keep guest checkout separate from unverified master identity claims | Central TAKATAK alone can assert a customer's ID and tenant memberships | Guest persistence rejects claimed `customerId`/`takatakCustomerId` and `isGuest=false`; customer SSO remains #5 |
| Require durable checkout-session linkage before redirect | Signed payment events must be correlated to an actual saved tenant order | Added parameterized provider-session SQL write seam; actual runtime integration and verification remain #6 |

## 2026-10-16 — decisions on idempotency and kitchen tickets

| Decision | Reason | Verified status |
|---|---|---|
| Reject a duplicate order key if the immutable cart/customer/location intent changes | Reusing a receipt for different goods or another tenant location could misroute payment and kitchen work | SQL and regression source pushed; PostgreSQL execution pending |
| Do not acknowledge or print live Clover payment webhooks while order state is in-memory | A signed merchant event alone does not identify a durable PPP checkout after a crash | Production handler now returns HTTP 503 with Retry-After; tests source committed |
| Add expiring fulfillment leases with random fencing tokens | Prevent a delayed or duplicate worker from confirming a task it no longer owns | Migration 0003 + typed adapter source committed, not applied |
| Retry title only after provider-side reconciliation; quarantine uncertain print outcomes | Printer APIs may have physically printed despite transport timeout; automatic retry risks duplicate tickets | SQL worker foundation/SQL probes committed; monitored worker/manual-review UI still missing |

### 2026-10-16 — safe worker execution

| Decision | Reason | Status |
|---|---|---|
| Keep Clover kitchen worker as opt-in trusted server batch until identity/DB provisioning | An unauthenticated timer or endpoint could process other tenants' paid orders | Worker code and mock tests pushed; **no cron/endpoint deployed** |
| Require order/session/payment correlation before provider-side title or print | A valid merchant payment is not proof the session belongs to this PPP checkout | `readPaidOrder` checks tenant-bound persisted paid order, checkout session, outbox payment reference; mock coverage committed |
| Never assume a provider print timeout means no physical ticket | Prevent duplicate kitchen tickets | Worker consults provider printed status, and ambiguity goes to FAILED/manual review; actual provider integration not live-tested |

## 2026-10-28 — owner instructions and multi-agent work

| Decision | Rationale | Effect |
|---|---|---|
| Keep one vertical menu page, but fix sticky category navigation and avoid `scrollIntoView` scrolling the document | Owner reported « Desserts » lag/swipe; fixes in `b927e59f8`, `b88ec0f62`, `747cb837c` | Keep simplified PR #12 grid; verify on real mobile devices and latest deployed SHA |
| Sort **existing** Clover modifier groups by kitchen flow | Owner: base-required product → sauce → vegetables/garnish → drink → trio → combo → extras, when actually present | `a9389f835` and `c88097721`; never edit Clover IDs/min/max/prices or invent options; test real items and provider parity |
| GitHub notes first, Drive second on each agent session | Prevent duplicate/overwriting work when multiple agents commit simultaneously | Claim WORKLOG active at start; append handoff and canonical docs before stopping, mirror substantive decisions under PPP project in Google Drive |
| Preserve approved finished yellow Canva product images | Owner decision logged in #18 | Do not replace with plain raw photo or unapproved AI/Canva variants |
| Treat prepared Clover merchant keys and production activation as distinct | Central Drive journal describes secure credentials but no confirmed deployment of them to Coolify | Never copy secrets to docs; keep real payment blocked until tenant DB + webhook/outbox + end-to-end tests |

## 2026-10-28 — Evidence-based release decision

| Decision | Evidence | Consequence |
|---|---|---|
| Accept current menu/Clover source as **CI validated**, not as live UI validated | GitHub Actions run 40639386985 on `23043b5` passed quality and PostgreSQL jobs; the public site remains unreachable from this agent's verification tool | Verify Coolify running SHA and real mobile Desserts/modal swipes before closing the owner-reported UX bug |
| Use only the narrow one-shot formatter for the reported failures | Formatter 40639106678 succeeded, commit `783fe3e` changed formatting in 9 named files, no force push | Do not keep a broad automated formatter or enable duplicate Coolify Actions deployment |
| Preserve PostgreSQL and Clover live release gates | CI tests in disposable PostgreSQL 16 passed, but real production database and merchant credentials were not examined | Keep production card charges fail-closed until durable runtime, TAKATAK authorization and provider end-to-end tests pass |

## 2026-10-28 — Second-pass menu-to-cart safety decisions

| Decision | Reason | Consequence |
|---|---|---|
| Apply actual Clover modifier min/max rules **before adding to browser cart**, not only on checkout server | Earlier local cart accepted incomplete required options and stale reorders, causing late failures | `canAddCartLine` and server `checkSelections` share constraints; preserve source IDs/prices. Reorders and persisted cart must be revalidated and re-priced. |
| Fail closed on invalid historical cart lines or hostile modifier JSON | Do not invent replacement choice or free extra; server must not throw on a wrong JSON type | Invalid lines are dropped on restore; follow up with UX notice rather than silently losing the line; malformed options rejected before pricing. |
| Preserve immutable React cart state and enforce Clover's 50 unit cap | Mutating `state.cart` can break reactive updates and cart limit mismatch creates checkout errors | Reorders copy array; cart quantity control stops at 50, server continues its own independent gate. |
| Keep item/cart dialogs from causing unwanted mobile background scroll | The owner reported swipe/jump and hidden main item when moving from extras to another product | Lock background overflow when dialog shown, contain sheet scroll, reset next item's scroll to top, maintain Escape and focus restoration; full device/keyboard QA still required. |
| Treat `40644711329` as CI proof only | Source checks passed but no live Coolify revision or real devices were inspected | Payment remains blocked until verified DB, tenant identity, provider/HMAC and operational recovery; see `docs/agent-notes/2026-10-28-cart-reliability-audit.md`. |

### 2026-10-28 — Untrusted browser checkout JSON

| Decision | Rationale | Consequence |
|---|---|---|
| Reject malformed checkout requests **before** guest identity sanitizer or order creation | TypeScript and generic `inputValidator` do not check runtime JSON shape; missing customer/lines could previously raise a 500 | `hasCheckoutPayloadShape` and `validateOrder` reject invalid values/oversized line lists with a safe `menu_changed` error; `placeOrder` validates before sanitizing guest identity; CI [40645275982](https://github.com/takatakca/pppmtl/actions/runs/40645275982) green at `db58af73`. Keep real Clover/DB/identity release gates unchanged. |

## 2026-10-28 — Saved-cart transparency and dialog keyboard containment

| Decision | Reason | Outcome |
|---|---|---|
| Inform guests when restoring old cart alters or removes saved lines | Silently dropping invalid options/products is safe but confusing | Pure `reconcileSavedCart` preserves valid Clover prices/choices, reports removed/updated counts, and client shows dismissible FR/EN/ES notice and Review cart action; no fabricated required choice. |
| Keep focus in a product/cart dialog until dismissed | Tab could escape behind a visually modal panel; changing related products could reset focus outside | Shared hook handles Tab/Shift-Tab, Escape, background scroll and previous-focus restoration on close. Source CI `40646740316` green; real device/screen-reader behavior remains to verify. |
| Do not conflate successful CI with live Coolify deployment or card payments | Source is testable but server secrets and durable order integration are unverified | Payments remain disabled; first verify running Coolify SHA/health and requirements #5/#6/#13 before production launch. |

## 2026-10-28 — New production safety decisions

| Decision | Evidence | Launch consequence |
|---|---|---|
| Reject unavailable/out-of-store products **server-side**, not only in browser UI | `menuRepository.getItems(locationId)` filters such products away, so a map built from it did not carry `false` entries; fixed `buildItems` and added regression tests (`eff248a`, CI `40648225513` success). | No order or checkout session from a sold-out or cross-location line; preserve the authentic item/store mapping and published prices. |
| Reject unsupported Clover DELIVERY before creating an order | Clover Hosted Checkout integration is documented as pickup-only; a prior integration test expected late refusal but now expects safer pre-creation refusal. | Clear error with no erroneous temporary order/guest grant. |
| Reject abnormally long untrusted checkout/admin sign-in fields before data processing | Typed input validators alone do not validate runtime JSON. | Length/shape gates, test coverage, and no new secrets or rate-limit bypass; full tenant-specific auth and trusted edge rate limiting remain open #5. |
| Separate storefront release approval from production card payment approval | Source CI proves Node/PostgreSQL test suite; production durable DB/runtime/Clover keys/worker and exact Coolify running image remain unverified. | **Storefront: pending exact SHA + mobile smoke. Paid Clover checkout: NO-GO** until all #5/#6/#13 prerequisites are demonstrated. |

## 2026-10-28 — Guest order public endpoint boundary

- Reject malformed customer order list/read/cancel runtime inputs before dereferencing fields or calling cancellation. TanStack generic inputValidator type alone is not a runtime parser. Return safe empty/null/not-found results and keep signed HttpOnly guest grant as the only authorization; phone filters are never credentials.
- Reject oversized untrusted signed cookie values before cryptographic verification: order receipt 4096 chars max, admin session 256 chars max; signed fixtures continue to work. Source CI 40740449073 and 40740927778 SUCCESS.
- A green CI and readable /menu page do not prove native Coolify running SHA or safe real payment. Keep production checkout NO-GO until durable orders/TAKATAK tenant/Clover signed webhook/outbox and charge/refund verified.
