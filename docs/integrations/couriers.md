# Couriers for website delivery orders: DoorDash, Uber, Skip, own driver

> **Pour le propriétaire (FR)** — Quand un client paie une livraison sur pppmtl.com (repas + 5 $ de livraison +
> pourboire, via Clover), c'est **le restaurant** qui choisit le livreur. Sur la tablette de la cuisine, ouvrez
> **https://pppmtl.com/admin/dispatch**, touchez la commande payée, puis **« Find a driver »** : DoorDash, Uber,
> SkipTheDishes et « My driver » s'affichent côte à côte avec le prix, la disponibilité, l'heure d'arrivée au
> restaurant et chez le client, et les étiquettes **CHEAPEST** (moins cher) / **FASTEST** (plus rapide). Touchez
> **Book** : la livraison est réellement créée chez DoorDash ou Uber, avec un lien de suivi. Skip n'a pas d'API
> publique : on réserve dans le portail Skip, puis on l'indique ici. « My driver » = votre livreur, sans frais.
> Ce qu'il vous reste à faire : sections 3 et 4 (comptes DoorDash Drive et Uber Direct, puis 10 variables dans
> Coolify). Sans ces clés, les cartes affichent « Not connected » — jamais un faux prix.

## 1. What staff do on the tablet

1. Sign in once: `https://pppmtl.com/admin/sign-in?next=/admin/dispatch` (the 8-hour admin session, same credential
   as the orders monitor). Type your first name in **Your name** (top right): it is recorded with each booking.
2. The left column lists website delivery orders, newest first. **NEEDS A DRIVER** (yellow) = paid, no courier yet.
   An order still waiting for Clover's payment says so and cannot be dispatched.
3. Tap the order, check the address and phone, set the **courier tip** if you want (pre-filled with the customer's
   tip), then **Find a driver**. Four cards appear:
   - **DoorDash** and **Uber**: live price (fee charged to the restaurant), "Courier available now" or why not,
     pickup time (courier at the restaurant) and drop-off time, quote expiry (DoorDash 5 min, Uber about 15 min).
     **CHEAPEST** = lowest fee, **FASTEST** = earliest courier arrival at the restaurant (ties: earliest drop-off).
     **CLOSEST** appears only if a provider reports how far its courier is; neither DoorDash's nor Uber's quote
     includes that before booking, so today it never shows on quotes. After booking, the screen shows how far the
     courier is from the restaurant when the provider sends its location.
   - **SkipTheDishes**: no price (see section 5). **Open Skip portal**, book there, then **I booked it on Skip**.
   - **My driver**: no fee. Tap a saved driver or type name + phone, then **Assign my driver**. If texting is set up
     (Twilio), the driver gets one SMS with the pickup, the customer's name/phone and the drop-off.
4. **Book DoorDash / Book Uber** creates the real delivery. The order then shows the status (looking for a courier →
   courier on the way to the restaurant → at the restaurant → on the way to the customer → delivered), the courier's
   name, masked phone and vehicle, ETAs, cost, and a **Tracking** link. Status updates arrive by webhook; **Refresh
   status** asks the provider directly.
5. **Cancel courier** asks DoorDash/Uber to cancel. If they refuse (courier already has the food), the screen says to
   call their support. After a cancel or a refused booking, **Find a driver** works again; earlier tries stay listed
   under "Earlier dispatches".
6. Own driver / Skip: tap **Picked up** and **Delivered** yourself (no API reports them).

Only one live courier per order: a second tablet pressing Book at the same moment gets "already being booked".

## 2. How it works (files)

