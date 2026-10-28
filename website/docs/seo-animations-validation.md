# Validation des figures SEO fournies

Paquet : `bump-pages-seo.zip`. Les instructions originales sont conservées dans `seo-animations-INSTRUCTIONS-IA.md`.

## Liste demandée

- [x] TypeScript strict : `tsc --noEmit -p tsconfig.anatomy.json`, TypeScript 5.6.3, résolution bundler, JSX react-jsx.
- [x] HTML initial des 18 routes FR/EN : poster et légende, sans SVG Anatomy ; rendu comparé au SSR du `LazyFigure` fourni. FAQ sans figure.
- [x] Chargement à l’approche, remplacement du poster et lecture automatique : les sept modèles FR et les quatre cas ont été ouverts dans le navigateur. Les modèles hors écran sont suspendus. Pause/reprise vérifiée. Correction de cadrage : les sept figures sont limitées par la hauteur de l’écran et disposent d’un titre, numéro et texte pour chacune de leurs 37 étapes natives. À 390 px, hauteur IA identique avant/après chargement et entre les quatre étapes : 464,734375 px. Les panneaux réservent la hauteur du texte le plus long et changent par fondu.
- [x] Lectures initiales IA, logiciel et expertises vérifiées exactement contre les trois phrases des instructions, dans le navigateur.
- [x] Toutes les routes EN génèrent seulement poster, alt et légende anglais. Garde de chargement EN testée sans observer ni import. Contrôle navigateur IA et quatre cas ; audit réseau Lighthouse IA EN : aucun module SEO/React chargé.
- [x] OG et Twitter : PNG fourni correspondant, dimensions 1200×630, texte alt et schéma `primaryImageOfPage` cohérents ; contrôle automatique des 18 routes. Cas et FAQ utilisent `expertises.png`.
- [x] Console sans erreur applicative constatée ; sept pages FR, cas et contrôles EN sans débordement horizontal dans le viewport 390 px. Contrôle desktop 1024 px effectué. Les erreurs de l’extension Chrome sont externes au site.
- [x] Lighthouse mobile : LCP sur le H1 ou l’introduction, jamais la figure ; résultats ci-dessous.

## Intégrité et comportement

- Les 39 fichiers natifs et les 14 images sont identiques au paquet, vérifiés par SHA-256. Géométrie, moteurs, kit et styles natifs ne sont pas réécrits.
- Le `LazyFigure` livré est utilisé sans modification. Les fonctions de chargement sont stables au niveau du module et les modèles sont séparés en modules dynamiques.
- Le cadrage, la lecture complète sous le dessin et le contrôle pause sont assurés par l’hôte du site. Aucun texte n’est superposé au dessin. Aucune dépendance applicative n’a été ajoutée.
- L’adaptateur d’horloge garde les durées natives (1:1), suspend hors écran/onglet masqué/pause, et respecte le mouvement réduit. Les modèles workflow et coffre sont remontés après leur fin native pour répéter le même parcours.
- Les anciennes scènes et horloges de la landing restent inchangées. Le laboratoire de calibration historique est archivé dans les sources ; `/approche` affiche maintenant le modèle attribué par ce paquet.
- `shared/runtime.ts` contient une ligne blanche finale supplémentaire dans le paquet : elle est conservée pour respecter l’intégrité fournie. C’est l’unique remarque de `git diff --check` ; aucun défaut TypeScript ni échec de test n’en découle.

## Vérifications exécutées

`npm run build`, `npm test` : **248 tests réussis, aucun échec ni test ignoré**, comprenant TypeScript strict, intégrité, SSR, placement, métadonnées, chargement EN, horloges et régressions existantes. `node tests/seo-smoke.mjs` réussi. Le test de l’artefact GPT a révélé un 404 sur le nouveau graphe SEO ; le Worker sert désormais ses modules exacts sans liaison ASSETS, avec revalidation de l’entrée stable et cache immuable des chunks nommés par hash. Le test de régression reproduit le 404 avant correction.

## Correction des explications et du cadrage

Les sept modèles ont été vérifiés dans le navigateur à 320×568 et à 1366×650 : zéro débordement horizontal. Le contrôle du SVG réel a révélé une taille intrinsèque dépassant le cadre à grande largeur ; les pistes de sa grille sont maintenant explicitement bornées avec minmax(0,1fr). Après correction, les 14 vérifications confirment un SVG contenu dans son cadre, avec 12 px avant le texte sur téléphone et 14 px sur ordinateur, sans chevauchement. Le dessin, l’explication et la légende restent séparés. Les figures mesurent 413–456 px sur le petit téléphone et 538 px sur la fenêtre d’ordinateur basse. Le paysage 844×390 utilise une composition avec le texte à côté du modèle, de 294 px de hauteur. Les sept modèles sont également vérifiés à 568×320 : cadre de 224 px, dessin et texte dans deux colonnes séparées, légende à l’intérieur du cadre. Les quatre étapes IA ont été parcourues avec les véritables commandes clavier du modèle : le titre et le paragraphe suivent le contrôle natif, sans changement de hauteur ; pause/reprise conservées. Le cadre est commun aux quatre cas d’usage et aux posters EN.

