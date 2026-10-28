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

`npm run build`, `npm test` : **241 tests réussis, aucun échec ni test ignoré**, comprenant TypeScript strict, intégrité, SSR, placement, métadonnées, chargement EN, horloges et régressions existantes. `node tests/seo-smoke.mjs` réussi. Le test de l’artefact GPT a révélé un 404 sur le nouveau graphe SEO ; le Worker sert désormais ses modules exacts sans liaison ASSETS, avec revalidation de l’entrée stable et cache immuable des chunks nommés par hash. Le test de régression reproduit le 404 avant correction.

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
