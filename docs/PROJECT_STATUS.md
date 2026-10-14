# PPPMTL — project status

Updated: 2026-10-14 · branch: `main` · [repository](https://github.com/takatakca/pppmtl)

## Product identity and current implementation

- PPP Pizzeria Montreal and franchise storefronts share a TanStack Start / React 19 / TypeScript / Tailwind application.
- Main experience, category rails, cart, order customization, brand-by-host routing, SEO / sitemaps / llms.txt and multi-language copy already exist.
- Clover real-menu overlay with mapping, option pricing, real product photography, server-side pickup checkout, signed payment webhook handling and restaurant register/KDS title/print workflow exist in source code.
- UrbanPiper integrations are prepared but depend on provider credentials/mappings; third-party delivery remains through external marketplaces.
- Business facts from PR #4 were merged: NDG 16:00–03:00, Saint-Léonard 10:00–23:00, Hochelaga listed across brands with hours unpublished until confirmed.
- On 2026-10-14 the payment return screen was corrected not to treat `?paid=1` as proof of payment, order quantities/modifiers were hardened, and an authenticated operations/guest-receipt security seam was added.

## Readiness matrix

| Area | Source status | Production status |
|---|---|---|
| Brand storefronts and catalog | Implemented | DNS/live domains still to verify |
| Clover price mapping/checkout | Code present | Production secrets/real payment/refund not verified |
| Clover print and webhook | Code present | Durable replay tracking and retry missing |
| Orders and history | In-memory implementation | **Not production ready**; issue #6 |
| Admin/integrations | Temporary signed admin login and server guards | Requires env secrets and TAKATAK roles later; issue #5 |
| Guest receipts | Signed HttpOnly same-browser grants | Cross-device TAKATAK account backend unavailable |
| Tests/build | GitHub CI added, checks triggered | A green end-to-end result not yet established |
| Deployment | Opt-in Coolify workflow plus `/healthz` | No verified release or active target configuration |

## Security caveats

- **Do not enable paid production checkout** until durable orders, provider event deduplication and retry are implemented and tested. Current in-memory order state is insufficient for multi-worker restarts.
- Temporary admin login requires three separate server-side secrets: `PPP_ADMIN_ACCESS_TOKEN`, `PPP_ADMIN_SESSION_SECRET`, `PPP_ORDER_ACCESS_SECRET`; all at least 32 characters, not shared. This is not yet TAKATAK Auth.
- Customer phone number and user-controlled customerId do not authorize history. The current browser's signed grant determines which orders may be read or cancelled.
- A guest changing browsers, clearing cookies or returning after a restart may lose access to historical orders; Clover is the authoritative payment source.

## Open issues

- [#5 Authentication, authorization and tenant isolation](https://github.com/takatakca/pppmtl/issues/5)
- [#6 Durable order and Clover webhook pipeline](https://github.com/takatakca/pppmtl/issues/6)

See [TASK_QUEUE.md](TASK_QUEUE.md), [AGENT_HANDOFF.md](AGENT_HANDOFF.md), [DEPLOYMENT.md](DEPLOYMENT.md), and [DECISIONS.md](DECISIONS.md).
