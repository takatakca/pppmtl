# Comptes clients (téléphone vérifié) et virement Interac via TAKATAK Food Hub

_(English below.)_

## En une phrase

Le site pppmtl.com **ne garde aucune base de clients et aucun mot de passe** : Food Hub (notre application
TAKATAK) texte un code au cellulaire, vérifie le code, crée le compte la première fois et remet au site un jeton
signé que le site garde dans un cookie `httpOnly`. Le même Food Hub reçoit les commandes payées par **virement
Interac** et les garde en attente jusqu'à ce qu'une personne au restaurant confirme le virement.

Contrat partagé du 2026-10-29 : `docs/CUSTOMER_IDENTITY.md` dans foodhubca (section A, **fusionné sur main**,
PR #123) et la section B (commande de site web avec `payment: "interac"`, branche Food Hub en cours).

## Variables d'environnement (service pppmtl dans Coolify — jamais dans le navigateur)

| Variable                       | Rôle                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FOODHUB_URL`                  | Adresse de Food Hub, p. ex. `https://foodhub.on2go.ca`                                                                                                                                     |
| `FOODHUB_WEBSITE_ORDER_SECRET` | Le secret serveur-à-serveur déjà partagé avec Food Hub (`Authorization: Bearer`).                                                                                                          |
| `FOODHUB_TENANT`               | Facultatif, `pppmtl` par défaut (doit être dans `FOODHUB_CUSTOMER_TENANTS` côté Food Hub).                                                                                                 |
| `FOODHUB_BRAND`                | Facultatif, `PPP Pizzeria` par défaut : le nom de marque tel que le catalogue Food Hub l'écrit.                                                                                            |
| `FOODHUB_LOCATION_CODES`       | Facultatif, JSON `{ "<slug PPP>": "<CODE Food Hub>" }`. Par défaut, vérifié par adresse le 2026-10-29 : `ndg → NDG_MAIN`, `saint-leonard → SAINT_LEONARD`, `sainte-catherine → HOCHELAGA`. |
| `FOODHUB_INTERAC_ENABLED`      | **`true` seulement quand la branche Interac de Food Hub est déployée.** Sinon le site n'envoie aucune commande Interac (choix grisé « pas encore disponible »).                            |
| `FOODHUB_INTERAC_FEE`          | Frais Interac en dollars, `5.00` par défaut. Égal au réglage Food Hub (sinon 422) ; toujours taxé TPS + TVQ, comme Food Hub.                                                               |
| `FOODHUB_DELIVERY_FEE`         | Frais de livraison en dollars pour une commande Interac livrée. Vide = Interac en cueillette seulement.                                                                                    |

Les clés Twilio restent **dans Food Hub**, pas ici. Le navigateur ne voit jamais le secret ni les codes.

## Comment ça marche

### Vérification = connexion = compte

1. Le client entre son cellulaire (feuille « Vérifiez votre numéro », page `/account/sign-in` ou étape 2 du
   paiement). Le serveur du site appelle `POST /api/foodhub/customers/verify/start`.
2. Food Hub texte un code à 6 chiffres (10 minutes, 5 essais ; 3 demandes par numéro par 10 minutes).
3. Le client tape le code : `POST /api/foodhub/customers/verify/check`. Bon code → Food Hub crée le compte s'il
   n'existe pas et renvoie un jeton 30 jours ; le site le met dans le cookie `ppp_customer` (`httpOnly`, `Secure`
   en production, `SameSite=Lax`). Mauvais code → nombre d'essais restants ; 5ᵉ mauvais code ou code expiré →
   « demandez un nouveau code ».
4. `/account` lit `GET /api/foodhub/customers/me` : profil, adresses, favoris, 20 dernières commandes du site,
   **fidélité et cartes-cadeaux tels que Food Hub les annonce** — aujourd'hui `connected: false`
   (« LOY4LTY / REW4RDS not connected yet »), donc le site affiche « bientôt — votre numéro est la clé », jamais un
   solde inventé.
5. Déconnexion : `POST …/me/logout` (tous les jetons du client sont annulés) ; suppression (Loi 25) :
   `DELETE …/me` (fiche anonymisée). Le cookie n'est effacé qu'une fois Food Hub confirme la suppression.

Si Food Hub n'est pas configuré (`FOODHUB_URL` / secret absents), ou si ses routes clients ne sont pas déployées
(404), ou s'il est injoignable, la feuille le dit en clair et la commande sans compte reste possible.
`/account/sign-up` et `/account/forgot-password` redirigent vers la connexion par téléphone : il n'y a rien à créer
et aucun mot de passe à réinitialiser.

### Paiement par virement Interac (règle du Québec : prix tout inclus **avant** de confirmer)

1. À l'étape 3 du paiement, le site demande au serveur `getInteracOptions` (disponible ? frais ? frais de
   livraison ?). Le choix « Interac e-Transfer (+ frais) » n'apparaît actif que si tout est prêt.
