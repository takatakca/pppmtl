# GitHub TAKATAKCA — Complete Read — 2026-10-29

Signed: SOCIO, Agent Lévesque.
Task: Pierre 2026-10-29 22:01 EDT — takatak.ca is the master of everything, Pierre is the boss, he created the social media for his brands, the Social dashboard being integrated is his, test it with his own brands before reselling the product. Verify from GitHub evidence, do not just repeat the claim.
Method: GitHub connector, read-only. No code change, no live write, no plan created, no price changed, no password/code/phone/date of birth anywhere.

## 0. Account identity (verified live)

- GitHub `get_me`: login `takatakca`, name `TAKATAK MARKETING`, company `@takatak`, blog `takatak.ca`, location `MONTRÉAL,QC`, email `takatak.ca@gmail.com`, public_repos 52 at read time, created 2025-04-05.
- MCP `search_repositories` for `user:takatakca` returned total_count 61 (first page 30 names, including takatak-v1, CH4T, knowledgeAI, takatak, mimt, SEOTAKATAK, TAKATAK-APP, on2goca, pppmtl, ACADEMYTAKATAK, takatakbackend, and others). The 52 vs 61 difference is a search-total vs public-repo count difference in the tool output; it is NOT used as evidence here.
- Code search for `src/lib/billing/social/plan-catalog` across user:takatakca returned hits ONLY in takatakca/takatak-v1. No other takatakca repo contains the Social billing code.

## 1. Which repo contains the takatak.ca platform itself

**Only: takatakca/takatak-v1** — `TAKATAK User Official Dashboard V1`.

- Root README (`takatakca/takatak-v1/README.md`): "Modular SaaS platform and control tower for client digital services. AI is one powerful layer inside the system — not the system itself." "Unified dashboard for clients, businesses/brands, services, campaigns, reports, and jobs" — with adapters Metricool (social), Upmind (web/domain/hosting), QMAPS (local listings), FLEXS (leads), Stripe (billing, later).
- `package.json`: name `takatak-user-official-dashboard-v1`, version 0.1.0, private true, Next.js + TypeScript.
- Phase status in README: "Phase 15A complete — Tenant Isolation and Real Membership Enforcement … Production remains gated on staging verification: live Supabase E2E … Next: staging deployment + live E2E, or Phase 15B."
- The separate repo `takatakca/takatak` is only a Next.js website scaffold for takatak.ca (per the 2026-10-27 inventory); it is NOT the dashboard/Social platform. Clover code lives in foodhubca / pppmtl / on2goca, NOT in takatak-v1 (0 Clover hits, prior inventory finding stands).

### Platform files that matter for this task (all in takatakca/takatak-v1)

Social module / billing:
- `src/lib/billing/social/plan-catalog.ts` — Social plan catalog, prices, checkout list
- `src/lib/billing/social/types.ts` — plan codes
- `src/lib/billing/social/entitlements.ts` — entitlement resolution
- `src/lib/billing/social/subscription-lifecycle.ts` — paid vs blocked
- `src/lib/billing/social/brand-allowance.ts` — brand-creation gate + test allowance
- `src/lib/billing/social/brand-allowance-policy.ts` — effective allowance, freeze/restore
- `src/lib/billing/social/billing-banner-policy.ts` — "Social is locked" banner copy
- `src/lib/billing/social/stripe-checkout-policy.ts` — self-serve checkout validation
- `src/lib/billing/social/stripe-env.ts` — Stripe Price ID env map (paid plans only)
- `src/lib/billing/social/stripe-webhook-policy.ts` — webhook decision, incl. skip for non-paid plans
- `src/lib/billing/social/stripe-webhook-apply.ts` — applies webhook patch + brand allowance
- `src/lib/billing/social/ensure-default-subscription.ts` — default blocked subscription row
- `src/lib/billing/SOCIAL_PAYMENT.md` — 7-step Social payment documentation
- `src/components/social/brands/add-brands-modal.tsx` — brand-creation modal copy

