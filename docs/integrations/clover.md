# Clover: real menu, Clover checkout, order in the register (branch `clover-direct`)

> **Pour le propriétaire (FR)** — Le site garde exactement sa mise en page. Chaque produit affiché est maintenant le
> vrai produit Clover : vrai prix, vraies options (sauces, « en trio », extras…), vraie photo. Le client choisit ses
> options dans la fiche du produit, ajoute au panier, puis paie sur la page sécurisée de Clover. La commande arrive
> dans la caisse Clover (billet imprimé) et sur la tablette cuisine Food Hub. Le site ne voit jamais la carte.
> Ce qu'il vous reste à faire : section 5 (clics Clover) et section 4 (où héberger).

## 1. What changed for the customer

| Before (AI demo data) | Now |
|---|---|
| Names written by the site, Uber prices (Clover × 1.20), a fake "20 % off" | Same names and places; **Clover's in-store price** |
| Category stock photos | **The real photo of each item** (168 of 175; 7 keep the category photo) |
| Options without prices, one choice per group | **Clover's option groups**: required ones first, min / max, several choices where Clover allows, option prices |
| "Finish my order" → phone | **"Payer avec Clover"** → Clover's secure page → back to the order page |

The layout, rails ("Most ordered", promos…), item sheet, cart and scroll are unchanged. Delivery stays on Uber Eats /
DoorDash / Skip; online payment is for pickup.

## 2. Decisions (official Clover sources)

