# PPPMTL — Second pass: menu-to-cart reliability audit
Date: 2026-10-28 (America/Toronto) · Agent: GPT-6 · branch: `main`

## Start-of-session state and claim

- Read `AGENTS.md`, the newest `docs/AGENT_HANDOFF.md`, `WORKLOG.md`, `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, current `main`, recent commits, GitHub Actions and open issues/PRs. Initial HEAD: `525661cfd9a0c28e0a491bf669b69754ecb3e2e2`; initial CI `40639643403` success. No open PR found.
- Claimed this **new** task in `WORKLOG.md` **before writing code**, commit `925cd83de5996373235776ee4f730cee640019f4`. Previous agents' menu and Clover presentation changes are preserved. This task is about integrity of menu → basket → reorders, not another redesign.
- Checked public `https://pppmtl.com/menu` and `/healthz` through web tools: unavailable. A secondary container-based HTTP check failed DNS resolution for `pppmtl.com` in this environment. **No current production SHA, real mobile interaction or merchant connection was verified.** Do not infer deployment from successful CI.

## Confirmed source-level defects and fixes

1. **Unvalidated browser cart additions:** `PPPProvider.addToCart` previously added any known item with arbitrary quantity and empty/malformed required options. Introduced pure `canAddCartLine` in `src/lib/cart.ts` checking menu availability, known location, 1–50 safe-integer quantity and the exact Clover min/max/choice rules via `checkSelections` before adding a line. Used by `addToCart` and `reorderToCart`. The server still does its independent validation and re-pricing.
2. **Stale persisted cart:** on localStorage restore, older menu selections were pruned but the resulting line was never checked against current mandatory groups. Lines now get re-priced and are **retained only if current product/location/quantity/required options are valid**. Existing invalid lines are dropped rather than fabricating a default substitution. Future UX improvement: a clear notice when a saved line was removed for this reason, instead of silently losing it.
3. **Reorder mutated React state:** `reorderToCart` previously used `state.cart.push(...)` inside the context's memoized store. It now creates a fresh cart array, rechecks each product against Clover constraints and persists immutably.
4. **Invalid optional modifier payloads:** `checkSelections`/ `chosenIds` previously called `raw.split` on values assumed to be strings; a malformed serialized JSON object could throw a 500 in checkout validation. Non-object/array selections, non-string choice values and excessively long (over 2048 characters) choice values are now rejected with an explicit invalid-selection result; the server must still authenticate and validate all requests.
5. **Quantity UI drift:** cart increment control now disables at 50, and context `setLineQuantity` refuses non-integer or >50 quantities; the server already rejected malformed quantities.
6. **Mobile sheet UX:** item sheet blocks scrolling the body while open, restores previous focus on closing, exposes `aria-modal` and confines its own scrolling. On switching from a cross-sold related product to a new item, resets scroll to top so the new main required option is not hidden below the old item's extras. Cart panel gains Escape to close, `aria-modal`, scroll containment and body-scroll lock. A full focus trap and iOS/Android real-device verification are NOT yet implemented/proven.

### Files and commits

- `src/lib/modifiers.ts`: `30f45af220bd32ea5d8392070f6383d4cdf68136`
- `src/lib/cart.ts`: `a3df45e5b51fbb891004d03e19ef46606148c947`, format fix `55dca7c5a97e8091f93c16d348802a5ab441c524`
- `src/context/ppp-store.tsx`: `e969b6a7c7eeb644354a40a5825ebfe4c1e30f28`
- `src/lib/integration/__tests__/clover.test.ts`: `52ffb8124afe2a9e6a84e79aad8735b2dee1331f`
- `src/components/order/cart-panel.tsx`: `eebb73e2fe2b3fda52fff01f8509b6de3cf6800f`, `307c3cee3308b061acb2d455165de0c5bf665a3c`
- `src/components/order/item-sheet.tsx`: `c4e8994d0435d9d48a0eb895c47fa166fad463ef`, format fix `2de33be5dff9fc5a6cf21f1b4f88f37d7c24d799`, scroll-reset `3a584d6d8664d8621274618d04aa1367a3ffedef`

### Verification

