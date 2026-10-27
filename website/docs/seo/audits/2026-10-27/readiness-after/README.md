# Mesures de la version 62

Publication du 27 octobre 2026, source
`08ab1bfecc2c4b9459fa425f48193128904e5485`, code de PR
`36dd3621cde4e7fffba37339d5769b7732cf55f9`.

- **AEOTester : 124/127, 98 %**, les 18 pages FR/EN. Avant cette passe :
  121/127, 95 %, même périmètre de 18 pages. Les titres/descriptions atteignent
  22/22 ; le texte initial, le Markdown et les contrôles sont reconnus.
- **Grow My Website : 100/100 sur l’accueil**, 12/12 contrôles. Workflow :
  96/100, avec la réserve d’absence d’image bitmap. Ses interfaces restent des
  éléments HTML/SVG réels ; aucune image décorative n’est ajoutée pour le score.
- **Magnet : 68/100**, contre 63. Structure/format **25/25** ; profondeur du
  contenu 62, données structurées 53, autorité 38, technique 95. Deux pages
  échantillonnées, 8 Oui, 1 Non et 11 N/A. Le contrôle négatif mesuré concerne
  LinkedIn/YouTube, dont les profils officiels n’ont pas été vérifiés.
- L’indice de visibilité IA Magnet de 73 est **heuristique**. La sonde a expiré :
  aucune absence de mention et aucune part de citations n’en sont déduites.
- Liens du sitemap : **18/18 HTTP 200**, zéro redirection ou lien cassé.

Rapport Magnet : [Open your full AEO/GEO report](https://aeo.projecta.ai/static/slides/bump-renaissance-7562d3-plumtuna4-chatgpt-site-b24b7048.html).
Le rapport est public et temporaire selon les conditions annoncées par le
fournisseur. Les données utiles sont conservées dans `magnet.json`.

Un contrôle du résumé de l’accueil a retourné un faux négatif malgré la présence
du paragraphe métier sous le H1. La finition le désigne explicitement comme
résumé, avec le même texte pour tous les visiteurs. Elle relie aussi les FAQ
déjà visibles des pages Expertises, Méthode et À propos au JSON-LD et précise
l’activité collective de Bump dans l’attribution. Cette activité de consultant
en technologie provient de l’offre fournie ; ce n’est pas une qualification
personnelle, un diplôme ou une certification ajoutés.

Les résultats de cette finition doivent être datés et distingués du passage
ci-dessus. Les contrôles GitHub/Codex et le rapport final sont liés dans PR33.
AIOSCAN et Pishe restent sans commande d’audit disponible dans la session ;
aucun score n’est annoncé pour eux. Voir `../READINESS-PASS.md`.
