# Vérification finale SEO / GEO / AEO — publication 64

27 octobre 2026. Site audité : https://bump-renaissance-7562d3.plumtuna4.chatgpt.site.
Publication **64**, réussie à **06:17:19 UTC**, source
`81df91271221746b4bb9cfe93ebabbfca43ae493`. Code dans PR33 :
`b9d68c0d6a1aa8df8223032f570a13a25695bc8e`. Ce dossier ajoute les preuves après
publication ; il ne change pas le frontend publié. Aucun merge automatique.

## Résultats réellement mesurés

| Outil | Résultat | Périmètre et limite |
| --- | --- | --- |
| AEOTester v1.2.0 | **125/127, 98 %, Ready for AI** | Toutes les **18 pages** publiques FR/EN de v64. Avant cette passe : 121/127, 95 %, même périmètre. Rapport et JSON voisins. |
| Grow My Website | **100/100**, 12/12 contrôles | Accueil v64, bases SEO sur page ; pas un classement Google. |
| AIOScan | **90/100, B, 20/21 contrôles** | Accueil v64 : accès et lisibilité IA. Une réserve demande des titres sous forme de questions. Ne mesure pas si les IA recommandent Bump. |
| Pishe Website Check | **SEO 90/100, IA 83/100**, global 87 | 33 facteurs sur l’accueil v64 et découverte, accès réel comme quatre robots IA. Réserves sur coordonnées et FAQ de l’accueil. |
| GeoDaddy | **GEO 88/100**, global **73/100** | Cinq pages v64 ; technique 91, contenu 55, agent 39, performance 93. Le global pénalise des fonctions d’agents, d’authentification et de paiement non proposées par cette vitrine. |
| Magnet, job `30913ed1` | **68/100**, structure/format **25/25** | Deux pages de **v62** : 8 Oui, 1 Non, 11 N/A. Le contrôle négatif mesuré concerne les profils officiels LinkedIn/YouTube non vérifiés. |
| Site SEO & AI Crawler | **4 pass, 1 warn, 0 fail** | Accueil **v63**, avec résumé, auteur, titres et données structurées reconnus ; réserve sur la FAQ de l’accueil. Ce n’est pas une nouvelle mesure v64. |

Les résultats de fournisseurs ne sont pas interchangeables. Le précédent
GeoDaddy à cinq pages donnait global 74, GEO 88 et performance 97 : le nouveau
global 73 ne constitue donc pas une amélioration générale. Les métriques de
chargement varient entre les deux passages ; tous les instantanés sont conservés.

