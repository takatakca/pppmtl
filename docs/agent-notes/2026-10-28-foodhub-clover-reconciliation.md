# PPP / Food Hub — reconcile Clover webhook safety (2026-10-28)

**Branch:** `refactor/ppp-retire-urbanpiper-foodhub-20261028` • [draft PR #23](https://github.com/takatakca/pppmtl/pull/23).
**Verified base when work started:** `main` `c6aacee9f180c1bc0849cf86b3e708c8f4ed2057`. **Code and tests at** `9173cbabbd74218346a7146d2f0ee8dfaf21f4ce`; re-check final PR SHA and CI after documentation commits.

## Completed in this branch
- Preserved the owner-approved removal of the vendor runtime and 410 legacy webhook; Food Hub transport remains deliberately unavailable. No checkout, store map, secret or production changes.
- Ported security PR #22 Clover safeguards into this vendor-free branch, without bringing its vendor code back:
  - Store lookup requires provider namespace, preventing collisions between identical Clover and Food Hub external IDs.
  - Clover cannot mark a cancelled/failed order paid, accept an empty approved payment id, or replace a linked payment id.
  - Valid signed Clover merchant events with no matching PPP checkout return retryable 503 **before** any Clover REST title/print. The in-process replay claim is released for retry.
- Regression tests: `src/lib/orders/__tests__/webhook-provider-isolation.test.ts` uses Food Hub as the collision provider; `src/lib/integration/__tests__/clover.test.ts` checks unmatched signed session causes no REST/print.

## Verification and next work
1. Check **full CI on the exact final HEAD** of PR #23 (Nitro, TS, ESLint/Prettier, Vitest, PostgreSQL). Code was pushed but exact-head CI not yet proven during authoring.
2. Review overlap with PR #22 (Clover guards now ported), PR #21 (HTTP headers) and PR #19 (brand/UX). Resolve conflicts with the owner, do **not** silently merge draft PRs. Tests from #22 involving the removed vendor are intentionally not restored.
3. Confirm branch does not reference retired provider in executable registry, tests 410, and preserved Clover merchant signature + no-op checkout behavior.
4. Food Hub issue [#103](https://github.com/takatakca/foodhubca/issues/103) remains a separate **contract and persistence task**, not a ready-to-enable endpoint. Existing /api/foodhub/webhooks/website-order still trusts caller-supplied price and paid flags: **must not wire PPP to it** until mapping, merchant payment proof, server-authoritative prices, durable inbox/outbox and restart/replay tests pass.
5. In authorized staging, verify rejection and rollback; native Coolify running SHA/prod health must be directly proven by operator. Leave `ordersPersistAcrossRestarts=false` and tickets #5/#6/#13 NO-GO. No live payment/test print.

**No deployment was performed** and no real order or merchant environment was changed.
