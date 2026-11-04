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

La lecture HTML privée porte la mention BROUILLON tant qu’un administrateur ou
réviseur n’a pas approuvé explicitement l’empreinte SHA-256 du contenu exact.
L’API refuse le téléchargement PDF avant cette approbation. Les snapshots et
leurs empreintes ne sont pas modifiables par le rôle runtime de la base. Une
nouvelle rédaction ou une nouvelle revue exige un nouveau rapport. Les événements
`report.drafted` et `report.approved` conservent la traçabilité.

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
La couverture et les observations proviennent de l’audit sélectionné. L’absence
d’un constat ne prouve pas sa correction ; seul un retest comparable et examiné
peut produire `verified_fixed`. Un rapport importé conserve une provenance
déclarée et ne devient pas une attestation d’exécution native. EPSS et CISA KEV
restent inconnus dans ce lot. Voir [politique métier](CYBER_DOMAIN.md).

Les preuves brutes et sources suivent la rétention du client. Les snapshots de
rapports et l’historique sont conservés pour la traçabilité ; leur politique
d’archivage et d’effacement documentaire doit être approuvée avant des données
client réelles. Il n’existe pas de portail client ni de lien public de partage.

## Vérifications

Les tests exercent l’échappement HTML, l’intégrité après réordonnancement JSONB,
la production effective d’un PDF, le refus inter-organisations et analyste,
la séparation des observations non examinées, l’immuabilité runtime et
l’approbation idempotente du contenu exact. Les résultats de toutes les PR et
du parcours navigateur complet sont consignés dans `CYBER_VALIDATION.md`.
