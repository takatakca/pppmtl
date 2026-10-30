# NOTE FOR THE DEV (PLATFORM OPERATOR MATHIEU) — TAKATAK.CA UNLOCK FOR TONIGHT

**Signed: SOCIO, Agent Lévesque.**
**READ-ONLY PREP ONLY — NO LIVE CHANGE, NO BYPASS, NO ACTIVATION BY THIS NOTE.**
**Pierre, 2026-10-29 22:15 EDT: for the moment it is just to create his brands and put his accounts on the system so his dev can unlock and finalize his work tonight.**

## 1. CONTEXT IN ONE PARAGRAPH

Workspace: "Matthieu Wallace Barnard's Workspace", signed in as Owner Matthieu Wallace Barnard, login email pppmtl.com@gmail.com confirmed on the account. Workspace state, verified by read-only inspection 2026-10-29 21:49–21:52 EDT: Businesses / Brands 0 ("No brands in this workspace"), Locations 0 ("No business locations yet"), Clients page could not be viewed (showed "Preparing page…" then redirected to the dashboard root on three attempts — UNVERIFIED, not claimed empty). Social is locked. Brand creation was rejected 2026-10-29 21:52 EDT with exactly: "This workspace cannot add brands while Social access is locked." The lock is intentional, per Pierre 2026-10-29 22:15 EDT, for two reasons: (1) to make people pay, and (2) because the platform is not ready for deployment. The dev told Pierre to put his accounts in to do his tests, and the dev is working on it tonight. This note is the exact minimum the dev needs to activate for tonight — it does not activate anything itself.

## 2. EXACT MINIMUM ACTIVATION FOR TONIGHT — FROM CODE EVIDENCE

Source: takatakca/takatak-v1, `src/lib/billing/social/brand-allowance.ts`, function `testBrandAllowance` — described in code as "Temporary live-testing capacity for explicitly allowlisted workspaces. Does not modify subscriptions, Stripe, or a workspace's persisted plan. Remove the environment variables to restore normal brand allowances."

Dev action, in the server deployment environment (not in the dashboard UI — the dashboard offers no way to do this):

1. Set server environment variable:
   `SOCIAL_BRAND_TEST_CLIENT_IDS=<workspace client UUID>`
2. Set server environment variable:
   `SOCIAL_BRAND_TEST_ALLOWANCE=12`
3. Redeploy / restart the deployment so the new environment takes effect.
4. Reload https://takatak.ca/dashboard/brands and confirm brand creation is accepted (no Social-lock message). If the lock message still appears, stop and report it — do not retry in a loop, do not bypass.

**Workspace client UUID — STILL MISSING, DO NOT INVENT ONE:** the workspace client UUID is NOT visible anywhere in the dashboard UI. Pages checked 2026-10-29 22:13–22:14 EDT, all read-only: Dashboard, Account settings (Account, Access, API, Plans and billing tabs), Team & Permissions, User management, Admin → Settings, profile menu, and Switch workspace / select-client. None showed an ID/UUID, and none of the visited page URLs contained a UUID segment. The dev/operator must supply this UUID from the deployment/database side. No UUID is written in this note, and none must be guessed.

**Effect of this activation:** that workspace alone can create up to 12 brands while Social remains blocked, with no Stripe change and no subscription change. It is a temporary live-testing allowance, not a plan, not a subscription, and not a price change.

**Limit — read this before promising full Social test results:** this activation lifts ONLY the brand-count gate. Posts, analytics, LinkedIn/X connections, reports, teams, and API still resolve from the blocked lifecycle to unsubscribed. Creating test brands therefore does NOT unlock full Social test results (results, analytics, and backend connections for publishing/connected accounts still require a restored Social subscription). Do not present brand creation alone as a full Social test.

**Removal — 2026-11-02:** remove BOTH environment variables on 2026-11-02 and redeploy/restart. Normal brand allowances then return. Brands created in over-allowance then freeze; they are not deleted. This window is a 5-day test/promotion window only (2026-10-29 to 2026-11-02), not a permanent price or entitlement change. No dashboard "Mathieu plan" at $0 exists in code and none is created by this note: `PAID_CHECKOUT_PLAN_CODES` in `plan-catalog.ts` is Essential + Starter + Advanced only, a social_custom subscription is skipped by the Stripe webhook, and social_unsubscribed must never be presented as a free plan.

## 3. CREATION ORDER ONCE UNLOCKED — PPP FIRST

Source: ~/workspace/takatak-brand-creation-pack-2026-10-29.md (298 lines). One brand at a time, in inventory order. Brand first, then locations attached to that brand, then clients (only once the Clients page actually loads), then social connections/publications last, only after Social billing is restored and a brand is active and selected. Do not resubmit PPP as a duplicate until the brands list has been reloaded after unlock and confirmed still absent (PPP was already submitted once, 2026-10-29 21:52–21:53 EDT, and rejected only by the lock).