Growth Suite (SEPARATE from Social — see §3.4):
- `src/lib/growth/plans.ts` — Growth service catalog, DRAFT prices, Social Suite $39
- `src/lib/billing/growth/stripe.ts` — Growth checkout + webhook, GROWTH_BILLING_ENABLED gate
- `src/app/dashboard/growth/pricing/page.tsx` — Growth pricing page, draft honesty note
- `docs/TAKATAK_GROWTH_SUITE.md`, `docs/GROWTH_SUITE_PASSATION.md`, `docs/GROWTH_SUITE_ROLLBACK.md`
- `.env.example` — `GROWTH_BILLING_ENABLED=false`, `GROWTH_ENTITLEMENTS_ENFORCED=false`

## 2. Ownership evidence — what the code actually says, and what it does NOT say

### Supported by evidence
- The GitHub account itself is TAKATAK MARKETING / @takatak, blog takatak.ca, email takatak.ca@gmail.com (see §0). That ties the account to Pierre's group email and domain, as used throughout the Drive/GitHub work.
- takatak-v1 README calls it a "control tower for client digital services" — i.e. a product built to serve clients, not only one restaurant. `SOCIAL_PAYMENT.md`: "Who pays: the Client (workspace), not a Brand and not a Facebook Page." "GROUPE TAKATAK bills its clients two ways: Stripe for subscriptions" (docs/CLIENT_INVOICING_STRIPE_CONNECT.md, search hit).
- `docs/TAKATAK_ADS_FOUNDATION.md` (search hit): "This module turns GROUPE TAKATAK's owned web properties into a controlled local advertising network." That is a statement about GROUPE TAKATAK owned web properties in the ADS module, not a legal ownership registry for the dashboard or for any restaurant brand.
- BRAND.md: "GROUPE TAKATAK brand reference. Use this for anything visual or written for TAKATAK: websites, dashboards, apps, emails, social posts, images, documents. Source: the owner's official logo and banner (Oct 2026)." Again a brand reference, not a named-person ownership deed.

### NOT in the code — contradictions / gaps, reported plainly
- `Pierre`: 0 hits in takatakca/takatak-v1 code search.
- `Matthieu` / `Matthieu Wallace Barnard`: 0 hits in takatakca/takatak-v1 code search. Matthieu is the workspace Owner in the live takatak.ca dashboard session (per the parent browser reports), but he is NOT named anywhere in the platform code read here. Do NOT conflate Pierre with Matthieu: Pierre is the person giving orders in this chat and the owner of the restaurant work; Matthieu Wallace Barnard is the live dashboard workspace Owner identity; the code names neither as the platform owner.
- No LICENSE, author, or owner-deed file was found in this read naming Pierre, Matthieu, or Groupe TAKATAK as the legal owner of takatak-v1. `package.json` has no author field in the portion read (name, version, private true only).
- `src/lib/website/owned-brands.ts` is decisive against over-claiming brand ownership from code: "Brands GROUPE TAKATAK owns and operates, shown on /ecosystem ('Our brands'). Source of truth: the owner's portfolio registry in the knowledgeAI repository… Registry snapshot 2026-10-06: it has no ownership field, it describes itself as 'not a legal ownership registry', and every asset's `currentStatus` is `UNKNOWN_NEEDS_AUDIT`. No entry qualifies yet, so this list is empty." The exported list is literally `ownedBrands = []` and `hasOwnedBrands = false`. So the code, as of this read, does NOT confirm that GROUPE TAKATAK owns PPP, Po Poulet, or any specific restaurant brand. That must be proven from the registry/Drive evidence, not from this file.
- `resell`: 4 hits in takatak-v1, none of them a resell-the-Social-dashboard plan. The hits are AI-provider billable-to-clients flags, MIMT telecom reseller compliance research (explicitly NOT a claim of active reseller authorization), and a voice-product boundary doc. There is NO doc, README, roadmap, or onboarding file found in this read that says "test the Social dashboard with our own restaurant brands first, then resell it to clients." The resell/test-first intent is Pierre's stated business intent in chat (2026-10-29 22:01 EDT), not a code-documented plan found here. The closest code support is the pilot/test machinery in §4, not a resell roadmap.

### Verdict on Pierre's claim, from code alone
- PARTLY SUPPORTED: takatak.ca / takatak-v1 is a TAKATAK client-services SaaS dashboard, under the takatakca / TAKATAK MARKETING GitHub account tied to takatak.ca@gmail.com, built to serve client workspaces, with GROUPE TAKATAK brand references throughout.
- NOT PROVEN BY CODE: that Pierre personally is named as platform owner, that Matthieu is the same person as Pierre (he is not, by name), that any specific restaurant brand is legally owned by GROUPE TAKATAK in code, or that a test-then-resell plan is documented in the repo. Those rest on Pierre's chat statements and Drive/GitHub business notes, not on takatak-v1 code.

