# SC4NNER — inscription + connexion TAKATAK : ce qui est fait, ce qui reste

— SOCIO, Agent Lévesque · 2026-11-14 (travail du 2026-11-13 au soir)

## Votre ordre

« Il n'y a aucun moyen de s'inscrire ou de se connecter dans cette app.
J'ai besoin d'une inscription et d'une connexion, avec la même techno
que TAKATAK. Il faut que ça marche. Je veux que des gens en ligne
puissent tester pour voir si tout fonctionne côté back-end. »

## Ce qui est construit

SC4NNER est branché sur TAKATAK V1, exactement comme BEH4VIOR :

- **Bouton « Se connecter avec TAKATAK »** sur la page de connexion de
  sc4nner.takatak.ca (il n'apparaît que quand le pont est prêt).
- **Inscription** : elle se fait sur takatak.ca, avec le mobile et un
  code SMS — comme aujourd'hui. SC4NNER ne crée aucun compte et ne
  garde aucun annuaire d'utilisateurs.
- **Connexion** : TAKATAK confirme le compte, SC4NNER ouvre une
  session de 12 heures au plus. Chaque testeur voit seulement ses
  propres étiquettes ; personne ne voit celles des autres.
- **Le compte atelier reste en place** en repli pour vous (nom
  d'utilisateur + mot de passe), une fois ses trois valeurs posées
  dans Coolify.

Code : branche `socio/sc4nner-takatak-auth-2026-11-13`, **PR #1**
ouverte — https://github.com/takatakca/SC4NNER/pull/1 — en attente de
fusion par Matt (lui seul fusionne sur `main`).

## Vérification — honnête

- **En local, tout passe** : vérification du code, construction,
  **9 tests sur 9**, et un essai complet du vrai serveur contre un
  faux TAKATAK : connexion, session, étiquette sauvegardée et relue.
- **En direct sur sc4nner.takatak.ca, PAS ENCORE** : l'essai réel avec
  un vrai compte test n'est pas possible tant que les deux points
  ci-dessous ne sont pas faits. Je ne prétends pas que ça marche en
  ligne tant que cet essai n'a pas passé.

## Ce qu'il reste à faire (deux gestes, côté propriétaire)

1. **Matthieu — dans takatak-v1** : créer l'expérience `sc4nner`
   (copie du pont BEH4VIOR : deux routes, entrée dans le tableau de
   bord, secret de service). Détail technique dans
   `docs/TAKATAK_V1_BRIDGE.md` dans la PR.
2. **Propriétaire — dans Coolify, app `sc4nner`** : ajouter trois
   variables (`TAKATAK_SC4NNER_LAUNCH_URL`,
   `TAKATAK_SC4NNER_EXCHANGE_URL`, `TAKATAK_SC4NNER_SERVICE_TOKEN`),
   puis **Redeploy**. Détail dans `DEPLOY.md §9` dans la PR.

Après ça, la vérification est simple : `sc4nner.takatak.ca/api/release`
doit afficher `"takatak":"ready"`.

## Comment inviter les testeurs (une fois le point ci-dessus fait)

1. Envoyez-leur ce lien : **https://sc4nner.takatak.ca**
2. Le testeur clique **« Se connecter avec TAKATAK »**.
3. S'il n'a pas de compte TAKATAK, il en crée un sur **takatak.ca**
   (mobile + code SMS), puis revient sur le lien.
4. Il se connecte, crée une étiquette, clique **Sauvegarder**,
   se déconnecte, se reconnecte : son étiquette doit toujours être là.
5. Un deuxième testeur ne doit pas voir l'étiquette du premier.

Si une étape bloque, dites-moi à quelle étape et ce qui s'affiche —
je corrige à partir de là. Aucun mot de passe, code ou jeton ne doit
jamais être envoyé par message : la connexion passe par TAKATAK.

— SOCIO, Agent Lévesque