La géométrie, les horloges, les durées, les 39 sources natives et les 14 images restent identiques au paquet. Seul l’hôte affiche les explications. Les tests comparent le nombre d’explications au véritable tableau STATES de chaque modèle.

Le point P1 de Codex sur les anciens schémas d’introduction est corrigé : leur moteur est installé indépendamment des posters Anatomy, en FR et EN, et réinstallé après restauration BFCache. Un test exécute le véritable client avec ses dépendances instrumentées : il reproduit l’absence de démarrage avant correction et vérifie le démarrage/nettoyage/restauration après correction. Les schémas gardent leur propre suspension hors écran, au survol et en mouvement réduit. Le navigateur confirme leur démarrage en FR et la progression automatique du schéma EN (phase 3 vers 4).

## Lighthouse mobile — mesure de laboratoire de la version 80

Lighthouse 13.6.0, Chrome for Testing 156.0.8078.73, profil mobile et ralentissement par défaut. Mesure HTTP du build de production dans un serveur de test éphémère : le navigateur CLI ne peut pas joindre l’URL interne de preview. Cela ne constitue pas une mesure terrain ni une promesse de score réseau en production.

Les premières mesures ont révélé un CLS de 0,249 dû au chargement tardif d’EB Garamond. Le préchargement des deux fontes déjà utilisées corrige ce décalage sans changer la typographie.

| Route | Performance /100 | LCP | CLS | Élément LCP |
|---|---:|---:|---:|---|
| `/services/automatisation-processus` | 99 | 1.66 s | 0 | H1 |
| `/services/integration-ia` | 99 | 1.66 s | 0 | H1 |
| `/services/developpement-logiciel` | 99 | 1.66 s | 0 | H1 |
| `/services/cybersecurite` | 99 | 1.66 s | 0 | H1 |
| `/expertises` | 99 | 1.65 s | 0 | Introduction |
| `/approche` | 99 | 1.65 s | 0 | H1 |
| `/a-propos` | 99 | 1.65 s | 0 | H1 |
| `/cas-d-usage` | 99 | 1.66 s | 0 | H1 |
| `/faq` | 100 | 1.35 s | 0 | H1 |
| `/en/services/ai-integration` | 100 | 1.35 s | 0 | H1 |

## Finition landing et reprise du coffre — 28 octobre 2026

Les six introductions ont un espace supplémentaire de 24–44 px sous leur
sous-titre, sans changement des titres, des scènes ou des arrêts. Vérification
navigateur aux six destinations : 54–56 px sous le texte à 1366×650 ;
111–113 px à 390×844, sans débordement du texte. Le schéma Vision réserve
l’espace réel des libellés entre les cartes dans les fenêtres basses :
6,2 px libres avant chaque carte suivante, schéma complet entre 84 et
628 px dans une fenêtre de 650 px de haut. Sur
mobile, les six libellés restent dans la largeur disponible sans recouvrir
une carte (largeur cliente 375 px, largeur défilante 375 px).

Les trois nouveaux tests de scroll reproduisent l’échec avant correction :
un cran de souris après une traîne récente, une nouvelle impulsion ou une
inversion du trackpad et un geste de faible amplitude. Ils passent après
correction. Les événements reçus pendant le trajet ne sont pas mis en file ;
la décélération seule n’avance pas un dossier. Le navigateur confirme avec
les véritables gestes de scroll : dossiers 1 → 2 → 3 → 4, puis 4 → 3, un
geste par arrêt et étape native correspondante 0 → 1 → 2 → 3 → 2.
Les autres chapitres gardent
leur filtre et leur contrôleur existants.

Le point P2 de Codex sur le coffre est corrigé dans l’hôte SEO. Une inspection
manuelle qui arrête le tour natif autorise une relance après 30 secondes sans
interaction. Les entrées maintenues, la pause choisie et le temps hors écran
suspendent ce délai. Trois tests d’horloge et de nettoyage passent. Dans le
navigateur, un clic sur la face d’un tiroir a armé cette reprise ; une pause
prolongée a conservé la même étape et le même tour, puis la reprise a remonté
le modèle natif à l’étape 0 (tour 2 vers tour 3). Les sources natives n’ont pas
été modifiées.

La nouvelle revue Codex a identifié le même arrêt natif après un refus manuel
dans le Workflow. La reprise après inactivité est désormais commune aux deux
modèles à tour unique : coffre et Workflow. Elle couvre les boutons SVG
d’approbation/refus, les raccourcis A/R et les changements de scénario en plus
des commandes de progression. Un quatrième test vérifie ces interactions avec
la même priorité à la pause. Les cinq autres modèles conservent leurs boucles
natives sans cette reprise supplémentaire.

Contrôle navigateur du Workflow : la commande native a placé le modèle en
validation, le clic réel sur le bouton rouge l’a renvoyé en préparation
(étape 2, tour 0). Après inactivité, le modèle a repris son parcours et atteint
l’étape finale au tour 2, sans quitter la figure ni appuyer sur lecture.