1. **Clover Online Ordering cannot receive a cart from another site.** Clover publishes no per-item link and no API
   to fill its online-ordering cart (task 10 also found its pages refuse to be framed). So the site keeps its cart and
   pays with **Clover Hosted Checkout**:
   [overview](https://docs.clover.com/dev/docs/hosted-checkout-api) (labelled *North America — United States and
   Canada*) · [create a session](https://docs.clover.com/dev/docs/creating-a-hosted-checkout-session) ·
   [API reference](https://docs.clover.com/dev/reference/createcheckout) ·
   [redirects](https://docs.clover.com/dev/docs/redirecting-customers) ·
   [webhook + signature](https://docs.clover.com/dev/docs/ecomm-hosted-checkout-webhook).
2. Hosted Checkout has **no modifier field** and does not use the Clover inventory or its taxes. Each cart line is sent
   as one Clover line: unit price = item + options, the options in the line note (the kitchen reads them on the
   ticket), `itemRefUuid` = the Clover item id, and the taxes (TPS 5 % + TVQ 9.975 %, or the merchant's own default
   rates) on every line. The session lasts 15 minutes.
3. The webhook gives a payment id and the checkout session id; Clover has no API to read a session. After the
   APPROVED webhook the site finds the Clover order of that payment, titles it **`🌐 Site web · PPP-AB12C · Marie`**
   with a pickup / paid note, then fires **one** print (`print_event`: the order printer, and the KDS when it is set
   as order printer). An order already titled is never printed again. The Food Hub kitchen tablet recognises website
   orders by that title (Food Hub task 10, branch `clover-website-menu`).
4. No Canada-specific checkout release appears in Clover's developer announcements
   ([checked 2026-10-08](https://docs.clover.com/dev/docs/release-notes-announcements)); the Hosted Checkout pages
   cover Canada.

## 3. How it works (files)

| Piece | File |
|---|---|
| Real Clover menu (175 items, 17 categories, 218 option groups; staff / in-store / archived left out) | `src/data/clover/inventory.snapshot.json` ← `npm run clover:snapshot` |
| **Which Clover item fills each site slot** (owner-editable) | `src/config/clover-item-map.ts` |
| Real photos, 1200 + 400 px WebP | `public/menu/clover/` ← `npm run clover:photos -- <folder>` |
| Clover data applied to the site's items | `src/data/clover/overlay.ts`, `src/data/menu.ts` |
| Option rules (min / max / prices) | `src/lib/modifiers.ts`, `src/components/order/item-sheet.tsx` |
| Pricing, checkout body, webhook signature | `src/lib/integration/providers/clover/checkout.ts` |
| Clover calls (live menu, taxes, checkout, title, print) | `src/lib/integration/providers/clover/api.server.ts` |
| Order flow | `src/lib/orders/order-service.ts` → `providers/clover/orders.ts` → `providers/clover/webhook.ts` |
| Tests | `src/lib/integration/__tests__/clover.test.ts` |

The checkout is priced on the server from the **live** Clover menu when `CLOVER_API_TOKEN` is set (5-minute cache),
otherwise from the committed snapshot. An item 86'd in Clover is refused at checkout.

## 4. Where to host (important)

The site is TanStack Start: the checkout and the webhook are **server functions**. They hold the Clover keys, so they
need a server. **A static copy on shared hosting (the current MochaHost files) cannot take orders**: there is no
server to keep the keys and receive Clover's webhook.

Run it on:
- **Coolify on the owner's VPS** (fits the migration plan, same server as Food Hub): Node 22, `npm ci && npm run
  build`, start `node .output/server/index.mjs`, one instance, HTTPS on `pppmtl.com`. Set the variables below in
  the app's environment in Coolify.

(Lovable hosting is NOT an option: the owner refused Lovable categorically on 2026-10-26. GitHub → Coolify is the
only route.)

Orders are stored in PostgreSQL (`DATABASE_URL`): the order before Clover's page opens, the payment when Clover's
signed webhook arrives, and the title + single print as a kitchen task that is retried after an outage or a restart.
Production checkout stays off without `DATABASE_URL` or without `CLOVER_API_TOKEN`.

### Server variables (never in the browser, never in git)

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgres://ppp_app:…@<db>:5432/pppmtl`, the limited role (docs/DB_ROLLOUT.md). Required for real cards. |
| `CLOVER_MERCHANT_ID` | the restaurant's Clover merchant id |
| `CLOVER_ECOMM_PRIVATE_KEY` | private key of the Ecommerce token of type **Hosted checkout** |
| `CLOVER_WEBHOOK_SECRET` | the Hosted Checkout webhook **signing secret** |
| `CLOVER_API_TOKEN` | REST token with Inventory read, Orders read + write, Payments read, Merchant read (live menu, then title + print of each paid order). See the note in section 5. |
| `CLOVER_ENV` | `sandbox` while testing on a Clover test merchant; leave empty for production |
| `PUBLIC_SITE_URL` | optional, default `https://pppmtl.com` (Clover's return links) |
| `CLOVER_TAX_RATES` | optional, e.g. `[{"name":"TPS","rate":500000},{"name":"TVQ","rate":997500}]` (names as in Clover → Taxes) |
| `CLOVER_PRINT_WEB_ORDERS` | `off` only if Clover already prints these orders by itself (then you would see two tickets) |

## 5. What the owner clicks in Clover (production merchant, clover.com)

1. **Ecommerce key** — Settings (gear) → *View all settings* → **Ecommerce** → *Ecommerce API tokens* → *Create new
   token* → Integration type **Hosted checkout** → *Create token*. Copy the **private** key → `CLOVER_ECOMM_PRIVATE_KEY`,
   and the merchant id shown → `CLOVER_MERCHANT_ID`. ([Clover help](https://www.clover.com/en-US/help/create-an-api-token) ·
   [docs](https://docs.clover.com/dev/docs/create-ecommerce-api-tokens)) Your login needs the permission
   *Access Authorizations → Initiate a Token Request*.
2. **Hosted Checkout page** — Settings → *View all settings* → **Ecommerce** → **Hosted Checkout**:
   - *Webhook URL*: `https://pppmtl.com/api/public/webhooks/clover` → **Generate** → copy the **Signing secret** →
     `CLOVER_WEBHOOK_SECRET` → Save. (`…/webhooks/provider?provider=clover` works too.)
   - *Redirect URLs*: **leave empty** (the dashboard values override the site's own return links).
   - Logo / colours: PPP's, as you like. Tips: off (pickup).
3. **Taxes** — Settings → Taxes: TPS 5 % and TVQ 9.975 % must exist (Hosted Checkout only charges rates the merchant
   has).
4. **REST token** (`CLOVER_API_TOKEN`) — Settings → *View all settings* → **Business Operations** → *API tokens* →
   *Create new token* with Inventory read, Orders read + write, Payments read, Merchant read.
   **Decision for the owner:** Clover documents these dashboard tokens for testing and asks for OAuth tokens in
   production ([docs](https://docs.clover.com/dev/docs/gdp-create-merchant-specific-api-token)). If Clover refuses or
   expires it, the next step is to let Food Hub do the "title + print" step with the Clover app it already has on this
   merchant (auto-refreshed OAuth token). Without any REST token, payments still work and the order is in Clover's
   Orders app, but it is **not printed automatically** and not on the Food Hub tablet.
5. **Test** (5 minutes): order one small item on the site, pay with a real card, check the ticket at the register
   (title `🌐 Site web · PPP-…`), check the Food Hub tablet, then refund it in Clover. If two tickets print, set
   `CLOVER_PRINT_WEB_ORDERS=off`.

## 6. Owner: change which Clover item a site slot shows

Open `src/config/clover-item-map.ts`, find the slot (`site:` is the id in the site's links), replace `clover:` with
the other item's id (Clover → Items → open the item: the id is the end of the page address) and `cloverName:` with its
exact Clover name. Run `npx vitest run`: the test says if an id does not exist or is used twice. After changing
prices or options in Clover, run `npm run clover:snapshot -- --api` (with `CLOVER_API_TOKEN` and `CLOVER_MERCHANT_ID`
set) so the site shows them too; the checkout already uses the live Clover prices.

## 7. To review on the site (content, not changed here)
- The three "offers" no longer say "20 % off" (that was the Uber promotion); they show the real Clover price.
- English descriptions are the site's earlier copy (French ones are Clover's own); some may need a read.
- Outdated items seen on the live site (not touched): Hochelaga shown "OPEN", an old phone number in the 450 area,
  and the DoorDash link to store 28040070.
