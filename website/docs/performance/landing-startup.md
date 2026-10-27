# Stabilité initiale du landing

Passe du 27 octobre 2026. Le renderer, ses géométries, ses caméras et les
transitions acceptées restent conservés.

## Point reproduit

Dans le navigateur cloud, à 1366 × 650, le premier `main` passe d’un rectangle
à x8/y8 à x0/y0 lors de l’arrivée des styles. Le diagnostic a enregistré
une entrée de layout-shift de 0,00592154 vers 351,6 ms. Ce déplacement correspond
à la marge HTML par défaut, avant le reset du runtime.

La précédente mesure GeoDaddy de 1,000 ne doit pas être assimilée à ce seul
déplacement. La publication corrigée doit être mesurée à nouveau avant de
conclure sur ce résultat externe ou sur le rendu GPU natif.

## Correction

- Reset minimal de géométrie, couleur et masque noir de l’ouverture dans un
  style critique en tête, avant le bootstrap et les feuilles du runtime.
- Styles de l’édition initiale dans le head, sans dépendre d’un style inséré
  en fin de body. Sa surface de lecture reste indépendante du flux et est
  remplacée lorsque React démarre ; pas de détection de robots.
- Préchargement des deux polices réellement utilisées : EB Garamond normal et
  IM FELL English normal. Pas de changement de police ni de délai artificiel.
- La construction reste idempotente et garde le charset au début du head.
  Les tests préservent les scripts originaux et la géométrie des six chapitres.
- Le titre final conserve sa boîte pendant que le mot Bump se dessine ; le
  mot d’ouverture est superposé et ne change plus la hauteur de la navigation.
- La cause restante a été reproduite dans Chromium natif : le remplacement
  du document par React recréait les liens CSS. Pendant leur application, les
  traits SVG et la navigation apparaissaient avec leur géométrie par défaut.
  À 800 × 600, des entrées de 0,015645, 0,079402 et 0,536008 ont été relevées.
  À 1047 × 859, un trait se déplaçait de y26 à y170 avant le reset de marge.
- Le document React monte maintenant la scène après le chargement de ses
  feuilles et des deux polices existantes. Le fond reste noir pendant cette
  préparation ; la scène démarre ensuite avec son ouverture et ses courbes
  habituelles. Aucun délai minimal ni nouvelle animation n’est ajouté.

Les nouveaux exemples et la FAQ utilisent le contrôleur de scroll existant.
Des arrêts et lectures supplémentaires sont prévus seulement après la dernière
animation Bump ; aucun trajet ou moteur concurrent n’est ajouté.

## Vérification

Build normal, smoke HTTP et **206 tests** réussis, dont la concordance des FAQ
HTML/Markdown/JSON-LD, les ancres FR/EN des quatre scénarios et la position des
styles critiques avant le bootstrap. Les sources des modèles importés restent
identiques aux archives fournies. Le contrôle externe après publication et les
captures sont consignés avec leur version dans le dossier d’audit correspondant.

Sur la publication instrumentée 70, GeoDaddy mesure **CLS 0,000**, LCP/FCP
0,61 s et TTFB 121 ms. TBT 250 ms reste un avertissement de cette exécution,
pas une amélioration revendiquée. Les observations supplémentaires ne signalent
plus les anciens déplacements à 1047 × 859 et 1363 × 936. Le diagnostic
temporaire de rectangles ne recueillait aucun contenu saisi, cookie ou donnée
personnelle ; son code est retiré de la publication finale et du PR.

Ces mesures ne sont ni des données terrain CrUX ni une mesure des FPS 3D.
Le navigateur cloud utilise le rendu de secours ; la mesure externe emploie
son Chromium. La nouvelle publication propre est contrôlée séparément dans
le registre d’audit.

Référence technique consultée :
https://web.dev/articles/optimize-cls/ — réserver la géométrie, charger les
polices tôt et éviter les animations qui modifient le layout. Le diagnostic
temporaire n’est pas livré, aucun suivi ou service de télémétrie n’est ajouté.