## 3. How Social plans are defined in code

### 3.1 Social catalog — src/lib/billing/social/plan-catalog.ts (exact)

Header comment: "Social plans priced in CAD before applicable taxes. The billing unit is the number of active Brands on the Client workspace. Annual self-serve plans receive a 10% discount. social_unsubscribed is an internal zero-access state. It is never sold through Stripe and must never be presented as a free plan."

| Plan code | Plan name | Brands | displayMonthlyCad | displayAnnualMonthlyCad |
|---|---|---|---|---|
| social_unsubscribed | No Social subscription | 0 | 0 | 0 |
| social_essential_1 | Social Essential | 1 | 20 | 18.00 (20 × 0.9) |
| social_starter_5 | Starter 5 | 5 | 54.79 | 49.31 (× 0.9) |
| social_starter_10 | Starter 10 | 10 | 82.63 | 74.37 (× 0.9) |
| social_advanced_15 | Advanced 15 | 15 | 113.24 | 101.92 (× 0.9) |
| social_advanced_25 | Advanced 25 | 25 | 168.91 | 152.02 (× 0.9) |
| social_advanced_50 | Advanced 50 | 50 | 312.26 | 281.03 (× 0.9) |
| social_custom | Custom | 50 (floor, see below) | 0 | 0 |

Notes:
- Essential networks: facebook, instagram, threads, tiktok, google_business, youtube, pinterest, bluesky, twitch, web, blog. LinkedIn is added only on Starter/Advanced (PAID_NETWORKS). X requires a paid X add-on slot (Starter/Advanced only).
- `PAID_CHECKOUT_PLAN_CODES` = Essential + Starter + Advanced ONLY. Custom is explicitly excluded: "Plans available through self-serve Stripe Checkout. Custom plans remain sales-only."
- `validateSocialStripeCheckoutInput` in stripe-checkout-policy.ts: if planCode is not a paid-checkout code, it fails; for social_custom the error is exactly "Custom plans are not self-serve. Talk to us instead." For anything else: "Choose a Social Essential, Starter, or Advanced plan."
- social_custom in the catalog: brandAllowance 50, Advanced features, displayMonthlyCad 0. SOCIAL_PAYMENT.md: "Sales / contract plan. Default brand floor in code is 50. Can be raised (customBrandAllowance, 50 or more). No self-serve list price (displayMonthlyCad is 0). Includes Advanced features. White-label and contract extras are not in the catalog yet." Entitlements: for social_custom, brandAllowance = customBrandAllowance if ≥ 50, else the catalog 50.
- social_unsubscribed display 0 does NOT make it a $0 plan: the code says it is never sold and must never be presented as a free plan. `ensure-default-subscription.ts`: a new Client gets a blocked row (status incomplete, planCode social_unsubscribed) and the comment states "This record does not provide Social access and is never sold through Stripe."

### 3.2 Is there an owner-configurable way to add a plan or set a price to $0?

- **In the dashboard UI: NO.** Confirmed by the parent browser inspection (no plan-creation feature, Custom = sales quote) and by code: checkout validation only accepts the fixed PAID_CHECKOUT_PLAN_CODES list; there is no UI, API route, or admin setting in the files read that lets a workspace owner create a plan, name it "Mathieu", or set its price.
- **In code/config, by the platform operator (the person who controls the deployment + env + Stripe): YES, in two distinct ways — neither is a dashboard action, and neither is a "Mathieu plan" created by a workspace owner:**
  1. **Edit the catalog in code and redeploy** — add a new entry to SOCIAL_PLAN_CATALOG in plan-catalog.ts, add its code to PAID_CHECKOUT_PLAN_CODES, and create a matching Stripe Price. That is a platform code change, affecting every workspace on that deployment, requiring Pierre's explicit approval as a platform change (see §6). It is NOT what the dashboard offers today.
  2. **Set a Stripe Price ID to $0 in env for an existing paid plan** — Social checkout does NOT use the catalog display price; it uses env Price IDs (`STRIPE_PRICE_<PLANCODE>_<CYCLE>`, stripe-env.ts: `readSocialStripePriceMap`). The webhook (see §4.2) checks Stripe subscription status + price mapping, NOT the amount in cents. So an operator who controls env + Stripe could map a paid plan code to a $0 Stripe Price, and a resulting active/trialing subscription would apply that plan. That is operator pricing control, not a workspace-owner dashboard action, and it would misprice that plan for every workspace using that Price ID unless scoped otherwise. It is NOT recommended as a silent workaround and still needs explicit platform-owner approval.
