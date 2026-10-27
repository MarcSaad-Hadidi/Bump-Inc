# Accueil : stabilité, mini FAQ et cas illustratifs

Vérification du 27 octobre 2026 sur https://bump-renaissance-7562d3.plumtuna4.chatgpt.site.

## Livraison

Publication propre **72**, source **78c910946448bc09019b2c5ea047b40efc774223**,
publiée à **07:52:00 UTC**. Le diagnostic temporaire est retiré du Worker,
du frontend et du PR. Les géométries, rigs, caméras, courbes d’ouverture et
le contrôleur de scroll retenus restent conservés.

- Quatre questions/réponses courtes dans le vrai landing, après Bump, avec
  détails natifs accessibles. Le HTML initial, le Markdown et FAQPage exposent
  exactement les mêmes réponses en français et en anglais.
- Quatre scénarios : devis à valider, recherche documentaire IA avec sources,
  suivi d’interventions et audit autorisé des accès. Ils sont tous explicitement
  fictifs, sans client, réalisation ou gain mesuré revendiqué.
- Pages /cas-d-usage et /en/use-cases, liens depuis Expertises, recherche,
  aperçus du landing et contenus éditoriaux. Chaque récit précise le contexte,
  le parcours proposé, les décisions humaines, les livrables et les critères
  de vérification.
- Arrêts company-examples et company-questions ajoutés au contrôleur existant,
  avec continuations de lecture selon la hauteur. Aucun second moteur de scroll.
- Liste complète des faits à fournir : ../../../OFFICIAL-INFORMATION.md.

## Cause de l’instabilité et correction

Le reset initial, les styles critiques et les préchargements ne suffisaient
pas : createRoot(document) recrée le head et ses liens CSS. L’Outlet pouvait
donc peindre la scène avant la réapplication des feuilles. Le diagnostic natif
a relevé des déplacements du main et des SVG de navigation (dont une entrée
de 0,536008 à 800 × 600), absents du premier contrôle local de secours.

Le root attend désormais ses styles et les deux polices existantes avant de
monter l’Outlet. Le fond est noir pendant cette préparation et l’animation
originale commence au montage. Le mot Bump superposé conserve la boîte du
titre final. Les liens CSS ont un repli borné ; l’attente des polices ne dépasse
pas 1,5 seconde. Une police bloquée ne peut plus laisser tout le landing vide.

## Vérifications

**207 tests locaux**, build normal, smoke HTTP et artefact GPT réussis :
20 routes HTML et 40 accès Markdown, négociation, découverte, origines natives
et vrais 404. Le nouveau test bloque volontairement les promesses des polices
et vérifie la reprise du contenu ainsi que l’absence de mise à jour après
démontage. Les tests des modèles fournis restent réussis.

Navigateur public : démarrage FR/EN sans écran d’erreur, FAQ ouverte puis
arrivée company-questions (haut du bloc à 98 px sur viewport 1363 × 936),
retour company-examples (haut à 98 px, bas à 856 px), lien vers la page des
scénarios puis changement de langue réussi. Les deux nouvelles pages et
l’édition initiale avaient aussi été contrôlées à 320 px (305 px utiles,
aucun débordement du document). Aucun nouveau message d’erreur applicatif ;
les messages d’extension ne sont pas attribués au site. Le navigateur cloud
emploie le rendu 3D de secours : aucun FPS GPU ou test physique iPhone n’est
revendiqué.

## Mesures de chargement, avec versions et périmètres

| Exécution | Page | CLS | LCP / FCP | TTFB | TBT |
| --- | --- | --- | --- | --- | --- |
| v70, attribution temporaire | accueil FR | 0,000 | 0,61 s | 121 ms | 250 ms |
| v71 propre, un URL | accueil FR | 0,000 | 0,50 s | 120 ms | 135 ms |
| v72 propre, audit de cinq pages | accueil FR | **0,000** | **0,39 s** | 101 ms | 208 ms |
| v72 propre, même audit, détail EN | accueil EN | **0,000** | **0,44 s** | 54 ms | 254 ms |

Les deux derniers TBT sont des avertissements légèrement au-dessus de 200 ms,
pas des résultats verts dissimulés. Les cinq indicateurs étaient verts dans
le contrôle v71 à une page ; les exécutions et leurs contextes restent distincts.
Le CLS de 1,000 des anciens checkpoints n’est plus reproduit dans les deux
éditions de la version finale. Ces valeurs de laboratoire ne sont pas des
données terrain CrUX, des FPS 3D ou une garantie sur tous les appareils.

## Référencement

| Outil | Résultat | Périmètre réel |
| --- | --- | --- |
| AEOTester | 125/127, 98 % | Toutes les 20 pages, v65 ; contenu éditorial identique dans v72. |
| AIOSCAN | 90/100, B, 20/21 | Accueil v71 ; conserve son avertissement sur les titres interrogatifs malgré la FAQ visible. |
| Pishe | SEO 83 / IA 90 | Accueil v71, 33 facteurs ; TTFB distant 1508 ms et coordonnées officielles manquantes. |
| GeoDaddy | GEO 89 / global 74 | Cinq pages v72 ; technique 91, contenu 55, agent 39, performance 96. |

GeoDaddy retrouve la FAQ et six motifs interrogatifs. Sa validation JSON-LD
exige @type à la racine et rejette le graphe valide ; ses critères agents,
OAuth/MCP et paiements ne correspondent pas aux services de cette vitrine.
Aucun faux article, produit, profil, avis, résultat client, API ou endpoint
d’authentification n’est ajouté pour remplir une grille. Les TTFB de Pishe et
GeoDaddy proviennent d’environnements différents et ne sont pas interchangeables.
Les scores mesurent une préparation, pas des classements ou citations IA.

Les preuves brutes voisines conservent les contrôles v70/v71/v72, le rapport
AEO et les réponses finales AIOSCAN/Pishe. Les audits antérieurs et leurs limites
restent dans le registre. Les améliorations factuelles restantes dépendent des
informations officielles du propriétaire, surtout contacts, fondateurs,
présences publiques et projets clients autorisés.