### 3.1 PPP Pizzeria — BRAND 1 — FULLY READY (subject only to unlock)

- Brand name: PPP Pizzeria
- Website: https://www.pppmtl.com
- Public phone: 450-999-4999
- Brand status: active
- Country: Canada
- Timezone: America/Toronto
- Brand login email (identification only — the takatak.ca brand form has NO email field): pppmtl.com@gmail.com, confirmed on the signed-in Owner account
- Locations, both verified:
  - NDG (operational, first): 6280 av. Somerled, Montréal, QC H3X 2B6, daily 4 PM–3 AM
  - Saint-Léonard: 5839 rue Jean-Talon E, Montréal, QC H1S 1M4, daily 11 AM–11 PM
- Legal name and Category: leave blank (unverified, never invented)

### 3.2 The other 11 — ONLY after their missing verified item is confirmed, never filled by a guess

- **Po Poulet** — MISSING: NDG 6280 vs 6284 ruling + NDG hours (never PPP hours, never DoorDash store hours). Verified: site https://popoulet.ca, login popoulet.ca@gmail.com (popouletmtl mapping unconfirmed, do not use), Saint-Léonard 5839, fiche hours 11 AM–11 PM to re-verify live.
- **Pi Pita** — MISSING: Pi Pita-specific live hours. Verified: site https://pipita.ca, login www.pipita.ca@gmail.com, NDG 6280, Saint-Léonard 5839 (GBP SL verification pending, Matt).
- **Bin Molle Bin Dure (BMBD)** — MISSING: BMBD-specific hours + NDG live re-verification. Verified: site https://bmbd.ca, login bmbd.ca@gmail.com, Saint-Léonard 5839. Separately blocked: 3583 ruling, Facebook rename (needs current Facebook password from Matt, never try one).
- **Café Bolon** — MISSING: canonical site (bolon.ca vs boloncafe.ca, undecided — do not publish either until Pierre/Matt confirm) + Bolon-specific hours. Verified login: boloncafe.ca@gmail.com. Do NOT create or assert a "Teracium" brand.
- **Viennoise / Gâteau Montréal** — MISSING, publishing-blocked: current address + hours (Matt decision pending, in writing). Verified: site https://viennoise.ca, login viennoise.ca@gmail.com (gateaumtl unconfirmed, do not merge).
- **Taco Montréal** — MISSING: Taco-specific hours + live address verification. Verified: site https://tacomontreal.ca, login tacomontreal.ca@gmail.com.
- **O'Crêpe** — MISSING: O'Crêpe-specific hours. Verified: site https://ocrepe.ca, login ocrepe.ca@gmail.com, NDG 6284 av. Somerled (O'Crêpe exception, not 6280 — do NOT "correct" it to 6280), Saint-Léonard 5839.
- **Nutrition Shake, Saint-Léonard only** — MISSING: Saint-Léonard hours. Verified: site https://nutrishake.ca, login nutrishake.ca@gmail.com (nutritionshake.ca is a different account, do not conflate). NDG IS SUSPENDED — do NOT touch, create, or clone to NDG, ever, while suspended.
- **Mythos & Go** — MISSING: website, locations, hours (no dedicated fiche on file). Verified login: mythosgo.ca@gmail.com.
- **Pizza Inntime** — MISSING: locations, hours (no dedicated fiche on file). Verified: site https://inntime.ca, login inntime.ca@gmail.com.
- **Place Afrique** — MISSING: locations, hours, website confirmation. Verified login: placeafrique.ca@gmail.com, site https://placeafrique.ca to re-verify before publishing.

## 4. ACCOUNT LINKING FOR THE MOMENT — MINIMUM CHECKLIST, PPP ONLY, NOT ALREADY LINKED

Nothing below is claimed as already linked in takatak.ca. The workspace has 0 brands, so nothing can be attached yet. Once PPP exists as a brand in the workspace, these already-existing accounts (from filed notes only, no live link claimed) are the checklist to link to that brand, one at a time, in this order:

- Facebook, NDG: https://www.facebook.com/people/PPP-Montreal-Notre-Dame-De-Grâce-/61595655663633/ — page ID 61595655663633
- Facebook, Saint-Léonard: https://www.facebook.com/pppmtl.com1 — "PPP Pizzeria Montréal -Saint Léonard-"
- Facebook sister link: NDG ↔ Saint-Léonard via About → Links (separate location pages, never merged)
- Instagram: @ppp_pizzeria — https://www.instagram.com/ppp_pizzeria — NOTE: account LOCKED, owner-only identity verification pending; do NOT attempt a link that requires a signed-in Instagram session until Pierre completes recovery
- Threads: @ppp_pizzeria — https://www.threads.com/@ppp_pizzeria — sign-in state to re-confirm separately after Instagram recovery, do NOT assume locked
- Pinterest: https://ca.pinterest.com/pppmtl — NDG + Saint-Léonard boards, 8 real combo pins each, no price filed
- Twitch: https://www.twitch.tv/pppmtl_com
- Snapchat: username pppmtl.com — https://www.snapchat.com/add/pppmtl.com
- YouTube: https://www.youtube.com/@pppmtl-com — channel ID UC_oa69aDwtDFKKGx-y2E7RA
- TikTok: https://www.tiktok.com/@pppmtl.com — browser bio route PARKED by Pierre; phone-app paste only
- X: @pppmtlnord — https://x.com/pppmtlnord — recovery PARKED, rate-limited; do NOT touch @takatakca (TAKATAK MARKETING, intact and separate)
- Linktree: https://linktr.ee/pppmontrealnord
- Setmore: https://pppmtl.setmore.com
- Yelp: Saint-Léonard dashboard https://biz.yelp.com/biz_info/e82AN3H7wAhgkOfITz5vmA (91%); NDG dashboard https://biz.yelp.com/biz_info/vXRUD-XTZ239UBZ2sIsCqA/ (55%, pending moderator approval) — Yelp Business work PARKED, read-only only until Pierre un-parks
- Bing Places: Saint-Léonard listing ID 029b9016-1f6d-4df5-9aeb-263b2c6821b6 (PIN emailed, locked); NDG listing ID 1b17a93b-5538-4df5-9aeb-263b2c6821b6 (needs verification, locked)
- TripAdvisor: NDG locationId 34761146 (claim submitted, Verify pending); Saint-Léonard listing created/submitted, under review, no public URL yet
- Commerce / catalogues (for later, NOT a Shop change without Pierre's specific approval): Commerce account "PPP Montreal Nord" ID 7519711328146654; catalogues 357353150181852 (189 products) and 4607139139566501 (30 products); Shop ID 1190969998934736 ("Unpublished changes" since 2025-04-04 — publish decision pending Pierre, do NOT publish from this note)

Link only what the brand record and the platform actually support at link time, from verified info + real photos only, never AI content on restaurant brand material, never invent a price, hours, menu, image, link, email, or location. If a link requires a signed-in session that is locked or parked (Instagram, X, TikTok, Yelp), leave that row unchecked and report it — do not work around the lock or the park.

## 5. EXPLICITLY NOT INCLUDED — DERIA / DIRIA

Pierre mentioned "deria" again 2026-10-29 22:15 EDT, and the same word appeared, unclarified, 2026-10-28. **No verified brand, email, address, hours, or social account for a Deria/Diria brand exists on file.** Therefore:

- Do NOT create a Deria/Diria brand entry in takatak.ca.
- Do NOT invent its details (name spelling, email, address, hours, website, social handles).
- Do NOT merge it with any existing brand.

**Clarification question for Pierre:** what is the full brand name (Deria or Diria, exact spelling), what is its brand email, what are its addresses and hours, and is it a new brand to add to the 12-brand pack or a different name for an existing brand? Until Pierre answers, Deria/Diria stays out of the creation order entirely.

## 6. WHY — AND THE 2026-11-02 REVERT, IN WRITING

Why this note exists, signed SOCIO, Agent Lévesque: Pierre is the boss, takatak.ca is his master dashboard, and he wants to test the Social product with his own restaurant brands before reselling it — results out, analytics out, backend connections out — with his dev finalizing the platform work tonight. The dev put the Social lock in place on purpose (pay gate + not ready for deployment) and told Pierre to put his accounts in for tests. This note gives the dev the smallest legitimate activation that lets those test brands be created tonight, without pretending the Social module is fully unlocked and without changing any price, plan, or subscription.

Test/promotion window: 5 days, 2026-10-29 to 2026-11-02. On 2026-11-02, remove BOTH environment variables (`SOCIAL_BRAND_TEST_CLIENT_IDS` and `SOCIAL_BRAND_TEST_ALLOWANCE`) and redeploy/restart. Normal allowances return; over-allowance brands freeze, they are not deleted. After 2026-11-02, brand creation again requires a restored Social subscription (paid plan via Stripe checkout, webhook-applied), and full Social results (posts, analytics, connections) were never unlocked by this test allowance in the first place.

**Signed: SOCIO, Agent Lévesque.**
**Preparation only. No brand created, no setting changed, no gate bypassed, no password, code, or transiently supplied phone number or date of birth recorded in this note.**