- **A $0 "Custom" checkout does NOT work via the normal webhook path** (see §4.2): custom is skipped by the webhook interpreter, so a Stripe subscription for social_custom would not apply.

### 3.3 Growth Suite $39 Social Suite — draft only, NOT live, NOT Social

- `src/lib/growth/plans.ts`: "Prices are DRAFT values in CAD for the owner to confirm; nothing here charges anyone — Stripe checkout is wired separately." SERVICE_PLANS includes `social_suite`, name "Social Suite", stage social, monthlyCad 39, replaces "Hootsuite / Later", includes all social accounts, one-click multi-platform posting, content calendar, social analytics. Bundle TAKATAK One: 299/month, 1000 credits.
- `src/app/dashboard/growth/pricing/page.tsx` honesty note: if billing is not enabled, "Prices are draft values in src/lib/growth/plans.ts and src/lib/growth/ai-engine.ts for the owner to confirm. Nothing on this page charges a card until GROWTH_BILLING_ENABLED is turned on." And: "During the pilot every feature stays unlocked" when `growthEntitlementsEnforced()` is false.
- `src/lib/billing/growth/stripe.ts`: "Plan checkout stays off until the owner confirms prices (GROWTH_BILLING_ENABLED=true)." `growthBillingEnabled()` = `GROWTH_BILLING_ENABLED === "true"` AND a Stripe secret key is present. `.env.example`: `GROWTH_BILLING_ENABLED=false`, `GROWTH_ENTITLEMENTS_ENFORCED=false`, with the comment "Keep false until plan prices are confirmed" / "Require a plan for each Growth feature (off during the pilot)."
- Growth webhook (`applyGrowthStripeEvent`): handles checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid; status follows Stripe (past_due keeps access during retries, canceled removes it); each event ID processed once.
- **Separation that matters:** `docs/TAKATAK_GROWTH_SUITE.md` scope rule: "The Social module (src/app/dashboard/social, src/lib/social) is not modified. Growth pages link to it … but never re-implement or change it." So a $0 or draft Growth plan, or turning Growth pilot flags on/off, does NOT unlock the Social module. The live Social lock is governed by the Social lifecycle (§4), not by GROWTH_BILLING_ENABLED or GROWTH_ENTITLEMENTS_ENFORCED.

### 3.4 Pilot flags — what "pilot" actually means in code

- Growth: `growthEntitlementsEnforced()` false = pilot default, plan gates off for Growth features. `GROWTH_SUITE_ROLLBACK.md` table: `GROWTH_ENTITLEMENTS_ENFORCED` → "plan gates off (the pilot default)"; `GROWTH_BILLING_ENABLED` + AI credits flag → "no Stripe checkout for credits or plans".
- Social: there is NO equivalent "pilot unlocks everything" flag for the Social module. Social access is paid vs blocked by subscription lifecycle (§4). The only Social test mechanism found is the brand-allowance override in §4.3, plus a separate connection-development bypass (see §4.4) that is explicitly NOT for production.

## 4. How brand creation is gated in code, and what unlocks it

### 4.1 The exact gate — src/lib/billing/social/brand-allowance.ts

`assertClientCanAddBrand(clientId)`:
- Loads subscription + brands, resolves lifecycle + entitlements, computes `normalAllowance = effectiveBrandAllowance(lifecycle.access, entitlements.brandAllowance)`.
- `effectiveBrandAllowance` (brand-allowance-policy.ts): "Blocked access always has an effective allowance of 0." Otherwise the plan's brandAllowance.
- Then: `override = testBrandAllowance(clientId)`; `allowance = override === null ? normalAllowance : Math.max(normalAllowance, override)`.
- If billable brands (status active/draft/paused) >= allowance, it throws ServiceError 'forbidden' with, when allowance === 0, exactly: "This workspace cannot add brands while Social access is locked." Otherwise: "This plan allows N active brand(s). Freeze another brand or upgrade to add more."
- That is the exact message the live browser reported on 2026-10-29 21:52–21:53 EDT. The live workspace therefore had allowance 0 at that moment: blocked lifecycle, no test override in effect for that clientId.

