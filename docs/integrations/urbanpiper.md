# UrbanPiper — strategic integration plan (Prompt 20)

Status: analysis and preparation only. No API is connected. No credentials exist.

Principle: **UrbanPiper is the restaurant operating engine. PPP + TAKATAK own the
customer relationship.** Anything that touches design, journey, account, loyalty,
marketing or SEO stays on the PPP side of the boundary.

```
CUSTOMER -> PPP WEBSITE -> PPP INTEGRATION LAYER -> URBANPIPER / CLOVER / MARKETPLACES -> KITCHEN
```

---

## 1. Menu management

Question: should UrbanPiper be the source of truth?

| Data          | Proposed owner        | Note                                                        |
| ------------- | --------------------- | ----------------------------------------------------------- |
| Products      | UrbanPiper (ops truth)| PPP keeps a verified fallback catalog per location           |
| Categories    | UrbanPiper            | PPP controls display order and grouping on the site          |
| Prices        | UrbanPiper            | Single price truth avoids marketplace/website mismatch       |
| Modifiers     | UrbanPiper            | Required for correct kitchen tickets                         |
| Availability  | UrbanPiper            | 86'd items must come from the store, not from the website    |
| Images        | PPP                   | Brand quality; provider images used only as fallback         |
| Descriptions  | PPP                   | PPP wording, bilingual/trilingual, SEO value                 |

Recommendation: build **UrbanPiper -> PPP menu sync** for structure, price,
modifiers and availability; keep the PPP presentation layer (images, wording,
badges, cross-sell, rails) fully independent. Already implemented as
`MenuAdapter` in `src/lib/integration/core/adapter.ts` with the pure mapping in
`providers/urbanpiper/mapping.ts`.

## 2. Order flow

```
PPP checkout -> checkout-service -> OrderAdapter -> UrbanPiper Hub -> POS/KDS -> kitchen
```

Required mappings, all provider-neutral in `core/contracts.ts`:

- Order ID: PPP order id <-> `externalOrderId` (provider id kept as reference).
- Location: `PPP-<SLUG>` <-> `providerLocationId` (`config/integration-locations.ts`).
- Status: provider label -> `CREATED | CONFIRMED | PREPARING | READY | COMPLETED | CANCELLED`.
- Errors: every failure returns `IntegrationResult` with a customer-safe reason;
  nothing is ever reported as accepted unless the provider accepted it.
- Idempotency: one key per submit attempt, enforced in `core/logging.ts`.

## 3. Customer experience

PPP (with TAKATAK as identity authority) owns: account, profile, preferred name,
favourites, saved addresses, marketing consent, loyalty.

UrbanPiper receives only what fulfilment requires: name, phone, email, delivery
address, order contents, order notes. No marketing consent, no history, no
loyalty state, no cross-brand identity.

## 4. Location architecture

| PPP internal | Store                  | Ordering engine | Provider location id |
| ------------ | ---------------------- | --------------- | -------------------- |
| PPP-NDG      | NDG — 6280 Somerled    | UrbanPiper      | not mapped           |
| PPP-SAINTE-CATHERINE | Sainte-Catherine | UrbanPiper  | not mapped           |
| PPP-MONTREAL-NORD | Montréal-Nord (closed) | —          | not mapped           |
| future       | Jean-Talon, Chambly, Brossard | UrbanPiper | not mapped     |

One row per store, generated from the canonical registry `src/config/locations.ts`.
A store is only "connected" when a real `providerLocationId` exists.

## 5. Delivery channel strategy

| Channel        | Today            | Option later                                    |
| -------------- | ---------------- | ----------------------------------------------- |
| Uber Eats      | External link    | Menu + order sync via UrbanPiper aggregation     |
| DoorDash       | External link    | Menu + order sync via UrbanPiper aggregation     |
| SkipTheDishes  | External link    | Menu + order sync via UrbanPiper aggregation     |
| Too Good To Go | Not present      | Stays external; separate surplus-inventory model |

Recommended: keep marketplaces as links until UrbanPiper menu sync is live, then
move menu + availability + order injection into UrbanPiper so all channels share
one price and one 86 list. PPP Direct always stays the preferred channel.

## 6. White label decision

| Option | Description | Cost | Control | Customer experience | Franchise scalability |
| ------ | ----------- | ---- | ------- | ------------------- | --------------------- |
| A. PPP site + UrbanPiper backend only | PPP frontend, UrbanPiper ops | Medium | High | Full PPP | High |
| B. UrbanPiper white label ordering | Their storefront, PPP skin | Low | Low | Generic, off-brand | Low — they own the customer |
| C. PPP custom frontend + UrbanPiper APIs | Current architecture | Medium/High | Highest | Full PPP + loyalty | Highest |

Recommendation: **Option C** (A is the same shape with less depth). Option B is
rejected: it hands the customer relationship, the data and the SEO value to the
provider, which destroys the long-term franchise asset.

## 7. Required UrbanPiper access — request checklist

- [ ] API documentation (Atlas + Hub)
- [ ] API credentials (key + base URL, sandbox and production)
- [ ] Sandbox environment
- [ ] Merchant / biz id
- [ ] Organization id
- [ ] Location (store) ids for every PPP store
- [ ] Webhook documentation + signing secret
- [ ] Menu API access (catalog pull)
- [ ] Order API access (create + submit)
- [ ] Order status API / status webhooks
- [ ] Customer API availability (what they store, what they return)
- [ ] Image CDN access and licensing
- [ ] Modifier / option group API access
- [ ] Marketplace aggregation scope (Uber Eats, DoorDash, Skip)
- [ ] Rate limits, retry policy, SLA

## 8. Security

Never exposed to the browser: API keys, merchant tokens, webhook secrets.

- All provider calls happen inside server functions or server routes.
- Credentials are read inside handlers via `core/credentials.server.ts`.
- Webhooks verify an HMAC signature before any processing and reply 503 while no
  secret is configured.
- Logs scrub card, token, secret and authorization fields.

## 9. PPP future customer dashboard

| Customer sees   | Powered by                    | Provider role            |
| --------------- | ----------------------------- | ------------------------ |
| My orders       | PPP data + provider reference | supplies status events   |
| Order status    | Status mapping                | supplies raw status      |
| Favourites      | PPP / TAKATAK                 | none                     |
| Saved locations | PPP canonical registry        | none                     |
| Loyalty         | PPP / TAKATAK                 | none                     |

## 10. Admin integration screen

`/admin/integrations` shows provider comparison, required credentials per
provider, capability truth and the connection checklist. No capability is shown
as connected unless credentials **and** a store mapping exist.

---

## Next technical steps

1. UrbanPiper menu sync (removes manual menu maintenance, real modifiers/prices/availability)
2. UrbanPiper order creation (kitchen actually receives orders)
3. Order status webhooks (`/orders` and `/track` become real)
4. Payments (model depends on the chosen checkout)
5. Loyalty / TAKATAK identity (the strategic asset)
