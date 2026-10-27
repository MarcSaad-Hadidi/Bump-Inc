# Comparaison de contenu : intégration IA et automatisation pour PME québécoises

## Périmètre

27 octobre 2026, français, PME du Québec. Requête de découverte :
« consultation automatisation intégration IA PME Québec », recherche web
disponible dans la session. Les résultats sont un instantané, sans preuve de
positions Google locales. Trois pages d’entreprises ont été lues ; aucun
annuaire ou résultat publicitaire n’est traité comme concurrent de référence.

- **Bump** : `/services/integration-ia`, HTML rendu depuis la source v59,
  commit `83b3da0c7c05e04bc235a9d9ab623243f992e816`, avant les nouveaux ajouts.
  Le domaine public est https://bump-renaissance-7562d3.plumtuna4.chatgpt.site.
  L’accès HTTP direct du runtime à son robots a retourné 403 ; cela ne prouve
  aucune restriction des robots du site. Les connecteurs l’ont lu avec un
  statut 200. La comparaison Bump utilise donc explicitement la source locale.
- **C1** : https://a2b2c.ca/ — HTTP 200, français canadien, corps `main`.
- **C2** : https://easyflowy.io/consultation-ia — HTTP 200, français, corps `main`.
- **C3** : https://agentiquequebec.ca/ — HTTP 200, français, corps `main`.

Extraction du HTML avec parse5 ; exclusion de navigation, en-tête, pied de page,
scripts, styles, formulaires, dialogues, SVG et éléments masqués. Les réponses
FAQ et tableaux substantiels sont inclus. Comptage Unicode avec
`Intl.Segmenter('fr', {granularity:'word'})`, segments `isWordLike`. Aucun
doublon de paragraphe substantiel n’a été retenu. Le HTML brut ne prouve pas
l’absence d’ajouts ultérieurs par JavaScript. C1/C3 sont des accueils plus larges
que la page IA de Bump ; les écarts ne sont pas des notes de qualité.

## Longueur du contenu extrait

| Mesure | Bump v59 | C1 | C2 | C3 |
| --- | ---: | ---: | ---: | ---: |
| Mots | 751 | 681 | 925 | 1 775 |

## Couverture des sujets

Jugements de profondeur sur le corpus lu, avec trois valeurs exclusivement :
Absent, Survolé, Détaillé. Une absence concerne ce seul corps de page et ne
décrit jamais l’ensemble du site de l’entreprise.

| Sujet | Bump v59 | C1 | C2 | C3 |
| --- | --- | --- | --- | --- |
| Problème opérationnel et choix d’une première tâche | Détaillé | Détaillé | Détaillé | Détaillé |
| Étapes d’accompagnement | Survolé | Détaillé | Détaillé | Détaillé |
| Automatisation classique comparée à l’IA | Survolé | Détaillé | Survolé | Survolé |
| Exemples de demandes ou de documents | Détaillé | Détaillé | Détaillé | Détaillé |
| Préparation et droits d’accès aux données | Détaillé | Survolé | Survolé | Détaillé |
| Validation humaine avant une action | Détaillé | Détaillé | Survolé | Détaillé |
| Évaluation et suivi des résultats | Détaillé | Détaillé | Survolé | Détaillé |
| Modalités de prix et de périmètre | Survolé | Survolé | Détaillé | Détaillé |
| Formation et prise en main par l’équipe | Absent | Absent | Détaillé | Détaillé |

Repères : Bump explique déjà permissions, évaluation, cas illustratif CRM/ERP et
frontière des futurs agents ; il renvoie vers une page méthode distincte. C1
oppose règles déterministes et traitement contextuel, puis décrit des parcours
avant/après et des indicateurs sans prétendre disposer de résultats clients.
C2 expose sa démarche, des réalisations revendiquées et une tarification selon
la valeur ; ces déclarations ne sont pas vérifiées comme références clients.
C3 détaille préparation des données, étapes, prototypes et niveaux d’offres
pour la construction. Ces observations n’autorisent pas à reprendre leurs
preuves, leur spécialisation ou leurs prix chez Bump.

## Couverture des termes des concurrents

Occurrences littérales, insensibles à la casse, délimitées par des frontières de
lettres/chiffres Unicode. Pas de traduction, lemmatisation, densité optimale ou
score WDF*IDF revendiqué. Une variante sémantique ne compte pas comme occurrence.

| Terme | C1 / C2 / C3 | Utilisé chez Bump v59 | Lecture utile |
| --- | --- | --- | --- |
| processus | 7 / 3 / 10 | ✔ 1 | Le choix du processus est central. |
| automatisation | 8 / 5 / 8 | ✔ 2 | Présent, avec distinction de l’IA. |
| validation humaine | 2 / 0 / 1 | ✔ 1 | Les permissions sont aussi expliquées sans répéter ce terme. |
| données | 8 / 1 / 5 | ✔ 6 | Sources et droits sont déjà substantiels. |
| CRM | 1 / 0 / 0 | ✔ 4 | Exemple réel de catégorie d’outil, sans partenaire revendiqué. |
| ERP | 1 / 0 / 0 | ✔ 3 | Même périmètre d’intégration. |
| audit | 1 / 0 / 0 | ✖ 0 | Le terme et le service existent dans d’autres pages Bump. |
| formation | 0 / 5 / 2 | ✖ 0 | Ne pas inventer une offre de formation ; expliciter la transmission prévue au mandat. |
| prix | 1 / 0 / 7 | ✖ 0 | « Coût » et cadrage sont présents ; pas de tarif à inventer. |

