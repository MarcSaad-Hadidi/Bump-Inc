# Vérification de la publication corrigée

Site public, version 60, publié le 27 octobre 2026 :
https://bump-renaissance-7562d3.plumtuna4.chatgpt.site.
Source Site : `60c95360be681643f8043f4f6f4921dd0e6bc2e3`.
Code correspondant de PR33 : `c7aa38b2b6a35cd3806f45b1a09ed3425f4cc7bc`.
Les rapports ajoutés après publication ne changent pas ce code.

## Résultats mesurés après publication

| Contrôle | Résultat | Périmètre / réserve |
| --- | --- | --- |
| AEOTester | **121/127, 95 %** | Les 18 pages du sitemap, FR/EN, réellement relues. Avant : 114/127, 90 %, sur un échantillon de sept pages ; les périmètres diffèrent. |
| Accès des robots AEOTester | 18/18 points | Vérification de la publication, sans changement des choix d’entraînement. |
| Crawlabilité / indexabilité AEOTester | 18/18 points | Indique les conditions techniques, pas une indexation Google observée. |
| HTML initial AEOTester | 6/6 points, PASS | L’ancienne réserve « HTML presque vide » a disparu. |
| Titres / contenu / accessibilité AEOTester | 8/8 ; 5/5 ; 4/4 | Rubrique automatique, pas un audit humain exhaustif. |
| Grow My Website accueil | **96/100**, 11/12 contrôles | Avant 88/100. Le dernier avertissement compte 583 mots et propose 600 ; aucun remplissage artificiel ajouté. |
| Grow My Website IA | **96/100**, 11/12 contrôles | Réserve « aucune image » : la démonstration est intentionnellement HTML/SVG avec du texte réel. Pas d’image décorative ajoutée pour obtenir un point. |
| Site SEO : page IA | 4 PASS, 1 WARN, 0 FAIL | Auteur collectif reconnu ; réserve sur les qualifications nominatives non fournies. |
| Site SEO : liens du sitemap | **18/18 HTTP 200** | Zéro redirection, lien cassé ou page injoignable. |
| Site SEO : balises cybersécurité | Aucune balise manquante | Canonique, cinq alternatives de langue, Open Graph et Twitter relus sur le public. |

Les seules réserves notées dans la liste des pertes AEOTester concernent les
qualifications/profils d’auteur et la date de première publication. Bump est
correctement identifié comme auteur collectif ; son attribution et son lien
À propos sont visibles. Le détecteur reconnaît davantage les chemins anglais
`/about` que `/a-propos`. Aucun diplôme, biographie nominative, date inconnue,
fausse adresse ou page légale générique n’a été ajouté pour satisfaire ce test.
La date de modification affichée correspond à cette révision réelle.

L’accueil reçoit aussi une réserve d’un autre outil parce qu’il ne contient
pas de FAQ/tableau. Ses huit liens éditoriaux conduisent aux réponses et aux
grilles des pages appropriées. Ajouter une deuxième FAQ juste pour ce critère
doublerait inutilement le parcours. Les absences d’UCP et de serveur d’agents
sont cohérentes avec un site de consultation sans achat automatisé.

Les résultats Magnet 55 et Website Analyzer 73 sont des **mesures de départ**,
pas de nouveaux résultats. Aucun rafraîchissement forcé du cache n’est présenté
comme mesure. Les mentions/citations IA restent non mesurées : la sonde Magnet
a expiré. Aucun classement, trafic ou revenu n’est déduit de ces scores.

## Vérification technique

- Build normal réussi, **200 tests réussis**, smoke HTTP et artefact GPT réussis.
  Artefact : 18 HTML, 36 accès Markdown, découverte, origines résolues et 404.
- Contenu, tables, FAQ et citations partagés entre HTML, Markdown et graphes.
  Auteurs et dates visibles ; géométrie, rigs et moteur de scroll préservés.
- GitHub sur le commit de code ci-dessus : public-site, quality, secrets,
  compose, dependency-review, CodeQL, ses trois analyses et Workers Builds
  terminés avec succès. La revue Codex est consignée sur la PR.
- Aucune validation externe schema.org/Google Rich Results prétendue. Les tests
  locaux, le parsing des blocs et les contrôles de faits sont explicitement
  délimités dans les rapports.

## Navigateur

Accueil React chargé après remplacement de l’édition initiale : pas de doublon
de contenu. Le volume est activable et conserve son contrôleur commun. Styles
calculés : `rgba(255,255,255,.09)` et `blur(12px) saturate(1.5)` ; encre ivoire
sur scène et sombre sur papier.

Consentement vérifié sur une fixture visuelle temporaire reprenant les textes,
classes et CSS réels, sur scène, papier et à 320px. Le test n’a chargé aucun
tracker et la fixture est retirée de la publication. Les tests existants couvrent
les choix, la révocation, le stockage et le filtrage des hôtes de production.

Pages IA, logiciel et cybersécurité, plus IA anglais, contrôlées à 320px :
largeur du document égale au viewport utile de 305px. Le premier contrôle a
révélé 329px pour Workflow ; `min-width:0` contient maintenant le tableau dans
sa région défilante, et la nouvelle mesure est 305/305px. Le tableau reste
accessible au clavier. Accueil sans JavaScript : titre, résumé, chapitres,
liens et image lisibles, sans voile d’ouverture bloquant.

Grille IA et son ancre vérifiées dans le site public, avec ses cinq cas de test.
Les erreurs de métadonnées de l’extension du navigateur cloud sont distinctes
des scripts du site. Ces contrôles Chrome ne sont pas une preuve de FPS natifs
sur iPhone/WebGL ; aucune amélioration GPU n’est revendiquée ici.

Les fichiers `aeotester-report.md`, `aeotester.json` et
`connected-audits.json` conservent les résultats de ce passage. Aucun merge
automatique n’a été réalisé.