2. Dès que le client choisit Interac, le résumé affiche : sous-total, **Frais Interac e-Transfer**, livraison le cas
   échéant, **Taxes (TPS + TVQ)** et le **Total tout inclus** — calculés avec la même arithmétique que Food Hub
   (`totalsFor` : TPS et TVQ arrondies chacune sur sous-total + livraison + frais Interac, puis additionnées).
3. Au clic « Confirmer · Virement Interac », le serveur recalcule depuis les prix du catalogue, **refuse si le total
   affiché diffère** (`price_changed`), puis envoie `POST ${FOODHUB_URL}/api/foodhub/webhooks/website-order` :
   `payment: "interac"`, `fees: [{ code: "interac", name: "Frais Interac e-Transfer", amount }]`, `total` (celui
   affiché), `customerToken` + `tenant` (si connecté), lignes et options payantes avec `ref` (identifiant Clover), `fulfillment`,
   adresse, `id` idempotent.
4. Food Hub re-tarifie, vérifie les frais et le total (tolérance 0,02 $), garde la commande **« awaiting_payment »**
   et répond avec les instructions : destinataire, montant exact, message du virement, question de sécurité le cas
   échéant, dépôt automatique, date limite. Le site les montre sur l'écran de confirmation et sur le reçu
   (`/orders/<id>`), statut « En attente du virement ». Le restaurant confirme par texto (Food Hub) ; le site ne lit
   aucune banque et ne marque jamais une commande Interac payée de lui-même.
5. Une réponse 200 **sans** instructions Interac (vieille version de Food Hub) est traitée comme un échec, journalisée
   (`interac.instructions_missing`) et affichée honnêtement — d'où l'interrupteur `FOODHUB_INTERAC_ENABLED`.

Ce qui n'arrive jamais : base de clients PPP, mot de passe, solde ou points inventés, prix affiché différent du
prix envoyé, secret dans le navigateur, commande Interac envoyée sans l'interrupteur du propriétaire.

## Étapes pour le propriétaire

1. Dans Coolify, service **pppmtl** : coller `FOODHUB_URL` et `FOODHUB_WEBSITE_ORDER_SECRET` (le même secret que
   Food Hub). Redéployer. → La connexion par téléphone fonctionne (Food Hub main a les routes clients).
2. Vérifier sur `/admin/integrations` : carte « TAKATAK Food Hub — connected », health répondu.
3. Quand la branche Interac de Food Hub est fusionnée et déployée : ajouter `FOODHUB_INTERAC_ENABLED=true`
   (les frais Interac sont toujours taxés TPS + TVQ, comme Food Hub le fait). Redéployer. Passer une commande
   test de cueillette par Interac, vérifier le tiroir « Commandes directes » de Food Hub, appuyer « Virement reçu ».
4. Pour la livraison par Interac : `FOODHUB_DELIVERY_FEE` (ex. `4.00`) une fois la règle de livraison décidée.

## Fichiers

- Serveur : `src/lib/integration/providers/foodhub/{config.server,client.server,interac-orders.server}.ts`,
  `src/lib/customer/{foodhub-customers.server,customer-cookie.server,customer.functions}.ts`.
- Pur (testé) : `src/lib/integration/providers/foodhub/interac.ts`, `src/lib/customer/token.ts`.
- UI : `src/components/auth/guest-verify-sheet.tsx`, `src/routes/checkout.tsx`, `src/routes/orders.$orderId.tsx`,
  `src/components/account/member-dashboard.tsx`, `src/routes/account_.sign-in.tsx`.
- Tests : `src/lib/integration/__tests__/foodhub-interac.test.ts`, `src/lib/customer/__tests__/foodhub-customers.test.ts`,
  `src/lib/orders/__tests__/interac-checkout.test.ts`, `src/lib/security/__tests__/no-secret-in-client.test.ts`.

---

# Customer accounts (verified phone) and Interac e-Transfer through TAKATAK Food Hub

## In one sentence

pppmtl.com **keeps no customer database and no password**: Food Hub (our TAKATAK application) texts a code to the
cell number, checks it, creates the account the first time and hands the site a signed token the site keeps in an
`httpOnly` cookie. The same Food Hub receives orders paid by **Interac e-Transfer** and holds them until a person at
the restaurant confirms the transfer.

