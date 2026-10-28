# PPPMTL — AGENT HANDOFF (read first)


## EVENING RELEASE SECURITY HANDOFF — 2026-10-28

**Start-of-work evidence:** initial `main` `280b916763c2a5e935d5687bae6557722aeb167f`, CI `40647117549` SUCCESS, no open PR; read AGENTS/WORKLOG + latest canonical docs and open issues. New task claimed in `WORKLOG.md` **before code**, commit `b21fb002b82458f3c7b22aeb591e63eda1d6fc49`. Preserve prior menu, official Canva imagery and historical Lovable commits. No force-push.

**New fixes:** `src/lib/orders/order-service.ts` commit `59613ab` fixes critical *filtered availability map* gap: server rejects sold-out and wrong-location item before creation, refuses unsupported Clover delivery early, and bounds untrusted checkout fields. `src/lib/orders/__tests__/order-engine.test.ts` `1044e4c`, formatter `eff248a`; `src/lib/integration/__tests__/clover.test.ts` `00b2011` updates the delivery rejection expectation but retains forged webhook coverage. **Full CI [40648225513](https://github.com/takatakca/pppmtl/actions/runs/40648225513) SUCCESS for code SHA `eff248a211680e96b0879e455bdadc219e963202`** (build, TypeScript, lint, Vitest, PostgreSQL 16 RLS/payments/worker). `src/lib/security/admin.server.ts` `77555eb` and formatter `28fbf21`, `src/lib/security/admin.functions.ts` `8ce7481`, `src/lib/security/__tests__/access.test.ts` `2ea9781` add runtime malformed/oversized temporary admin credential rejection; inspect CI of newest HEAD before claiming this addition green. Source/security documentation: [`docs/agent-notes/2026-10-28-release-security-gate.md`](agent-notes/2026-10-28-release-security-gate.md), created `1942c4f`, appended `60fe399`.

**Deployment status:** HISTORICAL Coolify main native auto-deploy to app `pppmtl` UUID `r13hz1mmbi4eeoc6ssxbvxnv`, last documented live SHA `48c00a4` from 26 Oct. No direct 28 Oct authorized Coolify console, running SHA, or live HTTPS/mobile browser proof. `pppmtl.com` homepage appears in a cached web crawl, but direct `/healthz` and `/menu` fetch and container DNS failed; Browser connector requires original browser session. **Do not claim this code deployed**. GitHub Actions Coolify workflow skipped by design; leave native vs Actions split unchanged.

**Paying customers: NO-GO.** Production order store remains an in-memory ring with `ordersPersistAcrossRestarts=false`. Source contains PgSQL 0001–0003 / injected adapters and worker, tested only on ephemeral CI Postgres, not actual production. Missing connected approved DB + backups + least-privilege role, verified server TAKATAK tenant permissions, signed correlated Clover merchant webhook durable inbox, workers/print/retry/manual-review and controlled payment/refund tests. Keep #5/#6/#13 open and payment fail-closed. No secrets, live customer transactions or production environment settings were changed.

**Existing Google Drive documentation CONFIRMED:** appended the actual source/CI go/no-go and exact release blockers on 2026-10-28 to project note https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit and central journal https://docs.google.com/document/d/14ONf8gWaMnX5cHiOWMheI0IDUugLfsR_MZ_gj0Szoqk/edit, preserving prior content. Both were read back from Google Docs and verified (no duplicate docs and no credentials). For the owner's evening deployment urgency, an hourly **time-limited (20 runs)** release-readiness/CI/authorized safe GitHub follow-up automation was created as `6ae1a26fbe3c819181ab4f3c6d5d767e`; it must NOT turn on payments, change DNS or override another agent. Latest complete source CI proof still 40648225513 on `eff248a` (both jobs green); additional bounded admin-auth source has queued/newer CI, do not claim green until checked for the exact SHA.

**Next exact action for evening release:** fetch current `main` and Actions job results, inspect actual Coolify deployed SHA and HTTPS health with authorized console; real mobile/desktop smoke category Desserts, cart, choices and fail-closed checkout. Only after these checks mark storefront deploy done; obtain approved DB/Clover/tenant integrations and failure-injection before switching payment. Do not duplicate Google Drive docs; append evidence to existing project and central live journal.

---


## LATEST HANDOFF — 2026-10-28 — Saved-cart transparency and keyboard dialogs (third pass)

**Source of truth:** `takatakca/pppmtl`, `main`. Source CI and chronological notes supersede historical paragraphs below. Started from `f02b614beaa0a861aaf18ca6f3e9369abfd1d156` with successful CI `40645720067`, no open PR; read `AGENTS.md`, `WORKLOG.md`, newest handoff, issues and CI. Claimed task BEFORE source changes in WORKLOG at `e1ab1f65c46b577e1e4613528c3928f43275dcdc`. Preserve prior agents' menu/Clover fixes and official yellow Canva images (#18).

**Verified code SHA:** `297c0f9e2d4a657228638f90d7a0f5c5546acdd3`, **GitHub CI [40646740316](https://github.com/takatakca/pppmtl/actions/runs/40646740316) COMPLETED SUCCESS**: both jobs green (Nitro/Bun server build, TypeScript, lint/Prettier, Vitest, PostgreSQL 16 migrations 0001-0003, tenant-isolation, atomic payments and worker leases). Subsequent **documentation-only HEAD `9b67267c1cab8ebb4c341ba2687b6c4ef2262583` also passed CI [40646956048](https://github.com/takatakca/pppmtl/actions/runs/40646956048)**; fetch latest main and workflow after this handoff/worklog update.

**What changed:**
- `src/lib/cart.ts` (commit `5fe6009`; Prettier fix `d54e746`): safe `reconcileSavedCart(saved, findItem, locationId)` reports removed/updated historical cart lines, preserving real Clover groups/IDs, re-pricing retained lines from verified published menu, and rejecting invalid groups/items/quantities/serialized choices. Does not invent mandatory options.
- `src/context/ppp-store.tsx` (`565bea3`): restores/sanitizes and re-persists saved cart; user gets an accessible, dismissible **FR/EN/ES** notification on removed/changed lines, with Review cart action instead of silent loss. No payment enablement.
- `src/lib/integration/__tests__/clover.test.ts` (`2ead295`, format `b8287ad`): tests real pita modifier choices, stale price/optional choices, missing required selections, invalid location/quantity/product and malicious stored JSON.
- `src/lib/use-dialog-keyboard.ts` (`5270f21`, format `297c0f9`): reusable modal focus/scroll handler; Tab/Shift+Tab loop, Escape close, return focus after dismissal; onClose identity updates do not restart focus effects.
- `src/components/order/item-sheet.tsx` (`19a87c5`) and `src/components/order/cart-panel.tsx` (`4535e28`): wired modal keyboard focus trap; related-product swap no longer restores focus behind an open item modal.
- Full technical record (no new duplicate audit file): [`docs/agent-notes/2026-10-28-cart-reliability-audit.md`](agent-notes/2026-10-28-cart-reliability-audit.md), appended commit `6d9493c`. Canonical `PROJECT_STATUS`, `TASK_QUEUE`, `DEPLOYMENT`, `DECISIONS` updated in commits `46d122f`, `4c87990`, `3e7ab87`, `9b67267`.

**Google Drive mirror DONE AND READ BACK:** appended third-pass details in place to the pre-existing [PPP Pizzeria 28 Oct technical document](https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit) and central [TAKATAK live journal](https://docs.google.com/document/d/14ONf8gWaMnX5cHiOWMheI0IDUugLfsR_MZ_gj0Szoqk/edit). Both dated entries verified by Google Docs readback; no new duplicate file and no secrets.

**Not verified:** Actual `pppmtl.com` live deployed SHA/HTTPS `/healthz`, real Android/iOS swipe or Tab behavior (browser session tool reports that the originating browser context is missing), real Clover merchant API and production PostgreSQL/TAKATAK-tenant sign-in. Public website fetch via this environment failed, not proof of downtime. Native Coolify GitHub App is the historically active deploy path; skipped Actions fallback is expected. **Payments stay fail-closed** pending durable production transactions/webhook/outbox, real signed merchant callbacks, customer and admin tenant authorization and controlled charge/refund (#5/#6/#13).

**Next exact step:** fetch newest `main`/WORKLOG, confirm CI; inspect actual running Coolify SHA + health, test Desserts category mobile taps/swipe, restored-cart alert and keyboard focus on real Android/iOS browsers; compare current live Clover modifiers to real merchant data; finish durable production DB/TAKATAK-scoped orders/webhook/print prerequisites without enabling checkout based only on CI. Do not mark customer production ready until verified.

---


## LATEST HANDOFF — 2026-10-28 — menu → cart → server checkout reliability

**What was done / ownership:** This is a NEW follow-up task after the 28 Oct menu/Desserts and Clover option-order UX passes. Agent GPT-6 claimed `WORKLOG.md` first at `925cd83de5996373235776ee4f730cee640019f4` and preserved prior agents' source and notes. Read `AGENTS.md`, `WORKLOG.md`, current branch and the five canonical docs before continuing. No open PR was found at session start.

**Tested source SHA:** `db58af73e7c1c42d3d261772195eb28de918a5c9`. **Verifiable GitHub Actions result:** [PPPMTL CI 40645275982](https://github.com/takatakca/pppmtl/actions/runs/40645275982) = **completed/success** on that SHA. Actual jobs passed: Bun frozen install, Nitro Node build, TypeScript, ESLint, Vitest application tests, structural SQL preflight, PostgreSQL 16 migrations 0001/0002/0003, limited DB role + tenant isolation, atomic Clover payments and worker-leasing SQL fixtures. Earlier follow-up CI [40644711329](https://github.com/takatakca/pppmtl/actions/runs/40644711329) was also green at `3a584d6`.

**Last new source changes (all on `main`):**
- `src/lib/modifiers.ts` (`30f45af`): malformed option JSON safely rejected, no `.split` crash.
- `src/lib/cart.ts` (`a3df45e`, format `55dca7c`): `canAddCartLine` checks item availability, location, valid safe integer quantity 1–50, and Clover min/max/actual choice rules.
- `src/context/ppp-store.tsx` (`e969b6a`): invalid legacy cart lines removed on rehydration, valid lines re-priced; add-to-cart/reorders guarded; immutable reorder (no `state.cart.push`); capped setter.
- `src/components/order/cart-panel.tsx` (`eebb73e`, `307c3ce`): disable increment after 50, modal Escape key/scroll containment/body lock and `aria-modal`.
- `src/components/order/item-sheet.tsx` (`c4e8994`, `2de33be`, `3a584d6`): modal background scroll lock, restore focus after close, `aria-modal`, reset sheet scroll to top when switching product, so new required product choices appear first.
- `src/lib/integration/__tests__/clover.test.ts` (`52ffb81`): real pita selection, location, quantity, malformed/null selection tests. Audited all **175 items and 218 option groups** in committed Clover snapshot; no item/group reference absent and no mandatory group with too few available choices, but this is snapshot-only.
- `src/lib/orders/order-service.ts` (`15c63bc`, format `db58af7`), `src/lib/orders/orders.functions.ts` (`4c86ae3`), `src/lib/orders/__tests__/order-engine.test.ts` (`add0d48`): reject missing/null/oversized/wrong-type runtime JSON before order creation or guest identity handling. `createOrder` validates before dereferencing untrusted fields; server re-prices separately. No Clover production credential, live DB or payment code was enabled.

**Documentation:** Full factual technical note at [`docs/agent-notes/2026-10-28-cart-reliability-audit.md`](agent-notes/2026-10-28-cart-reliability-audit.md) (initial `cdd3e69`, API addendum `2db5d3c`). Four other canonical docs updated in source-safety commits `93909de`, `fba4891`, `6e00810`, `206b4ce` and API follow-up `9a8603f`, `4d55618`, `9e05b80`, `43e001a`. This handoff and the worklog-closing commit are newer than tested source; fetch newest `main` SHA on return, and inspect any newer CI job.

**Google Drive mirror COMPLETED AND RE-READ:** existing PPP Pizzeria project handoff document https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit and existing global TAKATAK live journal https://docs.google.com/document/d/14ONf8gWaMnX5cHiOWMheI0IDUugLfsR_MZ_gj0Szoqk/edit were both appended in-place with this second-pass source/CI/deployment evidence; both documents were read back successfully with dated sections. No new duplicate Drive document was created, and no secrets were stored. GitHub worklog closing commit before this verification: `bbd2a757ac4622330804c7db155a12cecdef45ff`. Any subsequent docs-only SHA still requires its own GitHub Actions check but the **last verified source code** remains `db58af73` (CI 40645275982 success).

**Production/deployment:** No Oct 28 deployed image SHA, current Coolify release ID or public HTTPS `/healthz` was verified. Public web fetch failed; container HTTP client could not resolve `pppmtl.com` from this environment. This is **not** a claim that the customer website is unavailable to normal users, only a verification limitation. The known hosting channel remains **native Coolify GitHub-App auto-deploy to `main`**, with Actions fallback intentionally skipped. **Do not enable both**. Source checkout must remain fail-closed (#5/#6/#13) until durable production PostgreSQL, TAKATAK-auth tenant scope, verified live Clover merchant secrets/HMAC, outbox idempotency and refund/reconciliation are actually tested.

**Known UX risk / future improvement:** Invalid saved cart lines are now removed rather than silently treated as valid; the user sees no explanation. Add a user-visible saved-cart-needs-review warning after real-device QA. Modal initial focus/body-scroll is improved but a complete focus trap, actual iOS Safari testing and exact production SHA remain unverified.

**Exact next action:** Fetch newest `main` and `WORKLOG.md`, latest CI, and check for concurrent active agents. Obtain authorized Coolify app deployment status + running SHA and `/healthz`; inspect Desserts navigation, modal product swapping, saved-cart/reorder and keyboard interactions on real mobile browsers. Verify live Clover item groups with authorized merchant API, without changing approved Canva photos (#18). Continue production #5/#6/#13 gate work only with confirmed DB/merchant/tenant context. Keep GitHub and the **existing** [PPP Pizzeria Google Drive project handoff](https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit) synchronized, no secrets, no duplicate Drive file.

---


## CURRENT HANDOFF — 2026-10-28 (America/Toronto) — UX mobile, Clover and CI


**LATEST VERIFIED CI (after source/SQL repairs):** GitHub Actions [PPPMTL CI run 40639386985](https://github.com/takatakca/pppmtl/actions/runs/40639386985) **completed SUCCESS for source SHA `23043b539acdea63385d56bb3da6d31b2959c96e`**. Verified actual job steps: Nitro Node build, TypeScript, ESLint and application tests SUCCESS; PostgreSQL 16 migrations 0001/0002/0003, limited-role tenant-isolation tests, atomic Clover payment tests and fenced fulfillment-worker leasing tests SUCCESS. Runner provisioning is now functional. This is test evidence **only**, not verified live Coolify release or real credit card transaction.

**Subsequent documentation-only commits:** `ac0f3ebd` PROJECT_STATUS, `8dc72b9b` TASK_QUEUE, `a6009d07` DEPLOYMENT, `06ecf430` DECISIONS, and this handoff. The latest exact `main` SHA will be newer than the green CI source commit; fetch and inspect the current branch and its own latest workflow on next resume. This handoff supersedes its older queued-CI paragraph for that specific source revision; don't misread the historical logs below.

**Still incomplete:** actual pppmtl.com mobile touch/browser regression (Desserts swipe/scroll, product modal), the exact deployed Coolify container SHA and HTTPS health for 28 October, live authorized Clover inventory/merchant connection, durable production PostgreSQL wiring and true payments/print/retry/reconciliation. Issue #5/#6/#13 gates remain intact. Do not publish a customer-facing launch claim or real payment switch without these checks.


**Source of truth:** GitHub `takatakca/pppmtl`, branch `main`; read `AGENTS.md` and `WORKLOG.md` before touching files. **Latest HEAD observed before this handoff commit:** `74e1767606a0388c725d5244505053027731443b`. This handoff and WORKLOG will produce newer SHA(s), so fetch actual HEAD on resumption. Two agents were working in parallel on 28 Oct; preserve their different work and check active claims before proceeding. No PR was open at initial check.

**Owner's explicit priorities (28 Oct):** fix sticky/swipe/lag of `/menu` categories (especially Desserts); present product's *existing* Clover modifier groups in kitchen order (required main choice, sauce, garnishes/vegetables, beverage, trio, combo, extras, where present); keep real IDs/prices/limits, never add fake categories; code notes at entry and exit in GitHub, then project-specific mirror in Google Drive. Don't change separate franchise UI/brands or owner-approved finished yellow Canva imagery (#18).

### Completed source changes (pushed, not mobile/live verified)

- `77b3102b6`: WORKLOG claim **before** coding; another agent simultaneously claimed a related task in a separate WORKLOG line, which must be reconciled, not deleted.
- `b927e59f8` `src/routes/menu.tsx`: take sticky category nav out of short intro section; replace competing IntersectionObserver / `scrollIntoView` scroll effects with passive requestAnimationFrame scrollspy, in-nav horizontal chip centering and immediate calculated category jump. Prevent unexpected vertical document scroll when selecting Desserts.
- `a9389f835` `src/lib/integration/providers/clover/site-groups.ts`: sort Clover groups by base/required first, sauce, garnish, drink, trio, combo, extra; retain actual menu-product group membership, option choice order, Clover min/max/price and ID. `c88097721` adds synthetic tests.
- `b88ec0f62` `src/components/order/item-sheet.tsx`: when required selection missing, scroll inside item-sheet content, not the page behind modal.
- `747cb837c` `src/components/menu/product-card.tsx`: remove staggered entrance animation from category grid cards, reducing perceived tap lag.
- Another active agent committed a focused detailed report `docs/agent-notes/2026-10-28-menu-clover-audit.md` (`1f211c1`), moved Node-only fixture out of Vitest discovery to `scripts/sql-migration-check.cases.mjs` (`004e9c9`, `e1d64aa`, `9702122`) and updated canonical `PROJECT_STATUS`, `TASK_QUEUE`, `DEPLOYMENT`, `DECISIONS` (commits `22d286a`, `d89c50c`, `ef3df22`, `d1c3145`). **Do not re-create these notes**.
- **Real GitHub CI now assigns runners**, superseding old runnerless #7. Run `40638818589` on `747cb837c` executed Nitro build **pass** and TypeScript **pass**, but lint blocked on 68 formatting errors and DB Node fixture 4/5. This session corrected the `$;` to `$$;` SQL valid-fixture typo at `74e1767606` (earlier `26b1a8e` edit was a no-op because JS `String.replace` interprets `$$` specially). Verified updated blob SHA changed to `5f2be452`.
- One-shot narrowly scoped Prettier workflow `.github/workflows/format-once.yml` modified in `95eaba2b`: push-triggered only when that workflow file itself changes, no infinite loop, no destructive force-push; format only 9 CI-reported source paths. GitHub Actions formatter run `40639106678` **succeeded**, bot pushed `783fe3e3b09a20d62dd9cb21bcb4f5f2e0405f71`; this is formatting only. Fresh CI `40639198899` for `74e1767606` was **queued** at last observation. Read jobs/logs of *newest main* run, fix any remaining actual Vitest/SQL/lint issues.
- Google Drive documentation: project-specific existing file **`2026-10-28 — PPPMTL — Relève technique menu, Clover, CI et déploiement — GPT-6`** at https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit (other agent wrote full past context). Global TAKATAK `00 — JOURNAL — État en direct` at https://docs.google.com/document/d/14ONf8gWaMnX5cHiOWMheI0IDUugLfsR_MZ_gj0Szoqk/edit received a separate, dated high-level PPP section through Docs API, preserving old content. Update project-specific doc with final CI result and commit, not a duplicate Google Doc.

### Current verification limits and actual environment

- **Historically verified 26 Oct:** `pppmtl.com` served via native GitHub-App auto deploy to Coolify resource `pppmtl` on Contabo vps2; exact `48c00a4` had been verified finished/healthy. **No October 28 deployed SHA/interactive mobile test confirmed by this session.** Public `/menu` and `/healthz` could not be fetched via the current public verification tool; connected browser could not open tabs because not launched in originating browser context.
- **Clover:** site catalog is a 2026-10-07 snapshot export (175 items, 218 groups); server can query live Clover if a valid configured token exists, but **this session did not confirm a live connected merchant account**. Drive central journal says merchant e-commerce/webhook/REST credentials were prepared, yet not installed in Coolify. Never expose/copy secrets. Live checkout remains intentionally off pending #5/#6.
- **Build/typecheck on `747cb837c`: passed (CI 40638818589).** Lint on that SHA failed before format bot; SQL test failed fixture before correction. Newest checks not yet green. `PPPMTL One-Time Formatter` run succeeded on 783fe3e; do not mistake this for full suite passing.
- GitHub Actions deployment-fallback `.github/workflows/deploy-coolify.yml` is **skipped by design**: native Coolify auto-deploy is the active channel, and both must never be enabled together.
- GitHub Issues still include #5 central TAKATAK entitlement/tenant gate, #6/#13 durable PostgreSQL checkout/webhooks/outbox, #7 historical runner issue, and newer #14–#18. These are not closed by menu UX changes.

### Next exact sequence

1. Fetch latest `main` (there were concurrent agents); read open WORKLOG claims, latest CI jobs and logs. Confirm build, typecheck, ESLint, Vitest, PostgreSQL 0001–0003 and SQL rollback probes. If red, fix demonstrated defects without disabling checks.
2. Verify Coolify deployment status and **exact SHA** for `main`; check `/healthz`, ensure no accidental Clover payment enabled. If inaccessible, record that instead of claiming instant deploy succeeded.
3. Interactive smoke tests: mobile Desserts category tap, swipe, sticky nav, browser back, modal required-group scroll; desktop mouse and keyboard, reduced-motion. Source code review is *not* the same as end-to-end test.
4. Validate real burger/pita/pizza/chicken/dessert modifier groups against Clover (required constraints and payload parity); remove no options or prices. If verified authenticated Clover credentials + DB durable release exist then resume scoped integration; otherwise keep checkout fail-closed.
5. Update the *same* project Google Drive handoff note and GitHub docs after new evidence, then finish WORKLOG line; never disclose secrets or create duplicate project records.

**Access and blockers:** A current Coolify deployment status inspector/authorized cloud browser, legitimate app-side Clover credentials and `DATABASE_URL` (not exposed in documents), verified TAKATAK authorization scope, and hands-on device inspection are still needed for end-to-end verification. No payment, order or print success claimed.

---



## CURRENT HANDOFF — 2026-10-28 01:xx (America/Toronto) — menu / Clover / CI / Drive

**Repo:** `takatakca/pppmtl`, `main`; latest main reviewed just before this handoff: `74e1767606a` (another agent's SQL fixture correction). **Fetching current HEAD is mandatory before working; ongoing agents are publishing concurrently.** Prior October 26 verified Coolify release was `48c00a4`, NOT proof the 28 October source is live.

**Owner's current request:** fix Desserts and other category swipe/lag, order product choices correctly (required dish → sauce → vegetables/garnishes → beverage → trio → combo → extras, only if applicable), preserve all actual Clover IDs/min-max/prices, audit website/Clover connection, record notes to GitHub first and mirror to the correct Google Drive project folder before finishing.

### Completed in this session / duplicate-work warning

- Claimed this work at startup in `WORKLOG.md` (commit `4dae445b2`). Found another agent with a parallel active claim `77b3102b6`. On re-fetching `src/routes/menu.tsx` discovered that agent had just changed it; aborted conflicting edit rather than overwriting progress.
- **Other agent's independently committed UX changes reviewed:** `b927e59f8` for sticky category strip/vertical scroll competition; `a9389f835` for Clover group preparation rank while retaining actual backend constraints; `c88097721` adds group-order tests; `b88ec0f62` confines required-option focus to modal scroll; `747cb837c` reduces staggered grid entry latency. Later another agent pushed `95eaba2b` CI targeted formatting workflow, `783fe3e3` formatting, `26b1a8e8` and `74e176760` SQL-fixture corrections. **Do not redo or revert these commits.**
- **This GPT-6 agent's CI repairs:** inspected GitHub Actions CI `40364935041` logs; runners are now allocated. Build and TypeScript passed; lint failed with Prettier errors; PostgreSQL preflight passed but `node --test` had one incorrect fixture (4/5). Changed fixture and moved Node tests out of Vitest discovery to `scripts/sql-migration-check.cases.mjs` (`004e9c903`), updated `.github/workflows/ci.yml` (`e1d64aa`), deleted conflicting `scripts/__tests__/check-sql-migrations.test.mjs` (`9702122`). Follow-on `74e176760` correctly ensures `$$;` in the current fixture. None of this establishes a new green end-to-end CI without inspecting the latest run.
- GitHub detailed dated history and audit: [`docs/agent-notes/2026-10-28-menu-clover-audit.md`](agent-notes/2026-10-28-menu-clover-audit.md), committed `1f211c1e48b9d30759bd564be39ba4601ee7d8da`. Updated the other four canonical docs.
- **Google Drive mirror actually created, populated, moved and verified** in `PPP Pizzeria` folder (`1yM2IlDsbgPlQyVaWmawnotFN0TxIQMwj`): [2026-10-28 — PPPMTL — Relève technique menu, Clover, CI et déploiement — GPT-6](https://docs.google.com/document/d/1M9aEd9S-IN-oH_ZcMB5i5cCFgd5Q2CFCXzACnQxP83k/edit). It records the previous Oct 26 release, PR #12, owner image decision #18, Clover integration boundaries, this session's Git SHA work and next actions. Google Drive's `TAKATAK — MAIN / 00 — JOURNAL — État en direct` already contained a **separate** concurrent agent's summary of menu/Clover work; do not create duplicates or overwrite it.

### Verification and limits

- Used authenticated GitHub connector to read `AGENTS.md`, `WORKLOG.md`, five canonical docs, source files, menu snapshot, branches, issues, commits, `40364935041` job logs and later Action runs.
- GitHub provided actual assigned runners, Nitro build success, TypeScript success, lint failure, broken Node fixture. Latest looked-up `40639198899` on `74e176760` was pending; no green status is claimed.
- Direct external read of `https://pppmtl.com/menu` failed with cache miss and `https://pppmtl.com/healthz` was unavailable via this environment. **No true mobile browser interaction or exact current production SHA could be verified.**
- Current Clover menu snapshot: 175 items, 218 option groups, mapped to site products. Central TAKATAK Drive journal says merchant e-commerce/webhook/REST credentials prepared in another session, **not yet shown injected into Coolify**, and `DATABASE_URL` + end-to-end test outstanding. No secrets read or committed. Keep live payments fail-closed.
- Production app's known historical deployment: Coolify GitHub-App native autodeploy on Contabo VPS2 (26 Oct documentation), alternative `.github/workflows/deploy-coolify.yml` intentionally disabled. Do not enable both.

### Next exact actions (without duplicating another agent)

1. Re-read current HEAD, `WORKLOG.md` and `docs/agent-notes/2026-10-28-menu-clover-audit.md`; inspect CI runs/jobs for the **latest** SHA. Fix remaining lint/Vitest/PostgreSQL errors only if not already corrected by concurrent agent, then verify passing actual jobs.
2. Obtain approved deployed Coolify revision and browse PPPMTL live menu on mobile; test tap Desserts, large category list, sticky strip, item-sheet required-field scrolling, keyboard and reduced motion. Record evidence and any discovered residual bug, do not claim deployed based on push alone.
3. On real representative products check that every group belongs to that specific Clover item; preserve ID, min/max, prices and unknown-group ordering; keep the owner's Canva finished-yellow imagery decision (#18).
4. The direct Clover payment/customer connection remains gated by issues #5/#6: verified TAKATAK identity and PostgreSQL persistent checkout/webhook/outbox, safe worker/printer replays, secure server-only credentials, tested live merchant configuration. **Do not deploy paid checkout as a shortcut.**
5. Continue canonical GitHub handoff notes and append only new facts to the PPP Google Drive project doc above and main central journal, never repeat an existing agent's note or expose tokens.

**Last session files:** `WORKLOG.md`; `scripts/sql-migration-check.cases.mjs`; `.github/workflows/ci.yml`; deleted `scripts/__tests__/check-sql-migrations.test.mjs`; `docs/agent-notes/2026-10-28-menu-clover-audit.md`; `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md`, this handoff. **No verified new site deployment**.

---



## CURRENT HANDOFF — 2026-10-26 (UTC)

**Production now runs on Coolify, verified.** `https://pppmtl.com` and `https://www.pppmtl.com` are served by Coolify application `pppmtl` (uuid `r13hz1mmbi4eeoc6ssxbvxnv`, project PPPMTL) on server **vps2** (Contabo, 209.145.49.63), branch `main`, native **Coolify GitHub-App auto-deploy ON**. The MochaHost Passenger copy (`~/pppmtl_node`) is no longer receiving traffic and is kept only as a rollback.

- **Release verified:** `48c00a4` (hydration fix) was deployed by a GitHub **webhook** 3 s after the push (Coolify deployment `pqqwxhcy2jctxxhcblwafvia`, status `finished`, container healthy on `/healthz`). Every later push to `main` deploys the same way.
- **Build:** Nixpacks, Node 22, `npm install -g bun && bun install --frozen-lockfile`, `bun run build`, start `node .output/server/index.mjs`, port 3000. Env: `NITRO_PRESET=node-server`, `PUBLIC_SITE_URL=https://pppmtl.com`, `NIXPACKS_NODE_VERSION=22`.
- **Secrets set in Coolify on 2026-10-26** (random, 48 characters, values only in Coolify): `PPP_ORDER_ACCESS_SECRET`, `PPP_ADMIN_ACCESS_TOKEN`, `PPP_ADMIN_SESSION_SECRET`. Verified live: a wrong token is refused, the real token opens `/admin/orders`.
- **Not set (owner action):** Clover credentials, `DATABASE_URL`. Live card payment stays disabled by design (`ordersPersistAcrossRestarts = false`, issue #6). Customers who press "Pay with Clover" see "This restaurant is not taking online orders yet" with a call button (verified live).
- **DNS (MochaHost zone):** apex A → 209.145.49.63 (TTL 300), `www` CNAME → apex, `ftp` A → 209.42.24.127. Mail stays on MochaHost: MX, mail, webmail, SPF and DKIM are unchanged. **Added** `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:admin@pppmtl.com; fo=1` (monitor only). TLS: Let's Encrypt via Traefik, auto-renewed.
- **Fixed in `48c00a4`:** React #418 on home, menu and offers. The favourite button sat inside the product-card button (invalid HTML). Typecheck, ESLint, Prettier, 134 Vitest tests and the Nitro build pass locally. The live site shows no hydration error on 20 pages.
- **Known, unrelated:** `bun run test` reports `scripts/__tests__/check-sql-migrations.test.mjs` as a failed suite ("No test suite found"): it is a `node --test` file that Vitest also collects, and 1 of its 5 node tests fails. Not touched here.
- **Do not also enable** `.github/workflows/deploy-coolify.yml` (`PPPMTL_DEPLOY_VIA_ACTIONS`): native auto-deploy is the active mechanism.

**Next exact action:** owner supplies the Clover credentials and approves the durable PostgreSQL order store (issue #6) before any live payment. A PostgreSQL database can be created on Coolify vps2. After a few stable days, stop the MochaHost `pppmtl_node` app to free a MochaHost process.

---

## PREVIOUS HANDOFF — 2026-10-16 (America/Toronto)

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
