# Franchise brands on one app

One codebase, one Clover register, one menu, one cart, one checkout. The domain a visitor opens picks the brand;
the brand only changes the front of the site.

## How it works
- `src/config/brands.ts`: every brand (domain, name, logo mark, colours, words, its 10–12 dishes as Clover ids,
  kitchens, store links on the delivery apps). `resolveBrandId(host)` maps the host to a brand; anything unknown
  is PPP. `pppmtl.com` keeps PPP's own home page.
- Franchise home (`/`): a delivery-app style store page (`src/components/franchise/brand-store.tsx`).
  "Commander en ligne" comes first: the Clover Online Ordering page when `VITE_CLOVER_ONLINE_ORDERING_URL` is set,
  else the site's own `/order` (paid on Clover Hosted Checkout). Then the live Uber Eats / DoorDash pages, then the phone.
- `/marques`: all restaurants of one kitchen (`?cuisine=ndg` or `st-leonard`). `/marques/<brand id>` opens a brand
  on the same site, so one cart holds dishes of several brands (one Clover payment). Its canonical is the brand's
  own domain.
- AI and search: `/llms.txt` (per domain; PPP's lists every brand), schema.org (Restaurant per kitchen, Menu with
  prices, opening hours, sameAs Google profile + live store pages), `/robots.txt` and `/sitemap.xml` per domain.
- Previews: `<host with dashes>.31-220-96-134.sslip.io` (Coolify), `preview.<domain>`, `<brand id>.localhost`.
  They send `X-Robots-Tag: noindex` and robots.txt `Disallow: /`.
- Rules kept by the tests (`src/lib/brand/__tests__/brands.test.ts`): 10–12 dishes with a photo per brand,
  Po Poulet = Saint-Léonard only and DoorDash 27982486 never appears, no "ghost/virtual/delivery-only" wording.

## Change a brand
Edit its block in `src/config/brands.ts` (an order link shows only with `live: true`), run `npx vitest run`, commit.
Keep `private/google/MENUS_PAR_MARQUE.md` (owner's PC) in step so Google shows the same dishes.

## Host it (Coolify, one app for every domain)
- Build: `NITRO_PRESET=node-server` then `vite build` (bun.lock: Nixpacks uses bun). Start: `node .output/server/index.mjs`,
  port 3000. Server variables: see `docs/integrations/clover.md` §4. Optional build variable:
  `VITE_CLOVER_ONLINE_ORDERING_URL`.
- Domains: first the sslip previews, then each real domain after its DNS A record points to the VPS
  (mail records untouched).
