# Application native MontrealHub (iOS + Android)

Vraie application native de PPP Pizzeria et de ses restaurants, écrite en **React Native avec Expo** (SDK 57). Chaque
écran est un écran de téléphone natif. Ce n'est pas le site dans une boîte (la version PWABuilder actuellement
soumise à Google Play et Amazon). Une seule base de code donne l'app iPhone et l'app Android.

- Nom de paquet Android et identifiant iOS : `com.pppmtl.montrealhub` (le même que la version des magasins, pour la
  remplacer plus tard par une mise à jour).
- Version : `2.0.0`, code de version Android `100` (plus haut que celui de PWABuilder).
- Même allure que pppmtl.com : fond noir, boutons rouges carrés, titres Anton en majuscules, petites étiquettes or.

## Ce que fait l'app

| Écran | Contenu |
|---|---|
| Accueil | « Envie de PPP? », pour emporter ou livraison, ouvert maintenant, les plus commandés, offres, catégories, restaurants |
| Menu | Toute la cuisine de NDG par catégorie, puces pour sauter d'une catégorie à l'autre |
| Plat | Photo, description, options Clover avec leurs règles et prix, note pour la cuisine, quantité |
| Panier | Lignes, quantité, modifier, retirer |
| Paiement | Pour emporter ou livraison (zone vérifiée), coordonnées, pourboire, carte (page Clover) ou Interac, total avec taxes |
| Commande | Suivi en direct (reçue, acceptée, en cuisine, prête), payer, annuler si non payée, appeler, recommander |
| Commandes | Les commandes faites sur ce téléphone |
| Restaurants | Les 17 noms ; chacun a sa page à ses couleurs, ses plats, et ses liens vers les applications de livraison |
| Recherche | Recherche sans accents dans toute la cuisine |
| Plus | Langue, cuisine (heures, itinéraire, appel), aide, confidentialité, suppression des données, effacer l'app |

L'app parle au site (`https://pppmtl.com`) par un petit accès réservé à l'app : `/api/mobile/v1/catalog` (menu public)
et `/api/mobile/v1/orders/{check,place,status,cancel}`. Ces commandes passent par **le même service de commande** que
la page de paiement du site : le serveur reprend tous les prix de Clover, la carte est payée sur la page sécurisée de
Clover, puis la page `app-return.html` ramène le client dans l'app. Aucun numéro de carte ne passe par l'app. Chaque
commande est protégée par un jeton signé gardé dans le coffre du téléphone (Keychain / Keystore).

Si la commande en ligne n'est pas active sur le site (clés Clover absentes), l'app l'affiche et propose d'appeler ou
de passer par les applications de livraison, comme le site.

## Construire l'app (gratuit, sur GitHub)

Le flux `.github/workflows/mobile.yml` tourne à chaque modification de `mobile/` :

1. vérification des types, tests et paquet JavaScript ;
2. **Android** : `MontrealHub-native-test.apk` (à installer sur un téléphone pour tester) et
   `MontrealHub-native-unsigned-for-play.aab` (format Google Play) — dans les « Artifacts » de l'exécution ;
3. **iOS** : compilation pour le simulateur d'iPhone (prouve que l'app iPhone compile, sans compte Apple).

Les fichiers Android du flux sont signés avec la clé de test publique d'Android : bons pour essayer, **pas pour Google
Play**.

## Publier sur Google Play (plus tard, après les soumissions en cours)

Ne rien changer tant que la version PWABuilder est en examen chez Google et Amazon. Ensuite, la clé de téléversement
reste **sur le PC du propriétaire** (fichier PWABuilder) et ne va jamais sur GitHub ni sur Drive :

```sh
# une fois : Java 17 installé (il fournit jarsigner)
jarsigner -keystore signing.keystore -signedjar MontrealHub-2.0.0.aab \
  MontrealHub-native-unsigned-for-play.aab my-key-alias
```

Le nom d'alias et le mot de passe sont dans `signing-key-info.txt` du ZIP PWABuilder, sur le PC. Ensuite, téléverser
`MontrealHub-2.0.0.aab` comme nouvelle version de l'app existante. Amazon accepte l'APK signé de la même clé.

## Apple (en dernier)

Le code iPhone est prêt. Il faut le compte Apple Developer (99 $ US par an, décision du propriétaire), puis une
signature Apple pour TestFlight et l'App Store.

## Développer

```sh
cd mobile
npm ci
npx expo start          # aperçu avec un build de développement
npx tsc --noEmit        # types
npm test                # tests de logique
python3 scripts/make-icons.py   # redessine les icônes depuis public/icons/ppp-512.png
EXPO_PUBLIC_SITE=http://localhost:3000 npx expo start   # contre un serveur local du site
```

Les dossiers `ios/` et `android/` sont générés (`npx expo prebuild`) et ne sont pas versionnés.
