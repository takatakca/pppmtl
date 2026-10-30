# PPP Pizzeria → TAKATAK Food Hub (first-party ownership)

**Owner directive (2026-10-28): UrbanPiper is cancelled and must not accept, send or synchronize any PPP data.** Food Hub is our already-existing first-party application in [takatakca/foodhubca](https://github.com/takatakca/foodhubca), not a new purchased aggregator. No third-party code or protected materials were copied.

## Current safe state of this change (PPP draft PR #23)

- All non-Clover locations are tagged `foodhub` as their _intended future_ engine, with **no fake store code, merchant, key, tenant or live connection**.
- PPP's old `POST /api/public/webhooks/provider?provider=urbanpiper` now returns HTTP **410 Gone before reading the body**, whether or not old secrets remain in Coolify.
- UrbanPiper's eleven adapter/source modules, integration registry entry, outbound order adapter, admin test/sync/test-order buttons, API onboarding instructions and active credential keys are removed.
- Independent PPP menu validation, image allow-list and stable internal item mappings remain under `src/lib/integration/core/`. The PPP official yellow Canva art rule remains unchanged.
- Clover menu, real prices, modifier mapping, signed webhook, KDS and Hosted Checkout **code** remain in place, **but real checkout is still blocked** (`ordersPersistAcrossRestarts=false`).

## Existing Food Hub work to REUSE (not rewrite)

Food Hub already has direct Uber Eats, DoorDash, Skip/JET, Clover, kitchen, store/menu and alert components. Review its [README](https://github.com/takatakca/foodhubca/blob/main/README.md), [Food Hub guide](https://github.com/takatakca/foodhubca/blob/main/docs/FOODHUB.md), [Clover website menu](https://github.com/takatakca/foodhubca/blob/main/docs/CLOVER_WEBSITE_MENU.md), and [Clover website orders](https://github.com/takatakca/foodhubca/blob/main/docs/CLOVER_WEBSITE_ORDERS.md) before building anything.

**Preferred existing architecture for the NDG Clover kitchen (subject to deployment proof):**

`PPP Pizzeria site → server-priced Clover Hosted Checkout → signed, merchant-matched Clover events → Clover cashier/printer/KDS → Food Hub Clover order mirror → Food Hub kitchen`.

Food Hub code already recognizes PPP website-titled Clover orders from webhook or polling, and intends **not to reprint** these orders. Neither this repo review nor green CI proves that both applications are correctly configured or running this flow in production. Preserve one source of payment authority and one print path.

Food Hub also has `POST /api/foodhub/webhooks/website-order` as an optional **future** first-party ingress (files `app/api/foodhub/webhooks/website-order/route.ts` and `lib/foodhub/delivery/website.ts`). It presently trusts body fields such as `paid`, line `price`, `location` and `brand` from an authenticated bearer request. **Do not post real PPP orders there yet.** A shared token alone is insufficient evidence of verified merchant payment, server-side catalog pricing, identity and transactional durability. PR #23 included no outbound Food Hub HTTP client; the 2026-10-30 branch adds one, fail-closed (see the section below).

## 2026-10-30 — what is wired now (branch feature/phone-verify-accounts)

- **Customer identity** comes from Food Hub (contract § A, merged on foodhubca main, PR #123): phone verification = sign-in = account; the site keeps the Food Hub token in an HttpOnly cookie and no customer table. Loyalty / gift cards show Food Hub's truthful `connected:false` state.
- **Interac e-Transfer website orders** (contract § B) are POSTed to `/api/foodhub/webhooks/website-order` with `payment:"interac"`, the fee line and the displayed all-inclusive total — only when the owner sets `FOODHUB_INTERAC_ENABLED=true` after Food Hub's Interac branch is deployed. Food Hub re-prices and holds the order until the restaurant confirms the transfer. A 200 without Interac instructions is treated as a failure.
- Card payment is unchanged (Clover Hosted Checkout, pickup). Guide: `foodhub-customers-and-interac.md`.

## Mandatory server and contract gates before enabling any PPP → Food Hub direct order

1. Verify exact TAKATAK tenant and PPP brand/store ids against the existing Food Hub catalog in the authorized administrator console; never guess a location code from PPP slug. Use server-derived claims, least privilege and a dedicated key with rotation (or scoped request signatures and replay windows).
2. Derive prices, modifiers, tax, fulfillment, paid state and merchant in trusted servers from verified Clover/Food Hub data. Never allow browser JSON to declare `paid: true`, money or recipient store. For Clover Hosted Checkout use an actual signed merchant-matched payment event.
3. Use database transactions with unique site order ids, durable event inbox, idempotent outbox/worker, bounded retries/dead letters, replay tests, restart/failure injection, backup and restore. Preserve Food Hub tenant boundaries.
4. Ensure **single printing**: if Clover already printed, Food Hub mirrors only; no second Clover injection or ticket, and no duplicate marketplace order.
5. Prove deployment and rollback **in native Coolify** for both PPP and Food Hub, including a staging run with no live money, SHA of serving container, status/health endpoints and observable kitchen acknowledgement. Keep the GitHub Actions alternative deploy disabled.
6. Only with owner approval of a controlled real payment/refund test, the operational merchant's authority and final reconciliation may live payments be considered. Until then #5/#6/#13 in PPP and Food Hub go-live controls remain **NO-GO**.

## Operator action required outside source code

After PR review/approved deployment, Tak Tak must remove obsolete `URBANPIPER_*` values from **the relevant runtime secrets console** without exposing them in logs; disable/revoke any retired vendor API keys and old partner webhook registrations; ensure external delivery platforms are correctly routed to their own tablets/Clover/direct Food Hub integrations **before** switching off active third-party routes. Do not disable any currently serving orders without a cutover and rollback checklist. Nothing in this PR alters live vendor portal, DNS, Coolify secrets, payments or external marketplaces.

### Related work

- [PPP owner release gate](../agent-notes/2026-10-28-release-security-gate.md) and issues [#5](https://github.com/takatakca/pppmtl/issues/5), [#6](https://github.com/takatakca/pppmtl/issues/6), [#13](https://github.com/takatakca/pppmtl/issues/13).
- [PPP security PR #22](https://github.com/takatakca/pppmtl/pull/22) touches the **same legacy provider webhook and order-service code** and must be reconciled with this retirement PR #23 before merge; keep its Clover provider-ID isolation and merchant-signing fixes.
- [Tak Tak handoff issue #20](https://github.com/takatakca/pppmtl/issues/20) and the existing PPP/TAKATAK Google Docs. Document exact SHA/CI for the final release, not merely the source branch.

**Status:** Source-only retirement; draft PR, no merge/deploy, no confirmed live Food Hub linkage.