- On the committed Clover snapshot (175 products, 218 groups), checked every product-to-group reference and all required minimums against the count of available choices: **0 invalid references/insufficient-choice exceptions in the snapshot**. This does not guarantee that live Clover inventory has not changed.
- Added tests using the real PPP pita item's options for missing required options, valid selections, invalid location, zero/fractional/51 quantities, and malformed/non-string/null selections. Preserved prior Clover mapping and pricing tests.
- GitHub Actions `PPPMTL CI` [run `40644711329`](https://github.com/takatakca/pppmtl/actions/runs/40644711329) on **source SHA `3a584d6d8664d8621274618d04aa1367a3ffedef`**: `completed / success`. Both jobs succeeded, including Nitro Node build, TypeScript, ESLint, application tests, SQL structural preflight, PostgreSQL 16 migrations 0001–0003, tenant isolation, atomic payments and worker leasing.
- Intermediate CIs failed on Prettier-only issues in new files; fixed source formatting and re-ran to a green result. Do not report those intermediate runs as green.

## Outstanding production prerequisites

- Verify actual Coolify native deployment for current commit, container health and real `/menu` behavior via authorized browser or deployment UI. The opt-in Actions deploy workflow being skipped is expected and is not deployment evidence.
- Test mobile Desserts category taps/swipe, modal opening/switching, soft keyboard, focus and overflow on actual Android/iOS; desktop keyboard navigation and responsive layouts. Confirm whether React context remains correct across browser reloads.
- Test a representative live merchant inventory including pizza/burgers/pita/trios/combos/desserts, compare live product group IDs, constraints and prices against the source mapping. Don't change approved yellow Canva imagery (#18).
- Production PostgreSQL `DATABASE_URL`, limited DB role, durable order persistence and webhook/outbox plumbing, tenant-scoped TAKATAK identity and verified Clover REST/webhook/checkout secret deployment are still unverified (#5/#6/#13). **Keep production payment fail-closed**. No real customer payment was attempted.
- Consider displaying a non-destructive “Your saved cart needs review” notice when stale lines are removed on restoration; current behavior is safe but not self-explanatory.
- Update `docs/AGENT_HANDOFF.md`, `WORKLOG.md`, `PROJECT_STATUS.md`, `TASK_QUEUE.md`, `DEPLOYMENT.md`, `DECISIONS.md` and append the factual summary to **the existing PPP Pizzeria project handoff Google Doc** (not a duplicate). Do not copy credentials or addresses/private data.

## Follow-up — Untrusted API request guard and final green CI

After the initial source pass, a further runtime trust-boundary audit found that `createOrder` called `buildItems` before validating the shape of the browser request, and `placeOrder` called the guest identity sanitizer on `data.customer` before checking it existed. TypeScript's compile-time `CheckoutRequest` type and TanStack's current identity input validator do **not** validate arbitrary JSON at runtime.

- `src/lib/orders/order-service.ts`: introduced `hasCheckoutPayloadShape` (array and 100-line bound, location/customer shape, safe customer/name/phone, delivery/notes strings and per-line itemId/quantity/notes shape). `validateOrder` now returns an explicit `menu_changed` error for malformed JSON; `createOrder` validates before dereferencing fields or claiming an order ID. Source commits `15c63bcf16e11dbb5ade843712291b333035077e` and lint-only `db58af73e7c1c42d3d261772195eb28de918a5c9`.
- `src/lib/orders/orders.functions.ts`: `placeOrder` calls `validateOrder` before passing untrusted customer data to the guest identity sanitizer. Commit `4c86ae3681e7d595be9879a87d1fc80b64cfdf6a`. Its original payment-disabled/fail-closed behavior is unchanged.
- `src/lib/orders/__tests__/order-engine.test.ts`: added malformed checkout cases (null/array body, null/oversized line list, missing customer, invalid name/address/notes types, null line, invalid line notes). Both `validateOrder` and `createOrder` must reject safely. Commit `add0d48f66ee0b58b5e2e5f1783a53d10d4d6db9`.
- Real GitHub Actions [run `40645275982`](https://github.com/takatakca/pppmtl/actions/runs/40645275982) for **`db58af73e7c1c42d3d261772195eb28de918a5c9` completed SUCCESS in both jobs**: Bun/Nitro build, TypeScript, lint, application tests, PostgreSQL schema/migrations and tenant/payment/worker probes. Intermediate run `40645131798` failed only at a blank-line Prettier lint issue, corrected before the green run.
- **No live payment was activated.** App config, merchant tokens, production database and physical mobile-browser verification remain separate release gates. The current publicly running Coolify revision was not accessible through available HTTP/DNS tools.
- On resumption, read latest main SHA and current GitHub Actions (later docs commits generate new runs). Next action: verify native Coolify deployed SHA/health and run mobile cart-item, category-switching and modal QA. Then verify live Clover group constraints and the deferred durable database/TAKATAK scope work.

