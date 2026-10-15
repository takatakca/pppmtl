# PPPMTL — prioritized task queue

Updated: 2026-10-15 · GitHub is the source of truth.

## P0 — mandatory before enabling production payments

1. **#6 Durable order store:** choose a production PostgreSQL service or TAKATAK tenant-scoped order API; implement schema/migrations, atomic order/payment transactions, unique provider checkout+payment ids, outbox for Clover title/print retries, durable webhook delivery claims, backup/restore; no duplicate charges or tickets. Tests must exercise parallel workers, restarts, duplicate callbacks, declined payments and refunds. Status: open, not implemented.
2. **#5 Verified identity and permissions:** replace temporary PPP admin credential with authenticated TAKATAK roles, tenant scope and entitlements; authorize customer order access with verified TAKATAK identity and/or signed guest grants. Status: *temporary server gate and cookie grants committed*, permanent integration open.
3. **Clover live credential onboarding:** configure merchant ID, Hosted Checkout private key, webhook signing secret, REST token, taxes and webhook URL on verified backend host. Confirm production merchant and HTTPS before payment test. Status: external access required.
4. **Server and CI validation:** successful typecheck, lint, tests, Node/Nitro build and a controlled real payment/refund test before launch. Status: CI added; outcome to read from GitHub Actions.

## P1 — operations and usability

5. Verify actual target hosting: do not assume old MochaHost or Coolify is active. Attach pppmtl.com domains and HTTPS, preserve email DNS, configure health check, back-ups and deployment rollback.
6. Admin workflow: improve sign-in UX, rate-limit attempts at trusted edge, add logout and operator auditing. Temporary admin cookie is 8 hours and HttpOnly; no privileged action is allowed without it. Do not publicly expose any admin data.
7. Connect TAKATAK customer profiles/rewards/favourites/addresses and real order history without creating a competing master customer database.
8. Update the `/track` and support flows to identify signed-browser receipts as such rather than promising lookup by phone alone. Use verified identities for cross-device support.
9. Verify external delivery menus/links and operating hours with owner-approved facts; Hochelaga hours remain unpublished pending approval.

## P2 — refinements

10. Full mobile visual QA of customizer, cart, checkout, brand domains and accessibility.
11. Verify webhook failure monitoring, metrics, alerts, analytics, uptime and incident-response procedure.
12. Remove stale Lovable placeholder references only after migrations/hosting are verified; preserve Git history and existing design.

## Work protocol

- Read `AGENTS.md`, `WORKLOG.md`, this queue and `AGENT_HANDOFF.md` before changing code.
- Claim a single task in `WORKLOG.md`; do not redo open agent work; make narrow commits to `main` only when permitted.
- Never mark an integration as live because a file or secret *name* exists. Obtain API/response evidence.
- Keep `AGENT_HANDOFF.md` and this queue aligned after every complete development session.

## Update 2026-10-15

- **Safety applied:** source now fails closed on real Clover production checkout until the order repository becomes durable (not just a configuration flag), and refuses malformed Clover quantities.
- **Identity boundary applied:** guest checkouts ignore caller-supplied TAKATAK/customer IDs; a dedicated TAKATAK-scoped auth assertion/service is still needed. Review [IDENTITY_INTEGRATION.md](IDENTITY_INTEGRATION.md) and do not borrow 1LV credentials.
- **#7 CI infrastructure blocker:** recent Actions runs have `runner_id=0`, no job steps, logs returning 404 BlobNotFound. Inspect repo/org Actions billing, quotas, disabled runners and policies; restore an actual runner, then run the full CI suite. GitHub's public service-status page cannot verify this account's runner availability.
- **Migration remains unapplied:** `db/migrations/0001_ppp_orders.sql` defines tenant-scoped order, webhook and outbox tables. It is not a working database or replacement for #6 without a verified PostgreSQL instance, application driver, transaction logic, backups and restart/replay tests.
