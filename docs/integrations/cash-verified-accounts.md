# Cash on delivery for verified accounts — plan (not built)

Owner decision 2026-11-01. Goal: no card machines for drivers. Payment options:

| Option             | How                                                                                          | Status                 |
| ------------------ | -------------------------------------------------------------------------------------------- | ---------------------- |
| Credit card        | Clover Hosted Checkout (Clover's page, not Stripe), straight into the Clover register        | built                  |
| Interac e-Transfer | replaces debit: PPP requests the money from its BMO account (`docs/integrations/interac.md`) | built, BMO keys Monday |
| Cash               | **delivery only**, paid to the driver, **only for verified accounts**                        | plan                   |

## Verified account (for cash)

- Pickup and phone orders: a registered account with a **verified phone number**.
- Cash: the account is also verified with a **government photo ID + live selfie** (liveness: the person moves their
  head when asked), through a provider first; PPP's own verification maybe later.
- A verified account gets a Clover customer id; a cash delivery goes into Clover as a delivery order from our site
  (open, not paid), the driver collects, and it is closed in Clover with the cash tender.

## Providers to compare (Canada)

Prices and features below come from vendor pages (some from competitors): get written quotes before choosing.

- **Interac Document Verification Service** — Canadian, government photo ID + selfie; upgrading with Incode
  (liveness, deepfake detection), rollout announced for Q3–late 2026.
  [Interac](https://www.interac.ca/en/verification/business/interac-document-verification-service/) ·
  [Incode partnership](https://www.incode.com/press/interac-chooses-incode-to-strengthen-identity-verification-in-canada)
- **Trulioo** (Vancouver) — document + database checks; custom pricing (about $1–3 per check per a competitor).
- **Veriff** — self-serve plans about $0.80–$1.89 per check with a monthly minimum (per a competitor's comparison).
- **Didit** — about $0.30 per full ID check with active liveness (vendor's own claim).
  [Didit vs Veriff](https://didit.me/blog/didit-vs-veriff-differences/)

## Québec law (must be done before any face check)

- Identity verification with biometrics (face match) needs the person's **express consent** and a prior declaration
  to the **Commission d'accès à l'information** (LCCJTI s. 44); a **biometric database** must be declared at least
  **60 days** before it is used (s. 45); Law 25 requires a privacy impact assessment.
  [Osler](https://www.osler.com/en/insights/updates/quebecs-privacy-regulator-prohibits-retailers-use-of-facial-recognition-for-loss-prevention/) ·
  [BLG](https://www.blg.com/en/insights/2022/04/new-quebec-biometric-requirements-legal-risk-and-mitigation)
- Recommendation: a provider that keeps the images and returns only pass/fail; PPP stores "verified on <date> by
  <provider>, ID type" and no photo or face template. Building our own verification makes PPP the holder of the
  biometric data (CAI declaration, 60 days, assessment, retention rules): legal advice first.

## Next steps

1. Owner picks a provider and asks for a Québec-compliant setup (consent screen in French, data kept in Canada).
2. Build: account page "Verify for cash" → provider flow → signed webhook → account flag; checkout shows Cash only
   on delivery for a verified account; Clover customer id + delivery order type.