### 4.2 Subscription lifecycle — src/lib/billing/social/subscription-lifecycle.ts

- Access is only 'paid' or 'blocked'. Paid: trial, active, past_due, grace_period, or canceled with period still open. Blocked: missing, incomplete, paused, suspended, expired, canceled after period end, and legacy 'free' (comment: "Legacy 'free' rows … They are blocked and receive no Social entitlements").
- `resolveEffectiveSocialEntitlements`: if lifecycle is blocked, planCode is FORCED to social_unsubscribed, add-ons ignored — regardless of what planCode is stored. So a blocked workspace gets 0 brands, 0 posts, 0 analytics days, no LinkedIn/X/reports/team/API, even if a plan row exists.
- Social Stripe webhook (`stripe-webhook-policy.ts`, `interpretStripeSubscriptionEvent`):
  - Maps Stripe status: trialing → trial, active → active, past_due → past_due, canceled → canceled, unpaid/incomplete_expired → expired, paused → paused, incomplete → skip (no change).
  - Then resolves planCode from subscription metadata planCode OR priceId via the env price map.
  - **Decisive check:** `if (!planCode || !isPaidCheckoutPlanCode(planCode)) return { action: 'skip', reason: 'The Stripe subscription does not map to a TAKATAK Social plan.' }`. Since social_custom is NOT a paid-checkout code, a webhook for social_custom is SKIPPED, not applied. A webhook for social_unsubscribed is likewise skipped.
  - For a paid plan, it applies status + planCode + period + add-ons, and `stripe-webhook-apply.ts` then runs `applySocialBrandAllowance` (freeze/restore brands to the new allowance).
  - The webhook does NOT check the amount paid in cents — it checks status + plan mapping. That is why an operator-set $0 Price ID for a PAID plan code (§3.2, way 2) would technically apply, while a $0 Custom plan would not.
  - SOCIAL_PAYMENT.md locked rules: "The Stripe success URL does not unlock the plan. The webhook does." "Failed payment freezes access. It does not delete Brands, posts, or analytics." "A dead Facebook/Instagram/Google token is not an unpaid invoice."

### 4.3 The legitimate test path already in code — SOCIAL_BRAND_TEST_* (brand creation only)

`src/lib/billing/social/brand-allowance.ts`, function `testBrandAllowance`, comment verbatim in substance: "Temporary live-testing capacity for explicitly allowlisted workspaces. Does not modify subscriptions, Stripe, or a workspace's persisted plan. Remove the environment variables to restore normal brand allowances."

Exact mechanics:
- Env vars: `SOCIAL_BRAND_TEST_CLIENT_IDS` (comma-separated client UUIDs, lowercased, trimmed) and `SOCIAL_BRAND_TEST_ALLOWANCE` (must match /^[1-9][0-9]*$/, safe integer, max 100).
- If the workspace clientId is NOT in the allowlist, returns null (no effect). If it IS, returns the allowance number.
- Effective allowance = max(normalAllowance, testAllowance). So for a blocked workspace (normal 0) that IS allowlisted with, say, 12, the effective allowance becomes 12 and `assertClientCanAddBrand` passes until 12 billable brands exist.
- This is the ONLY test override found for brand creation. It appears in exactly ONE file in the whole takatak-v1 search (total 1). It is NOT listed in `.env.example` (the SOCIAL_* vars there are connection-setup and Stripe keys, not these two).
- Limits, stated plainly:
  - It lifts ONLY the brand-count gate in brand-allowance.ts (preview/assert/apply). It does NOT change the subscription lifecycle, entitlements, post caps, network connections, analytics windows, LinkedIn/X eligibility, reports, teams, or API — those still resolve from the blocked lifecycle to social_unsubscribed. So "test brands can be created" does NOT equal "full Social results, analytics, and connections work" — Pierre's stated test goal (results, analytics, connections coming out) would still be blocked for a blocked workspace beyond brand creation, unless a paid plan (or a separate connection dev bypass, §4.4) is also in effect.
  - It requires whoever controls the deployment env to set those two vars and redeploy/restart the app with them. It is NOT a dashboard action, NOT a Stripe checkout, and NOT a plan named "Mathieu". There is no "Mathieu plan" anywhere in the code (search for a Mathieu plan code: none; the only plan codes are the 8 in types.ts).
  - Removing the vars restores normal allowances — which matches Pierre's "lock it again after we finish" idea, but for brand creation only: existing brands over the restored allowance would then be subject to the freeze logic (planBrandFreeze: extras freeze, not delete).

