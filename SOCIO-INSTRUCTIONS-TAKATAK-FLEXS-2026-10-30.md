# Instructions — Takatak + Flexs — pour tous les agents et pour le dev
Signé : SOCIO, Agent Lévesque — 2026-10-30, Montréal.
Fichier déposé une fois dans Google Drive (takatak.ca@gmail.com, jamais OneDrive) et dans GitHub, comme toutes les notes de travail. Aucun mot de passe, aucun code à usage unique, aucun secret dans ce fichier.

## 1. Ce qui est vrai ce soir (vérifié, pas deviné)
- takatak.ca : espace Owner existant "Matthieu Wallace Barnard", brands = 0, locations = 0 (vérifié 01:23–01:28 EDT 2026-10-30).
- Création de brand PPP rejetée 01:23 et 01:28 EDT avec "This workspace cannot add brands while Social access is locked". Le "pas de bloc" relayé par le dev n'était PAS effectif à 01:28 EDT.
- takatak.ca a flappé 200/503 à 01:39–01:42 EDT pendant que le dev travaille en direct. Ne pas relancer de passe en boucle pendant un flapping.
- Po Poulet : popoulet.ca@gmail.com rejeté 01:02 EDT, "Email address not found". Une identité par e-mail ne peut pas être créée par l'onglet E-mail si l'e-mail n'est pas déjà confirmé.
- Scope de ce soir, Pierre 01:36–01:37 EDT : IDENTITÉ SEULEMENT sur takatak.ca, PAS de création de brand — le dev s'occupe des brands et du matching ensuite. Tous les 30 e-mails en mémoire / connectés Gmail sont à tester sur takatak.ca SEULEMENT.
- Passe sign in / sign out, Pierre 01:41 EDT : un e-mail à la fois, Po Poulet d'abord, sign in, sign out immédiatement, fermer la page tout de suite après, PPP exclu (session Owner dans une autre fenêtre, ne pas la déconnecter). Plan sauvegardé, NON exécuté (bloqué 01:42 par le 503, aucun des 28 testé dans cette passe).
- Flex = flexs.ca = FLEXS, marketplace de leads indépendant, partie de l'écosystème TakaTak, GitHub takatakca/flexsca (TypeScript, Lovable, créé 2026-08-22, mis à jour 2026-10-16). Clients postent des demandes, professionnels envoient des devis, débloquent des contacts avec des crédits, profils d'entreprise. Supabase + Stripe. TakaTak V1 reçoit des événements d'attribution vérifiés côté serveur ; la connexion live exige déploiement + identifiants.
- flexs.ca en live ne sert PAS encore l'app flexsca (copie lue : blog WordPress vide "My Blog"). Mise en ligne NON faite : le README exige d'appliquer et vérifier les migrations backend + Edge Functions AVANT de promouvoir le frontend. Ne pas déployer le frontend seul.

## 2. Instructions pour tous les agents (à suivre, sans exception)
- Lire le pad de la brand AVANT d'écrire quoi que ce soit, et y loguer après : date, agent, action, résultat, ancre Drive/GitHub. Un pad par dossier de brand, toujours.
- Une brand à la fois, un writer par plateforme (Facebook : UN writer total). PPP d'abord, Po Poulet ensuite, puis les autres dans l'ordre du pad.
- Informations réelles et vérifiées seulement. Ne jamais inventer prix, heures, menus, images, liens, e-mails, adresses. Ne jamais utiliser comme actuel : 6241 boul. Léger, 3583 rue Ste-Catherine E. Ne pas toucher Nutrition Shake NDG (suspendu). ooeuf.ca@gmail.com : exclu du tri / édition de courriel, sauf l'ordre explicite de Pierre ce soir pour la vérification d'identité takatak.ca seulement.
- Transfert, jamais fermeture : une fiche existante se transfère (adresse modifiée), on ne la ferme pas, on ne la remplace pas en la fermant.
- Pas de contenu IA sur les pages / sites de brands. Posts Facebook uniquement via Canva, avec photos réelles déjà triées, jamais directement depuis Muse. Exception étroite, Pierre 2026-10-28 : visuels de devanture pour les applications marketplace seulement.
- Pas de post, fusion, changement de Shop / catalogue, activation d'agent IA, dépense, sans l'approbation spécifique pour cette action.
- Sur takatak.ca : après chaque sign in, sign out immédiatement et fermer la page. Ne laisser aucun compte connecté à la fin d'une étape. Ne pas entrer de mobile, de mot de passe, de carte, de checkout. Un code OTP ne se met jamais dans une note, un courriel ou un fichier.
- Laisser une trace de TOUT le travail, avant / pendant / après, une fois dans Drive + GitHub, signé "SOCIO, Agent Lévesque", sans doublon. Si un résultat n'est pas noté, il n'existe pas pour les autres agents.

## 3. Instructions pour le dev / opérateur (Mathieu)
- Déblocage takatak.ca, trois routes légitimes seulement : (a) vars de test Coolify appliquées + redéploiement, avec le bon UUID de workspace, retrait le 2026-11-02 ; (b) vrai plan Social payé par le Owner + webhook Stripe ; (c) décision de code explicite pour un plan à 0 $ (catalogue + code de plan payant + prix Stripe + redéploiement). Un produit Stripe à 0 $ seul ne débloque PAS Social (le webhook vérifie le code de plan, pas le montant).
- Confirmer quand le site est stable après un déploiement, pour relancer la passe sign in / sign out (plan §1) sans boucle.
- Pour chaque e-mail rejeté ("Email address not found"), ajouter / confirmer l'e-mail côté compte, ou indiquer la voie d'inscription mobile (nom + mobile par brand — ne pas réutiliser un seul mobile pour tous sans confirmation).
- Flexs : appliquer et vérifier les migrations backend + Edge Functions d'abord (voir docs/FLEXS_RELEASE.md), puis seulement promouvoir le frontend. Indiquer la cible (Coolify ou Lovable) et fournir les identifiants Supabase par voie sécurisée, jamais en chat. Confirmer aussi ce que "les comptes pour tous, attachés à un project GitHub" doit créer exactement : comptes marchands Flex par brand, ou identités takatak attachées à takatak-v1 ?
- Questions ouvertes de Pierre, en attente : Flex = flexs.ca confirmé 03:35 EDT ; qui crée les identités (Pierre lui-même ou SOCIO quand le site est stable) ; heures NDG Po Poulet et 6280 vs 6284 ; adresse / heures Viennoise ; mapping Pita Libanais et popouletmtl@gmail.com.

## 4. Ordre de reprise, quand le site est stable
1. Relancer la passe sign in / sign out takatak.ca (plan §1), Po Poulet d'abord, un par un, sign out + page fermée chaque fois.
2. Rapporter le tableau des 30 : accepté (OTP, identité notée, sign out fait) ou rejeté (message exact).
3. Ensuite seulement, avec le dev : brands takatak, une par une, PPP d'abord, NDG comme location après la brand, puis connexions Flex / autres, quand chaque connexion est confirmée.
4. Pads par brand mis à jour en place à chaque étape, Drive + GitHub, sans doublon.