- AIOScan : [rapport complet](https://aioscan.com/scan/bump-renaissance-7562d3.plumtuna4.chatgpt.site?utm_source=chatgpt_app&utm_medium=app&utm_campaign=aioscan_app).
  Réserve principale, **10 points** : titres sous forme de questions,
  [guide de l’outil](https://aioscan.com/fix/question-headings/?utm_source=chatgpt_app&utm_medium=app&utm_campaign=aioscan_app).
- GeoDaddy : [réouvrir la configuration des cinq pages](https://geodaddy.dev/playground?url=https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/&max_pages=5).
  Ce lien permet de relancer une analyse ; ce n’est pas un instantané immuable.
- Magnet : [Open your full AEO/GEO report](https://aeo.projecta.ai/static/slides/bump-renaissance-7562d3-plumtuna4-chatgpt-site-b24b7048.html).
  Rapport public temporaire annoncé par le fournisseur ; données brutes dans
  `../readiness-after/magnet.json`.

## Corrections appliquées

- HTML initial commun à tous les visiteurs : résumé métier, six chapitres,
  tableau réel, listes sémantiques et changement FR/EN sans JavaScript. React
  remplace cette édition au démarrage, sans doublon ou détection de robot.
- L’édition initiale est maintenant une surface de lecture au format du
  viewport, avec son propre défilement avant démarrage. Sa longueur ne réserve
  plus un second grand document derrière la scène. Elle disparaît avec le
  montage React ; le contrôleur de scroll du site reste inchangé.
- Attribution collective Bump, biographie et rôle métier factuels, liens
  `rel=author`, révisions expliquées et démarche éditoriale. La première
  publication des 16 pages éditoriales est prouvée par la publication v47 du
  26 octobre ; celle des deux landings n’est pas inventée.
- FAQPage relié aux questions et réponses réellement visibles sur les pages
  éditoriales concernées. Les tableaux, FAQ, HTML, Markdown et métadonnées
  partagent le même catalogue. L’accueil identifie Bump comme sujet du WebPage.
- Calculateur Workflow fonctionnel : volume et durée modifiables, formule
  locale, unités et messages FR/EN. Les valeurs sont des hypothèses clairement
  indiquées, sans économies ou résultats clients promis.
- Tableaux propres à la méthode et à la préparation du mandat. Lien vers le
  code public identifié comme source technique de première partie, et non
  preuve indépendante de résultats. Titres et descriptions clarifiés ; la
  description française de l’accueil est raccourcie.

## Exécution et revue

- **203 tests réussis**, aucun échec. Build normal, smoke HTTP et smoke de
  l’artefact GPT réussis : 18 routes HTML, 36 accès Markdown, découverte,
  origines, 404 et médias/scènes conservés.
- Les dix checks GitHub du code `b9d68c0d6a` sont réussis : public-site (dont
  runtime Docker), quality, compose, secrets, dependency-review, CodeQL, ses
  trois analyses et Workers Builds.
- Codex a revu `b9d68c0d6a` sans problème majeur signalé, réponse
  `6435249448` à 06:20:20 UTC. Une nouvelle demande de review suit le commit
  documentaire des preuves ; son résultat final est dans la conversation de
  PR33 et sa description, sans nouvelle modification du frontend.

## Vérifications navigateur

- Calculateur réel : 25/12 donne 5 heures, 50/12 donne 10 heures, 1/0,1 donne
  0,1 minute ; une valeur vide affiche une demande de correction. Anglais testé.
- À 320px : Workflow, Méthode, À propos et FAQ tiennent dans les 305px utiles.
  La nouvelle lecture initiale sans JS fait aussi 305px pour 305px de largeur,
  740px de hauteur visible et 6812px de lecture interne ; aucun texte supprimé.
- Le changement FR/EN sans JS fonctionne. Démarche éditoriale, sources et
  attribution vérifiées. Les pages restent lisibles sans mouvement.
- Accueil public v64 après rechargement : React démarre, l’édition initiale
  est retirée, titre/canonique/description corrects et aucun écran « Something
  went wrong ». Les erreurs de métadonnées de l’extension cloud sont distinctes
  des scripts du site.
- Diagnostic local temporaire de démarrage : une entrée de layout-shift,
  environ **0,000187**. Instrumentation et trace retirées du livrable ; résultat
  brut conservé ici. Le navigateur cloud utilise le rendu 3D de secours.

## Réserves maintenues, sans faux signaux

**CLS GeoDaddy : reste ouvert.** La page d’accueil sélectionnée affiche **1,000**
en v64 malgré la correction de la lecture initiale ; LCP/FCP 0,62s, TTFB 169ms,
TBT 6ms. Le diagnostic local du rendu de secours ne reproduit pas ce déplacement.
Il ne prouve donc pas que le cas externe ou le GPU natif soit corrigé. Le score
performance global de 93 ne doit pas masquer cette réserve. Les scènes, rigs,
caméras et courbes de scroll ne sont pas réécrits pour satisfaire une mesure
non reproduite. Aucun test physique iPhone ou FPS GPU natif n’est revendiqué.

**JSON-LD GeoDaddy : faux négatif identifié dans le code du fournisseur.**
`src/analyzers/content.rs` vérifie `val.get("@type")` à la racine et rejette
le document `@context` + `@graph` utilisé ici, dont les entités ont toutes un
type. Les tests de schéma/parité et AEOTester reconnaissent le graphe. Aucun
Article ou HowTo sans contenu correspondant n’est ajouté pour gagner des points.
Source : https://github.com/borabiricik/geodaddy-cli/blob/main/src/analyzers/content.rs.
Les longueurs signalées par son interface correspondent aux octets UTF-8 :
le titre de 53 caractères y apparaît comme 57. C’est une observation, pas une
raison de remplacer les accents français.

**FAQ et titres de l’accueil.** La composition cinématique et ses six titres
acceptés sont conservés. Des questions et FAQ détaillées existent dans les pages
liées par la navigation principale, y compris la page FAQ. La rubrique limitée
à l’accueil ne donne pas crédit à ces pages distinctes. Ni questions cachées
ni faux FAQPage absent du contenu visible ne sont ajoutés à l’accueil.

**Coordonnées et autorité.** Pishe et Magnet demandent notamment téléphone,
adresse, horaires et profils sociaux. Les recherches n’ont pas confirmé les
profils officiels LinkedIn/YouTube ; aucune personne n’est déduite de GitHub.
Le formulaire reste la démonstration UI demandée, sans faux envoi de prospect.
Des coordonnées approuvées, biographies et preuves clients consenties permettront
des compléments réels lorsqu’ils seront fournis.

**Plafond conditionnel Magnet.** Avec onze N/A à 2,5 points et neuf contrôles
mesurables à 5, le maximum conditionnel est **72,5/100** tant que ces N/A ne sont
pas mesurés. L’indice de visibilité 73 est heuristique ; la sonde IA a expiré.
Ces résultats ne mesurent ni citations sans marque ni part de visibilité.

**Disponibilité des nouveaux outils.** AIOSCAN et Pishe n’exposaient pas leurs
commandes lors du premier contrôle. Elles sont devenues disponibles ensuite :
les deux scans ont bien été exécutés, puis relancés sur v64. Les anciennes notes
de non-disponibilité décrivent uniquement le checkpoint précédent. Aucune demande
de contact à Pishe/Raboti n’a été envoyée et aucun compte payant n’a été créé.

Pas de faux manifeste MCP/A2A/OAuth, service d’achat, compétence d’agent ou produit
disponible. Les politiques des robots d’entraînement restent inchangées. Les
scores de préparation ne garantissent ni classement ni recommandation par les IA.
