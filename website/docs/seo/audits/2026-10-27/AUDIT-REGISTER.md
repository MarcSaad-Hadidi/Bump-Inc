# Registre SEO / GEO / AEO — 27 octobre 2026

Cible unique : https://bump-renaissance-7562d3.plumtuna4.chatgpt.site.
Ces contrôles portent sur la publication de validation GPT Site, pas sur les
données Search Console du domaine commercial. Les scores de fournisseurs ont
des périmètres et rubriques différents ; ils ne mesurent pas un classement
mondial, des conversions ou une part de citations.

Résultats après correction : [vérification publiée](after/VERIFICATION.md),
[rapport AEOTester des 18 pages](after/aeotester-report.md) et résultats bruts
dans `after/`. Le code revu est identique à celui qui a été audité ; les
derniers changements du dossier ajoutent uniquement ces preuves.

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