| Piece                                                        | File                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Tablet screen                                                | `src/routes/admin.dispatch.tsx`                                                                   |
| Server functions (each checks the admin session first)       | `src/lib/delivery/dispatch.functions.ts` → `dispatch-handlers.server.ts`                          |
| Quote / book / cancel / refresh / webhooks logic             | `src/lib/delivery/dispatch-service.server.ts`                                                     |
| Dispatch record (pure state machine)                         | `src/lib/delivery/dispatch-state.ts`                                                              |
| Storage: `ppp.orders.order_document.dispatch`, row-locked    | `src/lib/delivery/dispatch-store.server.ts`                                                       |
| DoorDash Drive v2 / Uber Direct / Skip / own driver + Twilio | `src/lib/delivery/couriers/*`                                                                     |
| Webhooks                                                     | `src/routes/api/public/webhooks/{doordash,uber}.ts` → `src/lib/delivery/webhooks.server.ts`       |
| Pickup point, Skip portal link, DoorDash locale              | `src/config/delivery-dispatch.ts` (coordinates: `src/config/delivery.ts`)                         |
| Tests                                                        | `src/lib/delivery/__tests__/` (`dispatch.pg.test.ts` = real PostgreSQL, run by CI's database job) |

**No SQL to run.** The dispatch record lives inside the existing order document; the runtime role `ppp_app` already
has SELECT/UPDATE on `ppp.orders`, and tenant row-level security applies as for every order query.

Addresses: the checkout writes `"<street>, App. <unit>, <city>, QC <postal code> — <instructions>"`
(`deliveryAddressLine`). DoorDash gets `street, city, QC postal, Canada` with the unit and instructions as drop-off
instructions; Uber gets the structured address (unit = second street line) and the restaurant's coordinates. Phones
are sent as E.164 (`+1…`). Money is CAD cents. An address or phone the site cannot read makes DoorDash/Uber
"unavailable" (own driver and Skip still work).

## 3. DoorDash Drive — owner steps

Docs: <https://developer.doordash.com/en-US/docs/drive/tutorials/get_started>,
API <https://developer.doordash.com/en-US/api/drive/>.

1. Create a DoorDash developer account at **https://developer.doordash.com** (Developer Portal) with the restaurant's
   business e-mail.
2. Developer Portal → **Credentials** (left menu) → **+** → name it → **Create Access Key** → **Copy**. It holds:
   `developer_id` → `DOORDASH_DEVELOPER_ID`, `key_id` → `DOORDASH_KEY_ID`, `signing_secret` → `DOORDASH_SIGNING_SECRET`.
   New keys are **sandbox** keys (no real Dasher, no cost): also set `DOORDASH_ENV=sandbox` so the tablet labels
   quotes "Test mode". Test a whole delivery in sandbox.
3. Request **production access** (DoorDash's "How to get production access" guide, linked from the get-started page).
   DoorDash says production access to Drive is currently restricted, with no certification timeline, and points to
   an interest form. The Canadian merchant page (below) also offers self-serve Drive On-Demand onboarding for
   restaurants. Once approved, create a production access key, replace the three values, and remove `DOORDASH_ENV`.
4. Webhook (one per environment): Developer Portal → **Webhooks** → **+** → URL
   `https://pppmtl.com/api/public/webhooks/doordash`, authentication **Basic**, value = a long random string (for
   example the output of `openssl rand -hex 32`; or let the portal generate it). Put **the exact same value** in
   `DOORDASH_WEBHOOK_SECRET` (at least 16 characters). DoorDash sends it in the `Authorization` header; the site
   compares it in constant time and answers 401 otherwise, 503 while the variable is missing.

Cost (DoorDash Canada, <https://merchants.doordash.com/en-ca/products/drive-on-demand>, read 2026-10-31): "Flat fee for
delivery orders $8.50", no commission, no sign-up or subscription fee; tips go 100 % to the Dasher. The quote on the
tablet is the real price for that order; the courier tip is added on top (DoorDash bills fee + tip to the restaurant).

## 4. Uber Direct — owner steps

Docs: <https://developer.uber.com/docs/deliveries/get-started>, auth
<https://developer.uber.com/docs/deliveries/guides/authentication>, webhooks
<https://developer.uber.com/docs/deliveries/guides/webhooks>.

1. Sign up at **https://direct.uber.com** (Uber Direct dashboard) with an Uber account for the restaurant. Account
   creation is only open in some regions; if it is not offered, ask Uber for a Direct account manager.
2. Dashboard → **Developer** tab: copy **Customer ID** → `UBER_DIRECT_CUSTOMER_ID`, **Client ID** →
   `UBER_DIRECT_CLIENT_ID`, **Client secret** → `UBER_DIRECT_CLIENT_SECRET`. While the dashboard is in **Test mode**
   (blue bar at the top) these are test credentials: no real courier; set `UBER_DIRECT_ENV=test`.
3. Add billing and switch the dashboard to production when Uber approves the account, copy the production
   credentials, and remove `UBER_DIRECT_ENV`.
4. Webhook: Dashboard → **Developer** → **Webhooks** → **Create Webhook** → URL
   `https://pppmtl.com/api/public/webhooks/uber`, events **Delivery Status** and **Courier Update** → Save. Open the
   webhook (⋯ → Edit) and copy its **Webhook Signing Key** → `UBER_DIRECT_WEBHOOK_SECRET`. The site checks the
   `x-uber-signature` HMAC-SHA256 of the raw body and answers 401 otherwise.

Cost: Uber publishes no fixed Canadian rate in its developer docs; each quote's `fee` is what Uber charges for that
delivery if booked. Uber's delivery fee includes the tip; the tablet shows fee and tip separately.

## 5. SkipTheDishes — what really exists

Skip offers **SkipGo**, a white-label courier service for orders taken on a restaurant's own website: flat fee per
order, no commission, set up with Skip's partner team and connected through Skip-approved middleware (Smooth
Commerce, Eigen, Deliverect) — <https://secretsauce.skipthedishes.com/?p=4109> (Skip's partner blog, Feb 2023; the
page itself says both "regardless if you're a Partner or not" and "currently only available for Restaurant
Partners"). Skip publishes **no public developer API** for requesting a courier, so this site cannot quote or book
Skip and never shows a Skip price. The card says "Not available — book in the Skip portal" with a link to
`https://restaurants.skipthedishes.com/user/login` (the login given by ChowNow's Skip guide — confirm it, or set
`SKIP_PORTAL_URL`). If the owner wants Skip couriers through an API, ask Skip's partner team which middleware they
support for SkipGo; that would be a separate integration.

## 6. Own driver and texting

- Saved drivers: `PPP_OWN_DRIVERS="Ali:514-555-0100;Marc:438-555-0101"` (name:phone pairs, `;`-separated). Drivers used
  on recent orders are offered too. Phone numbers stay on the server, never in git.
- Optional SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (a Twilio number in E.164). Without
  them, nothing is sent and the card says "Texting is not set up — tell the driver yourself".

## 7. Coolify variables (server only, never in git, never `VITE_*`)

| Variable                                                                        | Value                                               |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `DOORDASH_DEVELOPER_ID`, `DOORDASH_KEY_ID`, `DOORDASH_SIGNING_SECRET`           | DoorDash access key                                 |
| `DOORDASH_ENV`                                                                  | `sandbox` with a sandbox key; empty in production   |
| `DOORDASH_WEBHOOK_SECRET`                                                       | the Authorization value set on the DoorDash webhook |
| `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET` | Uber Direct Developer tab                           |
| `UBER_DIRECT_ENV`                                                               | `test` with test credentials; empty in production   |
| `UBER_DIRECT_WEBHOOK_SECRET`                                                    | the Uber webhook's signing key                      |
| `PPP_OWN_DRIVERS`                                                               | optional saved drivers                              |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`                 | optional driver texts                               |
| `SKIP_PORTAL_URL`                                                               | optional, overrides the Skip portal link            |

Redeploy after changing them. The chips at the top of `/admin/dispatch` show "connected", "test mode" or "not
connected" for DoorDash and Uber, and whether driver texts are on.

## 8. Verification status (2026-10-31)

- Verified with mocked provider APIs (vitest): DoorDash JWT, quote body and parsing, accept with tip, cancel 200/404/409,
  status and webhook mapping; Uber token caching, structured-address quote, couriers_busy, delivery with
  idempotency key / tip / manifest, cancel refusal, webhook HMAC; ranking; one live dispatch per order; admin session
  required on every entry point. Real PostgreSQL (CI, limited role): dispatch stored and read back across a restart,
  webhook lookup, tenant isolation, two simultaneous bookings → one courier.
- **Not verified:** any real DoorDash or Uber call (needs the owner's keys; try sandbox / test mode first), real
  webhooks from DoorDash/Uber, Twilio SMS, the Skip portal link.
