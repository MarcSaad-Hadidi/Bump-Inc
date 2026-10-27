# Registre SEO / GEO / AEO — 27 octobre 2026

Cible unique : https://bump-renaissance-7562d3.plumtuna4.chatgpt.site.
Ces contrôles portent sur la publication de validation GPT Site, pas sur les
données Search Console du domaine commercial. Les scores de fournisseurs ont
des périmètres et rubriques différents ; ils ne mesurent pas un classement
mondial, des conversions ou une part de citations.

Dernière passe : **publication 72**, mini FAQ et cas illustratifs, **207 tests**.
Le CLS de l’accueil est désormais **0,000 en FR et EN** dans GeoDaddy v72.
Les avertissements TBT 208 / 254 ms restent visibles ; aucun score global
parfait n’est revendiqué. Le catalogue compte **20 routes** ; AEOTester a
audité ces 20 pages à **125/127, 98 %** (v65, contenu inchangé ensuite).
AIOSCAN v71 : **90/B**, Pishe : **SEO 83 / IA 90**, GeoDaddy v72 :
**GEO 89 / global 74**, performance 96. Les audits précédents restent ci-dessous.
[Preuves de cette passe](home-stability/VERIFICATION.md) et
[informations officielles requises](../../OFFICIAL-INFORMATION.md).

Checkpoint précédent de la **publication 64** :
[vérification publiée](final/VERIFICATION.md),
[rapport AEOTester des 18 pages](final/aeotester-report.md) et preuves brutes
dans `final/`. **203 tests**, AEO **125/127 (98 %)**, SEO accueil **100/100**.
AIOSCAN **90/100**, Pishe **SEO 90 / IA 83**, GeoDaddy **GEO 88 / global 73**
sur cinq pages, avec sa réserve CLS conservée. Les commandes AIOSCAN et Pishe
sont devenues disponibles après le premier contrôle et ont été utilisées.
Magnet **68/100** a mesuré v62 ; les onze critères non mesurés et son détail
restent dans `readiness-after/`. `after/` conserve le checkpoint antérieur
à 121/127 et ne décrit pas le dernier résultat. Le commit documentaire final
ajoute uniquement les preuves ; le frontend publié ne change pas.

## Outils utilisés et décisions

| Outil demandé | Contrôle effectivement réalisé | État de départ / décision appliquée |
| --- | --- | --- |
| Site SEO & AI Crawler Audit | Lecture IA d’une page service ; robots et 14 robots IA ; échantillon de liens depuis le sitemap | Page IA : 4 signaux sur 5 ; attribution manquante. 18/18 pages HTTP 200, sans redirection/lien cassé. Attribution Bump, résumé et FAQ cohérents ajoutés. |
| Grow My Website | Scan de l’accueil et cadre de croissance en dix étapes | 88/100, 10/12 contrôles ; faible texte initial et absence d’image détectée. Contenu métier et image avec alt livrés dans le HTML initial. Pas de remplissage pour atteindre un nombre de mots. |
| AEOTester | Audit réel du site public, rubrique v1.2.0 | 114/127, 90 %, sept pages échantillonnées parmi neuf découvertes. Attribution et texte initial améliorés ; rapport de départ conservé dans `baseline/`. |
| Website Analyzer — SEO & AEO | Analyse terminée, sept pages échantillonnées | 73/C : conversion 60, recherche 71, IA 76, sécurité 94, accessibilité 100, vitesse non mesurée. Le diagnostic classe incorrectement le site dans Shopify : recommandations panier/achat rejetées. |
| Magnet AEO/GEO | Job terminé, deux pages échantillonnées ; lecture du rapport | 55 global : structuration 53, profondeur 25, entité 38, technique 95, visibilité estimée 72. Résumé du contenu, attribution collective, liens d’approfondissement et contenu HTML renforcés. La sonde de mentions IA a expiré : aucun résultat de citation mesuré. |
| GEO Content Engineering | Application de la méthode aux pages et à leur publication | Réponses autonomes, faits Bump cohérents, grilles propres à chaque service, sources primaires, contrôle des promesses et frontière des futurs produits. |
| GEO Prompts & Content Analysis | Matrice de 30 questions et comparaison de trois entreprises québécoises | Recherche et calculs documentés dans `GEO-PROMPTS.md`, `CONTENT-GAP.md` et `competitor-extraction.json` ; réponses intégrées dans les pages existantes en FR/EN. |