### 4.4 Separate connection dev bypass — NOT a production brand unlock

`src/lib/billing/README.md` (Social connection authorization): allowed when lifecycle is paid OR Free, OR "a trusted server-side development bypass is enabled AND the runtime is not production (NODE_ENV !== 'production' and VERCEL_ENV !== 'production')." Sources (never from the browser): non-production runtime, `ClientSubscription.developmentBypass` in the database, env `SOCIAL_CONNECTION_DEV_BYPASS=true`. "Production never uses that bypass." "Dev bypass does not skip those network gates." This is for OAuth connection testing, not for unlocking brand creation in production, and it must NOT be used as a production workaround.

### 4.5 Answer to "would a $0 subscription checkout trigger the unlock the same way as a paid one?"

- Via self-serve Social checkout: NO for Custom ($0 display) — checkout validation forbids it, and the webhook skips it even if a subscription event arrived.
- Via a paid plan code with a $0 Stripe Price set by the platform operator in env: YES, technically, because the webhook checks status + price mapping, not amount — but that is operator mispricing of a paid plan, not a dashboard feature, and it would apply to any workspace using that Price ID. It needs explicit platform-owner approval, and it is not "a Mathieu plan".
- Via the test-brand env override: NO Stripe checkout at all is needed, and NO plan is changed — but it unlocks ONLY brand creation up to the set allowance (max 100), not full Social access.
- Via Growth $39 draft / $0 Growth plan: NO — Growth and Social are separate modules; Growth checkout does not touch the Social lifecycle or brand gate.

## 5. Test / resell intent evidence

- NO file found in takatak-v1 that documents "test with our own restaurant brands first, then resell the Social dashboard to clients" as a plan.
- What IS documented:
  - The product is a client-services SaaS (README, §1): dashboard for clients, brands, services, campaigns, reports, jobs.
  - Client billing: "Who pays: the Client (workspace)" (SOCIAL_PAYMENT.md); GROUPE TAKATAK bills clients via Stripe subscriptions and Upmind for domains/hosting.
  - Pilot state: Growth features are in pilot with gates off by default (GROWTH_ENTITLEMENTS_ENFORCED=false), and production is gated on staging verification (README Phase 15A note; GROWTH_SUITE.md: "The Phase 2–9 migrations are awaiting owner approval for staging and production" and "Production approval gate … owner approved all 9 Growth migrations for staging … not yet [for] production … production database approval is a separate owner step").
  - Test machinery: SOCIAL_BRAND_TEST_* (§4.3) is explicitly "temporary live-testing capacity for explicitly allowlisted workspaces" — that is the code's own test-with-real-workspaces mechanism, and it fits Pierre's stated test-first intent in spirit, but it does not name his restaurant brands, nor a resell step after testing.
  - The owned-brands page is hidden until the registry confirms ownership (§2): `hasOwnedBrands = false` today. So even the "our brands" showcase, which would be the natural test-then-showcase surface, is currently empty by code design.

## 6. Clear answer: can the platform owner legitimately add a $0 Social plan, and if so exactly where/how?

**Short answer: NOT via the dashboard, and NOT as a self-serve $0 "Mathieu plan". There are exactly three legitimate operator-level routes, each needing a different explicit approval:**

