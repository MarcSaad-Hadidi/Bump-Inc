# Complément de préparation SEO / GEO / AEO

Révision du 27 octobre 2026 après l’audit Magnet `ce41b140` : **63/100**,
deux pages échantillonnées, sept critères positifs, deux négatifs et onze non
mesurés. Référence complète : `magnet-63-baseline.json`.

## Interpréter l’objectif de score

La grille rapide donne 5 points à Oui, 0 à Non et 2,5 à N/A. Tant que les onze
N/A restent non mesurés, le maximum conditionnel est **9 × 5 + 11 × 2,5 = 72,5**,
soit environ 73/100 après arrondi. Atteindre 100 dans cette grille suppose aussi
que le fournisseur mesure les critères inconnus. Les qualifier positivement
sans preuve fausserait la mesure.

Le test IA de cet audit a obtenu une mention dans une réponse à « What is Bump
and what do they offer? ». La question nomme déjà Bump. L’audit indique zéro
citation et ne mesure pas la découverte sur des questions sans marque. Il ne
constitue pas une part de mentions du marché.

## Changements appliqués

- Accueil initial : vrai tableau de processus et contrôles, étapes numérotées du
  mandat, liste de liens éditoriaux et changement de langue utilisable sans JS.
  Les six chapitres sont conservés. HTML et Markdown partagent ces informations.
  React remplace cette édition initiale lors de son démarrage, pour tous les
  visiteurs, sans détection de robot ou texte caché.
- Auteur : biographie collective factuelle de Bump, liens `rel=author` vers la
  démarche éditoriale en FR/EN, attribution, révisions expliquées et sources.
  L’Organization pointe vers À propos, dont le sujet principal est Bump ; le
  hub décrit ses quatre expertises dans un ItemList lié au contenu visible.
- Dates : première publication des **16 pages éditoriales** le 26 octobre 2026,
  dans le JSON-LD, le texte et le Markdown. La date initiale des deux landings
  reste inconnue à cette précision ; aucun `datePublished` n’y est inventé.
- Contenu propre : calcul interactif de charge manuelle sur Workflow, avec un
  exemple de 25 demandes × 12 minutes = 300 minutes = 5 heures. Valeurs d’exemple
  et hypothèses modifiables clairement indiquées. Les opérations restent locales
  au navigateur ; aucun gain client ou retour financier n’est promis.
- Méthode : tableau des livrables et décisions aux cinq étapes. FAQ : grille
  pour préparer une discussion sans transmettre de données sensibles. À propos :
  démarche éditoriale et lien vers les sources publiques de cette vitrine.
- Titres et descriptions : formulation locale plus précise et descriptions
  raccourcies lorsque nécessaires, sans ajout de faux tarifs ou de superlatifs.

Les stories HTML/SVG distinctes, les scènes 3D, leur géométrie, le scroll assisté,
les contrôles de musique/verre et la logique de consentement sont conservés.

## Preuve de première publication

La source `src/bump/seo/pages.js` apparaît dans le commit
`44cdb624f1344aa9df14c287c670cb7c18b5bb31`. Ce même commit a été enregistré dans
la **version Site 47**, puis publié par
`appgdep_6adeb1a52e1c81919c5b7b51ee0c2d0e` : statut `succeeded`, date du retour
de publication **2026-10-26T01:51:46.934843Z**. Les dates de l’édition utilisent
UTC. Il ne s’agit ni d’une date de création de l’entreprise ni d’un diplôme.

## Éléments externes

Les recherches publiques n’ont pas confirmé de profils LinkedIn/YouTube
officiels ni de biographies nominatives pour Bump. Aucune URL ressemblante ou
personne déduite d’un compte GitHub n’est présentée comme fondateur. Le lien
GitHub de la vitrine est une source technique vérifiable ; ce n’est pas une
mention indépendante dans la presse ni une preuve de résultats clients.

AIOSCAN a été sélectionné et son skill `get-started` lu. Ses commandes d’audit
ne sont pas exposées dans cette session. Aucune commande Pishe n’est exposée
non plus ; la recherche de plugins n’a pas résolu cette disponibilité. Aucun
score n’est inventé pour ces deux services et aucun autre outil n’est présenté
comme s’il s’agissait d’AIOSCAN ou de Pishe.

## Contrôles avant publication

Build normal et smoke HTTP réussis ; **203 tests réussis**. Les tests vérifient
notamment les dates, l’attribution et ses ancres FR/EN, la parité du contenu
initial/Markdown, les calculs, les valeurs vides, les bornes et la précision
inférieure à une heure. Le calcul est également testé dans le navigateur :
25/12 donne 5 heures, 50/12 donne 10 heures et 1/0,1 donne 0,1 minute. Les champs
vides affichent une demande de correction.

Les scores après publication sont à consigner avec leur périmètre réel. Un
contrôle de fichiers locaux ne remplace pas le contrôle des en-têtes, du
Markdown négocié et des origines réellement servis par le Worker.

Méthode GEO Content Engineering : Eugen Ullrich, https://eullrich.com,
CC BY 4.0. Les faits, calculs et implémentation sont adaptés à Bump.