Les mesures et inventaires sans reproduction des pages sont conservés dans
`competitor-extraction.json`. Les textes concurrents complets ne sont pas ajoutés
au dépôt. Les volumes de recherche et positions ne sont pas disponibles.

## Données structurées : vérifications délimitées

Tous les blocs JSON-LD accessibles ont été parsés, avec contrôle des clés
dupliquées et inventaire récursif des types. Aucun Microdata/RDFa n’a été trouvé
dans ces sources brutes. Les champs d’adresse/personne/offre concurrents sont
des déclarations publiées, pas des faits indépendamment vérifiés. Aucun outil
externe de validation schema.org ou Google Rich Results n’a été exécuté.

| Source | Types et blocs inspectés | Vérifications et statut | Observation / suite |
| --- | --- | --- | --- |
| Bump v59 IA | 1 bloc : Organization, ImageObject, City, AdministrativeArea, WebSite, WebPage, Service, BreadcrumbList, ListItem | Aucune erreur trouvée dans le parsing, les clés ou les références locales contrôlées ; revue sémantique locale | Service et fil d’Ariane cohérents ; auteur collectif et FAQ visible à relier. |
| C1 | 1 bloc : ProfessionalService, AdministrativeArea, PostalAddress | Syntaxe et clés sans erreur ; revue partielle du vocabulaire et des faits déclarés | L’activité correspond au sujet ; pas de validation indépendante de l’adresse. |
| C2 | 4 blocs : ProfessionalService, Person, PostalAddress, City, AdministrativeArea, FAQPage, Question, Answer, BreadcrumbList, ListItem, Service, Audience | Syntaxe et clés sans erreur ; revue partielle | FAQ et prestation décrites dans le corps ; identité et faits professionnels non vérifiés indépendamment. |
| C3 | 1 bloc : ProfessionalService, PostalAddress, AdministrativeArea, Person, OfferCatalog, Offer, Service, PriceSpecification, UnitPriceSpecification | Syntaxe et clés sans erreur ; revue partielle | Offres visibles ; exactitude contractuelle et critères des plateformes non testés. |
| Bump corrigé, 18 routes FR/EN | Graphe généré : Organization, WebSite, WebPage ou AboutPage/CollectionPage/FAQPage, Service selon page, BreadcrumbList ; sous-FAQ pour les services | Tests locaux du JSON et des identifiants, faits, traductions, auteurs, dates, FAQ et citations | L’auteur est Bump ; les réponses FAQ correspondent au HTML et au Markdown. Les sources NIST/OWASP sont visibles. Aucun Person/Offer/Review ajouté artificiellement. |

Références de vocabulaire : https://schema.org/Service,
https://schema.org/Organization, https://schema.org/FAQPage,
https://schema.org/BreadcrumbList. Les pages services ne deviennent pas de faux
articles et n’ont pas besoin de QAPage : aucune réponse soumise par des visiteurs
n’est publiée. Le balisage FAQ décrit le contenu ; il ne promet ni citation IA
ni affichage FAQ enrichi Google, retiré en mai 2026 selon
https://developers.google.com/search/updates.

## Décisions éditoriales

La moyenne descriptive des trois textes concurrents est de **1 127 mots**.
Ce n’est ni un objectif de longueur ni un minimum de classement. Tous expliquent
un problème opérationnel, une démarche et des exemples ; seuls certains
détaillent les accès, la validation, la mesure, les prix ou la transmission.

Bump couvre déjà l’essentiel des risques et des décisions IA. Le correctif ajoute
des cas de test utiles, au lieu de répéter la grille des permissions. Les autres
pages reçoivent leur complément propre : sélection d’un workflow, réception
d’un logiciel et préparation d’un audit. La méthode en cinq étapes reste sur
sa page dédiée et les liens rendent ce parcours accessible.

Deux différenciations à approfondir avec de vraies preuves : une grille d’essai
IA remplie et publiable, et un exemple de mandat documentant décisions,
exceptions et reprise. Les grilles actuelles sont explicitement illustratives.
Les résultats clients, spécialités sectorielles, diplômes, gratuités et tarifs
des concurrents sont délibérément exclus.

Optimiser autour de la décision du lecteur sans recopier cette comparaison
point par point. Écarter les sujets hors périmètre ; publier une perspective
vérifiable de Bump quand elle existe, avec auteur réel, contexte et sources
traçables. Ces contributions doivent être faciles à comprendre et à citer,
sans inventer d’expérience ou garantir des gains de classement, de trafic ou
de citations.

Méthode : **GEO Prompts & Content Analysis**, Eugen Ullrich,
https://eullrich.com, CC BY 4.0. Analyse et priorisation adaptées à Bump.
