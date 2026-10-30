# Handoff: branch `clover-direct` (PPP site → real Clover menu → Clover Hosted Checkout)

Living note, updated as the work goes. Last update: 2026-10-08 (task 12 of the Food Hub task board).

## Goal (owner, 2026-10-08)
- Keep pppmtl.com exactly as it is: same layout, rails, sections, scroll and item sheet. No per-item pages.
- Replace the AI-generated product data with the real Clover items: real names (in the site's current writing
  style), real prices, real modifiers nested in each item, real photos.
- A reviewable map file says which Clover item fills each site slot, so the owner can swap items later.
- Item click → existing item sheet → customise with the real Clover modifiers (e.g. "Pita → en trio") → cart
  → pay on Clover's checkout. The order lands in the Clover register (ticket + KDS); the Food Hub kitchen tablet
  mirrors it (Food Hub task 10). Card data never touches this site.

## Decisions (with the official sources)
1. **Clover Online Ordering cannot receive a cart or an item from another site.** Clover documents no per-item
   link and no API to pre-fill its online-ordering cart; its pages also refuse to be framed
   (`frame-ancestors *.clover.com`). So the site keeps its own cart and pays through **Clover Hosted Checkout**.
   - Hosted Checkout: https://docs.clover.com/dev/docs/hosted-checkout-api (labelled "North America—United States
     and Canada").
   - Create checkout: `POST /invoicingcheckoutservice/v1/checkouts`, headers `X-Clover-Merchant-Id` +
     `Authorization: Bearer <ecommerce private key>`; body `customer`, `redirectUrls {success, failure, cancel}`,
     `shoppingCart.lineItems[{name, price, unitQty, note, taxRates}]` (no `itemRefUuid`: Clover refuses it next to name + price). Session lasts 15 minutes.
     https://docs.clover.com/dev/docs/creating-a-hosted-checkout-session · https://docs.clover.com/dev/reference/createcheckout
   - Hosted Checkout has **no modifier field** and does not use the Clover inventory or its default taxes, so each
     cart line is sent as one Clover line: unit price = item + chosen options, options listed in the line note,
     Québec taxes as `taxRates`.
   - Webhook: `Clover-Signature: t=…,v1=…` (HMAC-SHA256 of `t.rawBody` with the signing secret); body gives the
     payment id, status APPROVED / DECLINED and the checkout session id. No GET endpoint exists for a session.
     https://docs.clover.com/dev/docs/ecomm-hosted-checkout-webhook · https://docs.clover.com/dev/docs/redirecting-customers
   - No Canada-specific "checkout" release was found in Clover's developer announcements
     (https://docs.clover.com/dev/docs/release-notes-announcements, checked 2026-10-08).
2. **Ticket and KDS:** Hosted Checkout payments create a Clover order but Clover does not document printing it.
   After the APPROVED webhook the site (with a REST token) finds the order from the payment, writes a title
   `🌐 Site web · <number> · <first name>` and a note (pickup, paid online, phone), then fires one
   `print_event` (order printer / KDS). The "Site web" title is also what the Food Hub tablet mirror recognises.
3. **Prices:** the static catalog shows Clover's in-store prices (the old site showed the Uber prices, Clover ×
   1.20). The server re-prices every checkout from the live Clover inventory when `CLOVER_API_TOKEN` is set,
   otherwise from the committed Clover snapshot.
4. **Pickup only** through Clover for now (no courier is wired for site orders).

## Status
- [x] Research (above). Mapping analysis: all 175 site items map to a Clover item (163 same name, 12 near-name,
  e.g. Clover's "(P. FRITS)" staff suffix). 168 have one of the owner's photos; 7 keep the site's category photo.
- [x] `src/lib/integration/providers/clover/catalog.ts`: pure normaliser (internal categories / hidden / variable
  price left out, cents, option slugs, display names for groups and options).
- [x] Snapshot (`src/data/clover/inventory.snapshot.json`, 175 items / 17 categories / 218 option groups),
  map (`src/config/clover-item-map.ts`, 175/175), photos (`public/menu/clover/`, 168 items, 1200 + 400 px webp).
- [x] Overlay `src/data/clover/overlay.ts` applied in `src/data/menu.ts`: Clover price, options, photo,
  availability, French description from Clover; site names/rails/placement unchanged. Offers read the real
  item price (their "20 % off" wording was removed: it was the Uber promo). 4 site typos fixed (ids unchanged).
- [x] `src/lib/modifiers.ts` (min/max, multi-choice as "a,b", option prices) + item sheet + cart re-pricing.
- [x] Clover provider in `src/lib/integration/providers/clover/` (config, pure checkout logic, API calls, order
  adapters, menu adapter, webhook) + order service (NDG → Clover, pickup only, `paymentUrl`) + checkout redirect +
  return page `/orders/$orderId?paid=1`.
- [x] Tests `src/lib/integration/__tests__/clover.test.ts` (18; full suite 79/79), lint 0 errors, `vite build` OK,
  tsc clean except the pre-existing `src/routes/__root.tsx` error (on main too).
- [x] Owner doc `docs/integrations/clover.md` (hosting, env vars, Clover clicks, how to swap a slot).
- [ ] Visual check of the item sheet in a browser (dev server).

## Important constraint
The build targets Cloudflare Workers (Nitro, Lovable hosting): the in-memory order store is per isolate, so the
Clover webhook works without it (payment id → Clover order → title + note + one print). The return page shows
"paid" even when the order is not in memory (`?paid=1`).

## Open decision (owner)
`CLOVER_API_TOKEN` (live menu, title + print): Clover documents dashboard API tokens for testing and OAuth tokens for
production. If Clover refuses it, move the "title + print" step to Food Hub (it holds the merchant's OAuth token).

## Next step
Owner: section 5 of docs/integrations/clover.md (Ecommerce key, Hosted Checkout webhook, REST token), choose the host
(section 4), set the variables, then one real test order + refund. Code: open the PR
https://github.com/takatakca/pppmtl/compare/main...clover-direct?expand=1 (Lovable syncs main on merge).
Files to read first: docs/integrations/clover.md, `src/lib/integration/providers/clover/webhook.ts`.

## 2026-10-30 — Phone accounts + Interac e-Transfer (branch `feature/phone-verify-accounts`)
Clover Hosted Checkout stays the **card** path exactly as above (pickup, NDG). A second path exists now: **Interac
e-Transfer** through TAKATAK Food Hub (`src/lib/integration/providers/foodhub/`), gated by `FOODHUB_INTERAC_ENABLED`
and shown with its fee in the total before the customer confirms. Customer identity (phone verification = account)
also comes from Food Hub; the site keeps no customer database. Guide: `docs/integrations/foodhub-customers-and-interac.md`.
