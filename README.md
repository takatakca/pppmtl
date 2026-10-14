# PPPMTL — Restaurant platform

The source repository for **[pppmtl.com](https://pppmtl.com)** and the related franchise storefronts. This is a TanStack Start / React / TypeScript **server-rendered application**, not a static website. The existing visual design, brand routing and Clover menu mapping are intentional.

## Architecture

- **Frontend and server:** TanStack Start, React 19, Vite, Tailwind CSS, Nitro.
- **One shared menu/cart:** PPP and franchise brands use one catalog and Clover item mapping. The hostname determines the storefront; see [franchise documentation](docs/brands.md).
- **Checkout:** server-side Clover Hosted Checkout for supported **pickup** orders. Prices and availability are verified by the server. Card details must never pass through PPPMTL code.
- **Webhook:** `POST /api/public/webhooks/clover` verifies Clover's signature. Only a verified payment event may mark an order paid.
- **Integrations:** Clover, with UrbanPiper and other marketplaces separately tracked. See [Clover integration](docs/integrations/clover.md) and [UrbanPiper notes](docs/integrations/urbanpiper.md).
- **Ownership:** TAKATAK is the customer identity/data authority where shared customer services are subsequently connected; tenant data must remain isolated.

## Development

Requires Node.js 22. The repository currently includes `bun.lock` but no `package-lock.json`; use one consistent dependency manager when building.

```bash
git clone https://github.com/takatakca/pppmtl.git
cd pppmtl
npm install
npm run dev
```

Scripts: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`. The GitHub Actions workflow `.github/workflows/ci.yml` executes all four checks on `main`; inspect its job result before deploying. No green result is implied merely by creating the workflow.

## Deploy to Coolify (Node server)

**Do not serve only the `dist` folder or copy HTML files to shared hosting.** Server functions, checkout credentials and webhooks need a backend.

1. In Coolify, create an application using this private GitHub repository, branch `main`. Set Node.js 22.
2. Build with `NITRO_PRESET=node-server` and `npm run build` after installing dependencies. Start with `node .output/server/index.mjs`; internal port `3000`. Configure the proper Node/Nitro host binding in Coolify.
3. Configure the application's server secrets from [the Clover checklist](docs/integrations/clover.md#4-where-to-host-important): `CLOVER_MERCHANT_ID`, `CLOVER_ECOMM_PRIVATE_KEY`, `CLOVER_WEBHOOK_SECRET`, and optionally `CLOVER_API_TOKEN`. Set `PUBLIC_SITE_URL=https://pppmtl.com`. Never put credentials in `VITE_*` variables or Git.
4. Assign `pppmtl.com` (and `www` if used) to the Coolify app, configure HTTPS and its DNS record, and preserve the domain's email DNS records.
5. Configure Coolify's **HTTP health check** on `GET /healthz`. This checks that the Nitro web process is serving requests; it is not a Clover payment or database health check.
6. **Preferred automatic delivery:** use Coolify's native GitHub connection with automatic deployment on commits to `main`. This does not require the fallback workflow below.
7. **Alternative only after green CI:** `.github/workflows/deploy-coolify.yml` can queue a Coolify deployment on every push to `main` when GitHub repository variable `PPPMTL_DEPLOY_VIA_ACTIONS=true` and both repository secrets `PPPMTL_COOLIFY_DEPLOY_WEBHOOK` (HTTPS `/api/v1/deploy?uuid=...`) and `PPPMTL_COOLIFY_API_TOKEN` are configured. Do **not** enable it at the same time as Coolify's native push deployment.

Coolify accepting a webhook does **not** confirm a healthy release. After deployment, check Coolify Deployment Logs, the domain, the checkout/server APIs, and the signed webhook before taking real customer payments.

## Production readiness — unfinished / requires verification

- **Deployment:** the exact pppmtl.com hosting/DNS/live commit and Coolify connection have not been verified from this repository. No live deployment is claimed here.
- **Secrets + payment:** the production Clover merchant credentials and webhook registration must be configured securely; run a controlled paid order and refund before accepting production orders.
- **Order persistence:** current order records and webhook replay protection are in process memory; a restart or multiple workers can lose local order history and replay state. A durable order store, idempotency and retry mechanism are needed.
- **Admin/identity:** the operations endpoints now require a temporary signed administrator session (sign in at `/admin/sign-in`), configured using separate 32+ character server-only `PPP_ADMIN_ACCESS_TOKEN` and `PPP_ADMIN_SESSION_SECRET`. Customer order reads/cancellation are limited to signed same-browser grants using a third stable `PPP_ORDER_ACCESS_SECRET`; without that key new web checkouts fail closed. Replace the temporary admin login with TAKATAK Auth/tenant-specific entitlements and backed order history before launch.
- **Brand data:** Hochelaga is present but its business hours are **not approved** and must remain unpublished. Align operating hours and location facts with the owner and external delivery channels.
- **QA:** run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` before production launch (deferred at the owner's request).

See [AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md), [TASK_QUEUE.md](docs/TASK_QUEUE.md), and [WORKLOG.md](WORKLOG.md) for recent commits and the next handoff. No secret, DNS, deployment or live-payment verification is implied by a successful Git push.
