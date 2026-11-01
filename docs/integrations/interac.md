# Interac e-Transfer (manual) — owner guide

Owner decision 2026-10-31: customers in Québec can pay by Interac e-Transfer. The restaurant sends a "Request money"
from its own bank app; no payment provider is connected yet. Code: `src/lib/payments/`, tablet page `/admin/interac`.

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

A real Twilio text, a real Clover order created through the REST token, the real printer, and how the register taxes
these lines. Tested: 6 automated tests (one on real PostgreSQL: two simultaneous Paid taps → one Clover order) and a
browser run of checkout → order page → tablet with fake keys.

## Later

A provider (VoPay or Zūm Rails, both Canadian) can send the request and confirm the payment automatically; it would
replace steps 3–4 only.