Shared contract of 2026-10-29: `docs/CUSTOMER_IDENTITY.md` in foodhubca (section A, **merged on main**, PR #123)
and section B (website order with `payment: "interac"`, Food Hub branch in progress).

## Environment variables (pppmtl service in Coolify — never in the browser)

| Variable                       | Role                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FOODHUB_URL`                  | Food Hub's address, e.g. `https://foodhub.on2go.ca`                                                                                                                                        |
| `FOODHUB_WEBSITE_ORDER_SECRET` | The server-to-server secret already shared with Food Hub (`Authorization: Bearer`).                                                                                                        |
| `FOODHUB_TENANT`               | Optional, `pppmtl` by default (must be in Food Hub's `FOODHUB_CUSTOMER_TENANTS`).                                                                                                          |
| `FOODHUB_BRAND`                | Optional, `PPP Pizzeria` by default: the brand name as Food Hub's catalog spells it.                                                                                                       |
| `FOODHUB_LOCATION_CODES`       | Optional JSON `{ "<PPP slug>": "<Food Hub CODE>" }`. Defaults verified by street address on 2026-10-29: `ndg → NDG_MAIN`, `saint-leonard → SAINT_LEONARD`, `sainte-catherine → HOCHELAGA`. |
| `FOODHUB_INTERAC_ENABLED`      | **`true` only once Food Hub's Interac branch is deployed.** Otherwise the site sends no Interac order (choice greyed out, "not available yet").                                            |
| `FOODHUB_INTERAC_FEE`          | Interac fee in dollars, `5.00` by default. Equals Food Hub's setting (else 422); always taxed GST + QST, as Food Hub does.                                                                 |
| `FOODHUB_DELIVERY_FEE`         | Delivery fee in dollars for an Interac delivery order. Empty = Interac for pickup only.                                                                                                    |

The Twilio keys live **in Food Hub**, not here. The browser never sees the secret or the codes.

## How it works

### Verification = sign-in = account

1. The customer enters their cell number (the "Verify your number" sheet on `/account/sign-in` or in checkout
   step 2). The site's server calls `POST /api/foodhub/customers/verify/start`.
2. Food Hub texts a 6-digit code (10 minutes, 5 tries; 3 requests per number per 10 minutes).
3. The customer types the code: `POST /api/foodhub/customers/verify/check`. Right code → Food Hub creates the
   account if it does not exist and returns a 30-day token; the site stores it in the `ppp_customer` cookie
   (`httpOnly`, `Secure` in production, `SameSite=Lax`). Wrong code → attempts left; 5th wrong code or expired
   code → "request a new code".
4. `/account` reads `GET /api/foodhub/customers/me`: profile, addresses, favourites, the last 20 website orders,
   **loyalty and gift cards exactly as Food Hub reports them** — today `connected: false` ("LOY4LTY / REW4RDS not
   connected yet"), so the site shows "coming soon — your phone is the key", never an invented balance.
5. Sign-out: `POST …/me/logout` (every token of the customer is void); deletion (Law 25): `DELETE …/me` (record
   anonymised). The cookie is cleared only once Food Hub confirmed the deletion.

If Food Hub is not configured (`FOODHUB_URL` / secret missing), or its customer routes are not deployed (404), or
it is unreachable, the sheet says so plainly and guest ordering stays open. `/account/sign-up` and
`/account/forgot-password` redirect to phone sign-in: there is nothing to create and no password to reset.

### Paying by Interac e-Transfer (Québec rule: all-inclusive price **before** committing)

1. In checkout step 3 the site asks the server `getInteracOptions` (available? fee? delivery fee?). The
   "Interac e-Transfer (+ fee)" choice is active only when everything is ready.
2. As soon as the customer picks Interac, the summary shows: subtotal, **Interac e-Transfer fee**, delivery when
   delivering, **Taxes (GST + QST)** and the **all-inclusive Total** — computed with Food Hub's own arithmetic
   (`totalsFor`: GST and QST each rounded on subtotal + delivery + Interac fee, then added).
3. On "Confirm · Interac e-Transfer" the server re-prices from the catalog, **refuses if the displayed total
   differs** (`price_changed`), then sends `POST ${FOODHUB_URL}/api/foodhub/webhooks/website-order`:
   `payment: "interac"`, `fees: [{ code: "interac", name: "Frais Interac e-Transfer", amount }]`, `total` (what was
   displayed), `customerToken` + `tenant` (when signed in), lines and paid options with `ref` (Clover id), `fulfillment`, address,
   idempotent `id`.
4. Food Hub re-prices, checks the fee and the total ($0.02 tolerance), holds the order **"awaiting_payment"** and
   answers with the instructions: recipient, exact amount, transfer message, security question if any, auto-deposit,
   deadline. The site shows them on the confirmation screen and on the receipt (`/orders/<id>`), status "Waiting for
   your transfer". The restaurant confirms by text (Food Hub); the site reads no bank and never marks an Interac
   order paid on its own.
5. A 200 **without** Interac instructions (an older Food Hub) is treated as a failure, logged
   (`interac.instructions_missing`) and shown honestly — hence the `FOODHUB_INTERAC_ENABLED` switch.

What never happens: a PPP customer database, a password, invented points or balances, a displayed price that
differs from the price sent, the secret in the browser, an Interac order sent without the owner's switch.

## Owner steps

1. In Coolify, service **pppmtl**: paste `FOODHUB_URL` and `FOODHUB_WEBSITE_ORDER_SECRET` (the same secret as Food
   Hub). Redeploy. → Phone sign-in works (Food Hub main has the customer routes).
2. Check `/admin/integrations`: card "TAKATAK Food Hub — connected", health answered.
3. Once Food Hub's Interac branch is merged and deployed: add `FOODHUB_INTERAC_ENABLED=true` (and
   the Interac fee is always taxed GST + QST, as Food Hub does). Redeploy. Place one test pickup order by
   Interac, check Food Hub's Direct orders drawer, press "Transfer received".
4. For Interac delivery: `FOODHUB_DELIVERY_FEE` (e.g. `4.00`) once the delivery rule is decided.

## Files

See the French list above (same paths).
