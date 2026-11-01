# Interac e-Transfer — owner guide

Owner decisions 2026-10-31 / 2026-11-01: customers in Québec can pay by Interac e-Transfer instead of debit; the
restaurant **requests** the money from its **BMO** business account. With the BMO Instant Payments API connected
(section "BMO automatic requests"), the request goes out and the payment is confirmed by themselves; without it, staff
do the same steps by hand. Code: `src/lib/payments/` (BMO: `src/lib/payments/bmo/`), tablet page `/admin/interac`.

## How an order goes

1. At checkout the customer picks **Interac e-Transfer** (shown only when switched on) and must give an e-mail.
   The order is priced from Clover exactly like a card order (food + TPS/TVQ + $5 delivery if any + tip) and saved
   in the database, **unpaid**. Nothing goes to the kitchen yet.
2. The restaurant phone (`INTERAC_ALERT_PHONE`) gets a text: order number, amount, name, e-mail, phone. The customer
   gets a text saying a request for that amount is coming. The customer's order page shows the amount and waits.
3. Staff open `/admin/interac` on the tablet, send **Request money** from the bank app to the e-mail shown, for the
   amount shown, then tap **Request sent**.
4. When the money is in the bank account, tap **Paid — send to kitchen** (it asks to confirm the amount). The order
   becomes PAID, an open Clover order titled `🌐 Site web · PPP-XXXXX · Name · INTERAC` is created with the ticket
   lines and the note `PAYÉ EN LIGNE / PAID ONLINE (Interac 19,49 $)`, and it prints once. Two tablets tapping Paid
   at the same time still make one Clover order.
5. If Clover or the printer fails, the order stays PAID and the card shows **Paid · NOT in the kitchen** with the
   reason and **Send to kitchen again** (it only redoes the step that failed).
6. A customer who never pays: tap **Cancel** (only possible before Paid). A paid order is refunded from the bank,
   then cancelled in Clover.

## Switch it on (Coolify → the pppmtl app → Environment Variables, runtime)

| Variable                                                        | Value                                               |
| --------------------------------------------------------------- | --------------------------------------------------- |
| `INTERAC_REQUESTS_ENABLED`                                      | `true`                                              |
| `INTERAC_ALERT_PHONE`                                           | the phone that gets the alerts, e.g. `514 555 0199` |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Twilio keys and a Twilio number (`+1…`)             |

`DATABASE_URL` must already be set (it is, for Clover checkout): without the database Interac stays hidden, because
an order waiting hours for its money must survive a restart. Without Twilio everything works, but nobody gets a
text: staff must watch `/admin/interac` (it refreshes every 15 s).

## In Clover (once)

- The Clover REST token (`CLOVER_API_TOKEN`) must have **Orders: write** (it creates the open order and its lines;
  the card flow's ticket title already uses the same permission).
- Create a custom tender: Clover web dashboard → Setup → Tenders → Add → name it **Interac e-Transfer**. Close each
  Interac order at the register with that tender so it counts in Clover's sales reports.
- **Check the first one:** the site adds the lines without taxes; when you close the order at the register, compare
  Clover's total with the amount received (shown in the order note). Not yet tested on the real Clover account.

## Not verified yet

A real Twilio text, a real Clover order created through the REST token, the real printer, how the register taxes
these lines, and any real BMO call (no keys yet). Tested: manual flow 6 tests (one on real PostgreSQL: two
simultaneous Paid taps → one Clover order); BMO 14 tests with a fake BMO that really decrypts our requests and
encrypts its answers (OAuth connect with state check, request, push, poll, refused, timeout, amount mismatch; two on
real PostgreSQL: tokens sealed and kept across a restart per tenant, two simultaneous pushes → one Clover order); a
browser run of checkout → order page → tablet with fake keys.

## BMO automatic requests (BMO Instant Payments API)

Built against BMO's published spec "Instant Payments - CA" 4.3.1 and "Push Notifications" 1.1.0
(developer.bmo.com → API Products). With it, steps 3 and 4 above happen by themselves:

1. Order placed → the site sends BMO a **Request for Payment** (ISO 20022 pain.013) for the exact amount to the
   customer's e-mail and mobile, reference = the order, expiry 60 min (`BMO_REQUEST_EXPIRY_MINUTES`). Interac e-mails
   or texts the customer; the tablet shows **BMO: request sent to the customer**.
2. The customer accepts it in their bank app. BMO tells the site (push notification to
   `https://pppmtl.com/api/public/webhooks/bmo`, and a status check every 60 s as a backup).
3. Status "settled" (ACSC / ACCC) **for the exact amount** → the order becomes PAID, goes to Clover and prints once
   (same code as the Paid button; two notifications at once still make one ticket). A different amount is held:
   the tablet says so and a person decides.
4. Refused, cancelled or expired → the tablet shows why; **Send BMO request again** or **Cancel**. A request whose
   answer was lost (timeout) is never resent by itself: the site asks BMO first.

### Monday checklist (when BMO gives the keys)

1. In the BMO developer portal app: register the redirect URI `https://pppmtl.com/auth/bmo/callback` and the push
   notification URL `https://pppmtl.com/api/public/webhooks/bmo`; subscribe to the request-money statuses; give BMO
   our **public key** (generate a key pair; keep the private one for Coolify) and agree on the push secret.
2. Coolify → pppmtl → Environment Variables (runtime):

| Variable                                             | Value                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `BMO_CLIENT_ID`, `BMO_CLIENT_SECRET`                 | from the BMO app                                                                              |
| `BMO_API_KEY`                                        | only if BMO gives a separate API key (default: the client id)                                 |
| `BMO_CREDITOR_ACCOUNT`                               | the BMO account that receives the money, in the format BMO asks for                           |
| `BMO_CREDITOR_NAME`                                  | name on the request (default `PPP Pizzeria`)                                                  |
| `BMO_ENCRYPTION_PUBLIC_KEY`, `BMO_ENCRYPTION_KEY_ID` | BMO's public key (PEM) and its id                                                             |
| `BMO_PRIVATE_KEY`                                    | our private key (PEM; `\n` for line breaks is fine)                                           |
| `BMO_PUSH_SECRET`                                    | the value BMO sends in `x-api-key` / `Authorization` on notifications                         |
| `BMO_ENV`                                            | `sandbox` first; `production` + `BMO_API_BASE_URL` + `BMO_OAUTH_BASE_URL` from BMO at go-live |

3. Database (once, like 0001–0003): apply `db/migrations/0004_ppp_integration_tokens.sql`, then
   `GRANT SELECT, INSERT, UPDATE ON ppp.integration_tokens TO ppp_app;`. Without it BMO still works, but a restart
   asks to connect again.
4. Redeploy, open `/admin/interac`, tap **Connect BMO**, sign in with the BMO business user and approve. The banner
   says "on".
5. Sandbox test: place an Interac order on the site with your own e-mail; check the request arrives, accept it, and
   watch the tablet go to **Paid · in the kitchen** by itself.

### To confirm on the sandbox (BMO's spec leaves these open)

- Payload encryption details: OAEP hash (`BMO_OAEP_HASH`, default sha1) and where the AES-GCM tag goes (we append it
  to the ciphertext); `BMO_PAYLOAD_ENCRYPTION=off` only if BMO says the sandbox takes plain JSON.
- The creditor account format, and whether BMO wants `true-client-ip` from us (`BMO_TRUE_CLIENT_IP`).
- Which status means "money received" for a request (we use ACSC / ACCC, per BMO's FAQ) and that push notifications
  carry the end-to-end id we send.
- Fees: BMO quotes production pricing when you go live.