1. **Temporary live-testing (recommended for Pierre's stated goal, brand creation only):**
   - Who: whoever controls the takatak.ca deployment environment (the platform operator / deployer — NOT a workspace dashboard user).
   - Where: server env vars, then redeploy/restart: `SOCIAL_BRAND_TEST_CLIENT_IDS=<the workspace client UUID for the Matthieu Wallace Barnard workspace>` and `SOCIAL_BRAND_TEST_ALLOWANCE=<number 1–100, e.g. 12 for the 12 restaurant brands>`.
   - File: `takatakca/takatak-v1/src/lib/billing/social/brand-allowance.ts`, function `testBrandAllowance`.
   - Effect: that workspace alone can create up to that many brands while blocked, without touching Stripe, subscription, or persisted plan. Remove the vars to restore normal allowances (brands over allowance then freeze, not delete).
   - Limit: does NOT unlock posts, analytics, LinkedIn/X connections, reports, teams, or API. For full Social test results, a paid plan is still required.
   - Approval still needed from Pierre (as platform operator decision): the exact client UUID to allowlist, the exact allowance number, and confirmation that this is a temporary test (with a removal date), because this is a deployment env change, not a dashboard click.

2. **Real paid plan (full Social access):**
   - Where: dashboard Plans & billing → choose a PAID_CHECKOUT_PLAN_CODES plan (Essential 1 brand, Starter 5/10, Advanced 15/25/50) → Stripe checkout → webhook applies it.
   - For 12 brands, Advanced 15 is the smallest plan that covers them (113.24 CAD/month monthly, 101.92/month annual equivalent). Essential (1 brand) and Starter 10 (10 brands) do NOT cover 12.
   - Approval needed: Pierre (and Matt for budgets, per standing rules) choosing the plan + billing cycle, and the Owner completing checkout. The agent must NOT charge a card without payment approval.

3. **Platform code change (a genuinely new $0 plan, affecting all workspaces on that deployment):**
   - Where: edit `takatakca/takatak-v1/src/lib/billing/social/plan-catalog.ts` (add a new plan entry + add its code to PAID_CHECKOUT_PLAN_CODES), create a matching $0 Stripe Price, set its env Price ID, redeploy, and verify with `scripts/verify-social-stripe-webhook.ts`.
   - This is a product pricing change, not a workspace setting. It needs Pierre's EXPLICIT approval as a platform change, naming the new plan code, price ($0), brand allowance, and whether it is for all workspaces or scoped — and it must be reviewed for the effect on paying clients, because it would be a new public/self-serve plan, not a private "Mathieu" plan.
   - What is NOT legitimate and must NOT be done: inventing a "Mathieu plan" in the dashboard (no such feature), submitting a social_custom Stripe subscription and expecting the webhook to apply it (it skips it), presenting social_unsubscribed as a free plan (code forbids it), editing the production database by hand to set a plan (SOCIAL_PAYMENT_CONFIRM.md: "Do not edit production by hand"), or using the non-production connection dev bypass in production.

## 7. What still needs Pierre's explicit approval before any code change

1. Confirm who the platform operator is: Pierre himself, Matthieu Wallace Barnard, or a third-party deployer — because routes 1 and 3 above require that person's env/code access, and the code names neither Pierre nor Matthieu as platform owner.
2. Choose a route from §6 (test env override vs paid Advanced 15 vs platform code change) — do NOT proceed on a vague "oui" alone, because the three routes have different scopes, costs, and effects on other workspaces/clients.
3. If route 1: the exact workspace client UUID to allowlist and the exact allowance (e.g. 12), plus a removal date for the test vars.
4. If route 2: plan + cycle (Advanced 15 monthly vs annual) and who completes checkout (Owner) — plus Matt budget approval per standing rules.
5. If route 3: new plan code, $0 price, brand allowance, scope (all workspaces vs scoped), and a review of paying-client impact.
6. Confirm the owned-brands registry question separately: the code's ownedBrands list is empty and the registry is explicitly "not a legal ownership registry" with all statuses UNKNOWN_NEEDS_AUDIT — so brand ownership for the test brands must be confirmed from Drive/registry evidence, not assumed from code, before any "our brands" showcase or resell claim is published.

## 8. Files / anchors for the coordinator filing pass

- This report: ~/workspace/github-takatakca-complete-read-2026-10-29.md (local only, no Drive/GitHub push by this agent, per task).
- Master occupancy row: GitHub / takatak.ca platform, IN 22:01 EDT → OUT (to be filled on release) 2026-10-29, signed SOCIO, Agent Lévesque.
- No repo was edited, no plan created, no price changed, no live write made in this pass. All evidence is from GitHub read tools (get_me, search_repositories, search_code, get_file_contents) on takatakca/takatak-v1 at commit ref e9b66c3854e4094ff298d4881df0655c3ff45412 (the ref returned by the file reads).

Signed: SOCIO, Agent Lévesque.
