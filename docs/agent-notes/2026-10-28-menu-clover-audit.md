# PPPMTL — 2026-10-28 — Audit menu mobile, parcours Clover et CI

**Agent : GPT-6.** Source de vérité : `takatakca/pppmtl` sur `main`. Cette note est rédigée à partir des fichiers/commits/actions GitHub réellement lus, plus un journal TAKATAK Drive préexistant; aucun secret copié.

## Contexte déjà réalisé, ne pas refaire

- Le 26 octobre, `48c00a4` a corrigé l'erreur React hydration #418 (bouton favori imbriqué dans un autre bouton). Handoff GitHub : application Coolify `pppmtl` sur Contabo vps2, GitHub-App déploiement natif sur `main`. Le déploiement `pqqwxhcy2jctxxhcblwafvia` de `48c00a4` était alors vérifié. Un push **plus récent** n'est PAS automatiquement preuve d'une nouvelle version saine : vérifier son statut Coolify, SHA et /healthz.
- La PR #12 a simplifié les fiches (groupes suggérés exclus, une option par ligne, menus en grille). Ne pas annuler ces décisions.
- Catalogue source visible : `src/data/catalog.generated.ts` + `src/data/clover/inventory.snapshot.json` (175 items, 218 groupes) et `src/config/clover-item-map.ts`. `src/data/clover/overlay.ts` associe les identifiants, prix, options, disponibilités Clover. `site-groups.ts` applique les règles (min/max, identifiants, prix), mais ne fournit pas à lui seul une connexion live ni la vente.
- Issue #18 : le propriétaire veut uniquement les **exports Canva jaunes terminés**, manifeste officiel dans Google Drive ; les images plaines ne doivent pas être remplacées arbitrairement. Les photos / remplacements hors sujet sont explicitement exclus de cet audit.
- Drive `TAKATAK — MAIN / 00 — JOURNAL — État en direct`, mis à jour le 28 octobre vers 00 h 33 EDT, décrit un dossier de préparation Clover marchand On2GO.CA, clé e-commerce/webhook, token REST existant, taxes TPS/TVQ. **Il précise également que ces valeurs ne sont pas encore versées à Coolify et que PostgreSQL/essai de bout en bout restent à faire.** Ne jamais prétendre que le site reçoit des paiements réels ou extraire les clés du journal. Les notes de GitHub du 26 octobre mentionnent également l'absence de `DATABASE_URL`/Clover dans Coolify.

## Demande propriétaire de 2026-10-28

1. Menu / catégorie « Dessert » : clic, lag, swipe, défilement latéral/vertical confus sur mobile.
2. Fiche produit : ordre logique **choix principal du produit obligatoire**, puis sauce, légumes/garnitures, breuvage, trio, combo et enfin extras, **seulement pour les groupes réellement liés au produit**. Garder les vrais `min`/`max`, ID Clover, prix et choix.
3. Audit global des surfaces; intégration Clover réelle si les identifiants/autorisation sont disponibles et sûrs.
4. Notes agents GitHub à l'entrée/pendant/avant sortie; miroir de relève dans les dossiers appropriés Google Drive, sans doublons ni écrasement des agents concurrents.

## Commits réellement observés durant cette reprise

- `77b3102b6` et `4dae445b2` : deux agents ont consigné une tâche active dans `WORKLOG.md` (travail en parallèle).
- `b927e59f8` : un autre agent corrige le menu / scrollspy : navigation sticky sortie de la section d'introduction, scroll horizontal des chips sans `scrollIntoView` vertical, saut de catégorie calculé sans animation conflictuelle.
- `a9389f835` : ordre de préparation des groupes Clover dans `site-groups.ts`; produits requis priorisés, sauces, garnitures, boissons, trio, combo et extras. Inconnu après les groupes reconnus, ordre Clover préservé à égalité.
- `c88097721` : tests des rangs/prix/min-max Clover.
- `b88ec0f62` : la fiche produit garde le défilement vers un champ requis **à l'intérieur de la modale** et ne fait plus glisser la page derrière.
- `747cb837c` : réduit les entrées animées en cascade qui ralentissaient l'arrivée d'une catégorie dans le menu mobile.
- **Ce même agent GPT-6 (CI indépendante)** a poussé `004e9c903`, `e1d64aa901`, `9702122ba8` : correction d'une fixture SQL PL/pgSQL (`$;` à la place de `$$;`), déplacement du test exclusivement Node hors du glob Vitest vers `scripts/sql-migration-check.cases.mjs`, mise à jour de `.github/workflows/ci.yml`, suppression de l'ancien fichier `scripts/__tests__/check-sql-migrations.test.mjs`.

## Contrôles réellement exécutés / résultats

- Via GitHub, commits, sources et `AGENTS.md` / handoff lus; la modification simultanée de `src/routes/menu.tsx` a été **détectée**, donc la tentative d'édition locale a été abandonnée avant écrasement. Pas de force-push.
- CI antérieure `40364935041` à `79919b8` : GitHub runner assigné. Nitro build et TypeScript **réussis**, ESLint échoue (25 erreurs Prettier, 21 avertissements) et DB job échoue sur fixture `node --test` (4/5 passés). **Ce ne sont plus des échecs « runnerless »**.
- Le journal de cette CI indique une liste d'erreurs Prettier dans `clover.test.ts`, `site-groups.ts`, tests worker, `postgres-transactions.server.ts` et ses tests, `clover-fulfillment-worker.server.ts`. Corriger après lecture des plus récents commits, ne pas déclencher paiement pour contourner CI. La fixture SQL fautive est corrigée/poussée; CI plus récente encore en cours lors de l'inspection.
- Tentative de contrôle HTTP public de `https://pppmtl.com/menu` et `/healthz` via navigateur externe ici : pages non accessibles depuis cet outil. **Aucun parcours mobile réel ni SHA de déploiement 2026-10-28 vérifié** dans cette session.
- Les 5 tests SQL sont conçus pour `node --test`; attendre leur passage sur un runner GitHub après les corrections et le test PostgreSQL 16 complet.

## Reste à faire — suivi explicite

1. Finir/valider CI du SHA courant, examiner logs complets, régler Prettier, tests Vitest et SQL; ne pas masquer les échecs.
2. Vérifier publication effective du commit `747cb837c` et des suivants via Coolify (application, révision exacte, conteneur sain) ainsi que un véritable test tactile iOS/Android pour menu « Dessert ».
3. Tester sur un échantillon diversifié de produits Clover (burger, pita, trios, pizza, desserts, combo) que l'ordre et les groupes requis sont corrects et que les extras ne deviennent pas choix principaux; valider prix, ID, min/max côté serveur.
4. Clover : credentials préparés hors GitHub mais non prouvés configurés Coolify. `DATABASE_URL`, migration/transactions durables, webhook signé, outbox titres et impression sûre, test sandbox/end-to-end sont des prérequis non terminés (issues #5/#6). Le site ne doit pas facturer avant cette preuve.
5. Continuer d'utiliser les images Canva terminées officielles après vérification des fichiers/manifeste (#18), ne pas faire de remplacement arbitraire.
6. Mettre à jour `docs/AGENT_HANDOFF.md`, `docs/PROJECT_STATUS.md`, `docs/TASK_QUEUE.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md` et `WORKLOG.md` à la fin. Reproduire les notes de cette session dans le dossier Drive « PPP Pizzeria » et, pour le suivi général seulement, « TAKATAK — MAIN / 00 — JOURNAL ».

**Aucun secret, nom d'utilisateur sensible, mot de passe, token ni numéro privé ne doit être copié dans cette note.**
