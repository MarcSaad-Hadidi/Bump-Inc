# Bump Cyber — espace de travail privé

La route `/cyber` est un parcours de consultation français/anglais connecté à
Fastify, PostgreSQL et au worker BullMQ. La route racine conserve les diagnostics
Bump OS, le prototype Loi 25 conserve son fonctionnement et `website/` reste
indépendant. Les polices et les styles Cyber sont locaux et isolés à cette route.

## Parcours livré

Après vérification email et connexion Better Auth, l’opérateur crée ou choisit
son organisation. Il peut créer et modifier un client, enregistrer ses actifs,
rédiger un mandat écrit avec signataire, responsable, fenêtre, exclusions et
contact d’urgence. Le propriétaire approuve explicitement le mandat. Le rôle
hérité d’administrateur d’organisation ne peut pas être modifié par l’affectation
d’un rôle Cyber.

L’assistant comporte sept étapes : client, mandat valide, actifs permis,
catégories, moteurs disponibles, paramètres/sources et confirmation finale.
L’API refait les validations ; un bouton ou un identifiant envoyé directement
ne contourne pas le mandat, le rôle, les exclusions ou l’arrêt d’urgence.
Les moteurs indisponibles sont désactivés avec leur raison. Aucun mode actif ou
authentifié n’est proposé dans ce MVP.

Les fichiers texte bornés ou rapports JSON/SARIF sont téléversés puis chiffrés
côté serveur. Les audits montrent les états et étapes mesurés, leurs erreurs,
le moteur, les observations et les demandes d’annulation. Aucun pourcentage
de progression n’est inventé. Les alertes arrivent **à examiner**.

Les constats peuvent être recherchés, filtrés et triés, puis examinés dans un
panneau avec source/version, sévérité, confiance, CVE/CVSS, preuves minimisées,
priorité explicable, recommandations et historique. Une décision humaine est
nécessaire pour les confirmer ou les rejeter. Les actions ont un responsable,
une échéance et un état de réalisation. Seul un retest recevable peut produire
une correction vérifiée ; une conclusion non concluante ne modifie pas l’état
du constat. Les comparaisons distinguent non-observation et correction.

La préparation d’un rapport demande un résumé et des notes rédigés. Son HTML
privé et son empreinte permettent la revue. Le PDF reste refusé par l’API tant
que l’instantané exact n’est pas approuvé par un administrateur ou réviseur.
Voir [reporting](CYBER_REPORTING.md) pour les preuves historiques et résolutions.

Le dialogue de compte propose activation TOTP vérifiée, codes de récupération,
révocation des autres sessions et déconnexion. L’administrateur peut attribuer
les rôles Cyber et purger explicitement les sources/preuves expirées. Les
changements de rôle se sérialisent avec les transactions du membre concerné.

## Frontières HTTP et identité

Le navigateur appelle un proxy Next same-origin avec allowlist de méthodes et
routes, contrôle Host/Origin et `Sec-Fetch-Site`, cookies Better Auth seulement,
corps bornés, délais et réponses privées non cachables. Les liens email usuels
`/api/auth/` réutilisent exactement ce proxy. Aucune URL d’amont ou commande
utilisateur ne peut être transmise à un scanner.

L’API conserve 120 requêtes/minute : pour les routes privées, le budget est
attribué à une session **vérifiée en base** et à un email confirmé, afin que les
consultants derrière le même proxy ne consomment pas le budget des autres.
Sans cette preuve ou en cas d’échec du lookup, la limite reste par IP normalisée.
Les cookies forgés, en-têtes d’identité et adresses forwardées ne créent pas de
nouveau budget. Les limites d’authentification publiques et de MFA restent actives.
Une coordination partagée des limites reste à configurer avant plusieurs API.

## Ergonomie et vérification

Navigation clavier, dialogues natifs, focus visible, menu mobile hors tabulation
quand il est fermé, états vides/erreurs et réduction des animations sont pris en
charge. Les textes secondaires ont été vérifiés sur les fonds correspondants
avec le calcul sRGB de contraste ; les contrôles restent utilisables avec
`prefers-reduced-motion: reduce`. Les données du précédent tenant sont retirées
au changement d’organisation et les requêtes en cours sont annulées.

Le scénario Chromium utilise uniquement des noms et actifs **SYNTHÉTIQUES**.
Il effectue la connexion réelle, la création client/actif/mandat, l’approbation,
le téléversement, deux analyses via un worker séparé, la revue, l’action de
correction, le retest, un rapport HTML/PDF approuvé, le passage anglais/mobile,
le refus d’accès depuis une autre organisation et après déconnexion.

Sur Linux avec les images et limites requises, ce scénario utilise Semgrep réel.
Sur le runner local sans cgroups, il utilise un import explicitement synthétique
et le retest reste non concluant. La suite native dédiée vérifie les moteurs
réels séparément. Aucun résultat importé n’est présenté comme une exécution
native et aucune donnée client réelle n’a servi à ces vérifications.

Installation et arrêts : [guide opérateur](CYBER_OPERATIONS.md). Authentification :
[identité Cyber](CYBER_IDENTITY.md). État des contrôles et limites :
[preuves de validation](CYBER_VALIDATION.md).