Rapports des fournisseurs :

- [Open your full AEO/GEO report](https://aeo.projecta.ai/static/slides/bump-renaissance-7562d3-plumtuna4-chatgpt-site-47e9eb66.html)
  — Magnet, job `371924cb`, photographie de la version de départ. Rapport public
  temporaire annoncé par le fournisseur ; aucun nouvel audit forcé ou payant.
- [Website Analyzer](https://mcurtismccoy.com/website-analyzer/?wa=Kq4r2RDqkOz9XHKuQDd6K4n8bGbkJ3EW&utm_source=chatgpt&utm_medium=plugin&utm_campaign=website-analyzer)
  — analyse `Kq4r2RDqkOz9XHKuQDd6K4n8bGbkJ3EW`, résultat mis en cache
  quatorze jours. Un cache ne constitue pas un audit après correction.

## Corrections publiables

- HTML initial de l’accueil utile avec ou sans JavaScript, huit liens éditoriaux,
  six résumés de chapitres et image décrite. Même réponse pour tous les visiteurs.
  React remplace ce contenu lorsqu’il démarre ; scènes et moteur de scroll conservés.
- Huit histoires distinctes par langue conservées. Ajouts propres aux services :
  choix d’un workflow, cas de test IA, réception d’un logiciel et cadrage d’audit.
- Auteur collectif réel Bump, lien À propos et date de cette révision visible ;
  pas de personnes, qualifications, avis ou dates de première publication inventés.
- FAQPage des services conforme aux questions et réponses visibles ; Service,
  fil d’Ariane, canoniques, alternatives linguistiques et découverte générés depuis
  le même catalogue. Sources primaires NIST et OWASP dans HTML, Markdown et citations.
- Volume et consentement : verre à 9 %, blur 12px, encre adaptée au fond,
  repli sans blur et notice mobile au-dessus du volume. Consentement et filtrage
  des hôtes de production inchangés ; aucun suivi ajouté sur le GPT Site.
- Tableau workflow contenu dans sa région de lecture sur écran étroit ; crédit
  éditorial aligné sur les marges du contenu.

## Limites et mesures à conserver

Les robots de recherche ont accès aux pages auditées. Aucun changement de choix
des robots d’entraînement n’a été ajouté. Pas de manifeste d’achat, faux serveur
MCP, offre logicielle disponible ou balisage de certification pour gagner des
points dans une rubrique incompatible.

Les contrôles automatiques de syntaxe/schema et les tests locaux sont délimités
dans les rapports ; Google Rich Results et validator.schema.org n’ont pas été
exécutés. Google indique que les FAQ enrichies ne sont plus affichées depuis
mai 2026, et que ses fonctions IA ne nécessitent pas de fichiers spéciaux.
Les FAQ et fichiers Markdown restent utiles comme descriptions et formats de
lecture, sans promesse de classement.

Sources primaires consultées :

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/updates
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://schema.org/Service
- https://www.nist.gov/itl/ai-risk-management-framework
- https://asvs.owasp.org/

Le résultat dépend aussi de preuves réelles encore non fournies : profils des
fondateurs, cas clients consentis, coordonnées professionnelles à publier et
accès aux métriques du domaine final. Ne pas les remplacer par de faux signaux.
Le formulaire reste la démonstration UI demandée ; aucun envoi de prospect
n’est annoncé. La mesure de trafic, des mentions et des demandes qualifiées
doit distinguer les données observées des prédictions d’outils.

## Compléments demandés en fin de passe

| Outil | Exécution et décision |
| --- | --- |
| AIOScan | Guide get-started appliqué ; scans publics v63 puis v64 : 90/B, 20/21. Réserve de titres interrogatifs sur l’accueil ; les titres cinématiques acceptés sont conservés et les FAQ dédiées restent liées. |
| Pishe Website Check | Scans v63 puis v64 : 33 facteurs, SEO90/IA83. Coordonnées et profils non fournis ne sont pas inventés ; aucun contact envoyé à Raboti. |
| GeoDaddy | Site utilisé dans le navigateur, un puis cinq chemins, Web Vitals actifs. Édition initiale stabilisée, description raccourcie et sujet relié à Bump ; le CLS externe reste non reproduit localement. Faux négatif du validateur de graphe et rubriques agents/paiement documentés, sans fausses fonctions. |
