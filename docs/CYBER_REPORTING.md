# Bump Cyber — rapports privés et publication

Le rapport constitue un instantané typé du dossier Cyber dans PostgreSQL existant.
Il est construit dans une transaction REPEATABLE READ, après la fin de tous les
jobs de l’audit choisi. Un audit incomplet ou échoué conserve ses erreurs dans la
couverture ; il ne devient jamais un résultat favorable.

## Révision et diffusion

Un administrateur, consultant ou réviseur peut créer un brouillon en rédigeant
le résumé exécutif et les notes de revue. Les observations non examinées et les
faux positifs sont comptés séparément et exclus des résultats confirmés. Chaque
résultat conserve l’actif, la source, la version déclarée ou exécutée, les preuves
minimisées, les références, la revue humaine et le contexte métier. Les secrets
et les sorties brutes chiffrées ne sont pas exportés.

Un retest de l’audit sélectionné peut référencer un constat issu d’un audit
antérieur, même lorsque l’audit du retest ne contient aucune observation. Le
rapport conserve alors le constat, ses actions et le retest sélectionné, avec
`evidenceAuditId` et `evidenceFromSelectedAudit: false`. La preuve provient de la
dernière observation enregistrée avant la revue de ce retest, dans le même
client et la même organisation ; une détection d’un audit ultérieur ne la
remplace pas. HTML et PDF l’indiquent comme preuve historique, sans attester une
détection dans l’audit sélectionné. Les retests exportés appartiennent uniquement
à cet audit, ce client et cette organisation.

Le statut `closed` ne supprime pas la résolution du dossier. Le snapshot conserve
une `resolution` structurée issue du dernier événement de résolution du cycle
courant : `finding.accepted_risk`, `finding.false_positive` ou `retest.absent`.
Elle indique la nature, l’événement, l’auteur, la date et la note de revue, ainsi
que l’audit de résolution pour une correction vérifiée. Une clôture après risque
accepté ou correction vérifiée reste dans les résultats examinés avec le statut
`closed`, ses actions et les retests sélectionnés. Elle ne figure plus dans les
risques prioritaires. Une clôture après faux positif est comptée dans les
exclusions de faux positifs, avec ses actions exclues des résultats confirmés.
Une clôture sans résolution traçable du cycle courant est comptée parmi les
éléments à examiner ; une ancienne acceptation précédant une réouverture ou une
nouvelle confirmation ne vaut pas résolution actuelle.

La lecture HTML privée porte la mention BROUILLON tant qu’un administrateur ou
réviseur n’a pas approuvé explicitement l’empreinte SHA-256 du contenu exact.
L’API refuse le téléchargement PDF avant cette approbation. Les snapshots et
leurs empreintes ne sont pas modifiables par le rôle runtime de la base. Une
nouvelle rédaction ou une nouvelle revue exige un nouveau rapport. Les événements
`report.drafted` et `report.approved` conservent la traçabilité.

Les nouvelles rédactions utilisent `cyber-report-v2`, qui impose la provenance et
la résolution nullable pour chaque résultat. Les snapshots `cyber-report-v1`
existants restent lisibles sans ajout de champs, réécriture ou changement de leur
SHA-256. Leurs preuves provenaient uniquement de l’audit sélectionné.

La sérialisation canonique trie les clés avant le calcul de SHA-256 afin que
l’ordre des clés JSONB PostgreSQL n’altère pas l’intégrité. Le contrôle est refait
à chaque lecture et approbation. Les autorisations sont vérifiées côté serveur,
avec membership courant, rôle Cyber et RLS ; les exports ne sont jamais publics.

## Formats et composants

- HTML français ou anglais, sans JavaScript ni ressource distante, avec CSP
  restrictive et entêtes `private, no-store`.
- PDF A4 produit côté API par PDFKit 0.20.2 (MIT), avec DejaVu Sans embarquée et
  sa licence de redistribution dans `apps/api/assets/fonts/`.
- Couverture Bump, client/mandat/date/responsable, périmètre, exclusions, synthèse,
  méthodologie, versions, couverture, résultats examinés, risques prioritaires,
  constats techniques, recommandations, actions, retests et annexes de provenance.
- Une génération PDF par processus API à la fois et sortie bornée à 20 Mo.
- Aucun navigateur distant, abonnement, stockage additionnel ni service PDF tiers.

## Limites d’interprétation

L’état des constats correspond à la revue au moment de la rédaction du rapport.
La couverture provient de l’audit sélectionné ; les preuves historiques des
constats référencés par ses retests sont distinguées des observations de cet
audit. L’absence d’un constat ne prouve pas sa correction ; seul un retest
comparable et examiné peut produire `verified_fixed`. Un rapport importé conserve une provenance
déclarée et ne devient pas une attestation d’exécution native. EPSS et CISA KEV
restent inconnus dans ce lot. Voir [politique métier](CYBER_DOMAIN.md).

Les requêtes sont bornées et la génération refuse explicitement les dépassements
de 200 scans, 100 actifs, 1 000 observations de l’audit, 1 000 constats, 1 000
retests sélectionnés, 1 000 actions, 100 sources par constat ou 10 000 événements
de cycle de vie. Aucun historique n’est tronqué silencieusement. Si un retest
référence un constat sans preuve antérieure disponible, le rapport est refusé
plutôt que de substituer une observation ultérieure ou de créer une confirmation.

Les preuves brutes et sources suivent la rétention du client. Les snapshots de
rapports et l’historique sont conservés pour la traçabilité ; leur politique
d’archivage et d’effacement documentaire doit être approuvée avant des données
client réelles. Il n’existe pas de portail client ni de lien public de partage.

## Vérifications

Les tests exercent l’échappement HTML, l’intégrité après réordonnancement JSONB,
la production effective d’un PDF, le refus inter-organisations et analyste,
la séparation des observations non examinées, l’immuabilité runtime et
l’approbation idempotente du contenu exact. Les régressions couvrent également
l’audit de retest sans observation, la preuve antérieure malgré une détection
ultérieure, les clôtures après correction/acceptation/faux positif, la résolution
manquante et le refus d’un historique hors limite. HTML et PDF vérifient les
libellés historiques, les notes de résolution échappées et l’exclusion des
résolutions clôturées des risques prioritaires. Les résultats de toutes les PR et
du parcours navigateur complet sont consignés dans `CYBER_VALIDATION.md`.

Les exécutions simultanées dans plusieurs worktrees doivent isoler PostgreSQL
**et** Redis. Changer uniquement la base PostgreSQL ne suffit pas : la file
BullMQ `bump-executions` de Redis `/1` peut être consommée par le worker d’un
autre worktree. Cette collision a été reproduite localement par la disparition
de notifications avant le démarrage des workers du test ; les six échecs
d’ingestion associés disparaissent avec un Redis dédié. La vérification complète
a ensuite passé 141 intégrations, sur `bump_reporting_test` et un Redis local
distinct, ainsi que `pnpm check` avec 231 unités. Une instance Redis locale
provisionnée sur un port séparé peut être sélectionnée sans modifier les fichiers
d’environnement : `REDIS_URL=redis://127.0.0.1:16481/1 pnpm test:integration`.
