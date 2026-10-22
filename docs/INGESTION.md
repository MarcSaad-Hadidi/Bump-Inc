# Ingestion passive d'audits — PR05

La source est conservée dans un stockage privé ; PostgreSQL conserve sa provenance, le job et les observations canoniques. BullMQ ne reçoit que l'identifiant du job. Aucun rapport, URI, PURL ou nom de fichier ne déclenche de téléchargement, scan ou commande. Les textes importés restent des données non fiables, à afficher comme texte par les futurs écrans.

## API et autorisation

Toutes les routes exigent une session et l'appartenance actuelle au tenant. Les mutations utilisent la protection Origin/JSON existante. Préfixe : `/organizations/:organizationId/audit-imports`.

| Méthode / suffixe                                | Comportement                                                  |
| ------------------------------------------------ | ------------------------------------------------------------- |
| POST `/`                                         | Réserver la source, l'écrire puis créer son job ; réponse 201 |
| GET `/`                                          | 100 derniers reçus du tenant                                  |
| GET `/:importId`                                 | Provenance et état courant du job                             |
| GET `/:importId/observations?offset=0&limit=100` | Observations ordonnées ; limite 1–100, offset 0–1000          |

Le POST accepte exactement `{engagementId,expectedRevision,target,format,sourceName,sourceText,idempotencyKey}`. `sourceName` est un libellé de 1–255 caractères sans séparateur de chemin ni contrôle ; il ne détermine pas la clé de stockage. `sourceText` est le JSON UTF-8 bien formé. `idempotencyKey` contient 1–128 lettres ASCII, chiffres, `_` ou `-`.

Le mandat doit approuver explicitement `audit.import` pour la cible exacte ; les approbations existantes ne sont pas étendues. L'acteur doit rester l'opérateur autorisé. Appartenance, révision, approbation, dates, exclusions, révocation et contrôles d'exécution sont revérifiés à la réservation, à la mise en file, au claim/retry et à la finalisation. Même une resoumission dédupliquée nécessite l'autorisation actuelle.

La réponse expose notamment l'acteur, le mandat/révision/cible, le format, `importerVersion`, `sourceName`, `sourceSha256`, `byteCount`, les dates, `executionJobId`, `executionStatus` et `observationCount`. Elle exclut source brute, backend/clé privés, fingerprint, hash de requête et jetons de tentative. Un reçu `ready` signifie que le job existe ; seule sa complétion réussie publie les observations. Un rapport vide peut réussir sans attester l'absence de vulnérabilité.

## Profils réellement supportés

- `bump-json-v1` : `{version:1,observations:[...]}`, strict. Chaque observation porte `kind`, `title`, `reportedSeverity`, `sourcePointer` et les champs canoniques facultatifs définis dans les contrats. `kind:component` exige les données `component`.
- `sarif-2.1.0` : `version`, `runs`, `tool.driver.name`, règles facultatives et `results`. Message `text` requis ; références de règles vérifiées ; première localisation physique consommée. Le niveau `none/note/warning/error` est conservé comme `sourceLevel`, avec `reportedSeverity:unknown`. Les propriétés non consommées sont conservées dans la source uniquement. Les messages uniquement Markdown, artefacts externes et autres variantes ne sont pas pris en charge.
- `cyclonedx-1.6-json` : `bomFormat:CycloneDX`, `specVersion:1.6`, tableau `components` et composants enfants. Nom/type requis, version/PURL/description facultatives. Chaque composant produit une observation d'inventaire de sévérité inconnue ; ni vulnérabilités ni dépendances ne sont interprétées.

Ce sont des profils d'import bornés, sans revendication de conformité normative exhaustive. Aucune corrélation, score de risque, remédiation ou inférence de sécurité n'est produite.

Limites : corps HTTP 1 MiB, source 512 KiB, 1000 observations, profondeur JSON 32, 25000 nœuds. Titres 512 caractères, descriptions 8192 ; les autres champs ont leurs bornes dans Zod. Erreurs publiques génériques sans fragments de source.

## Transactions, doublons et pannes

La migration SQL 0004 ajoute `audit_import`, `audit_import_request`, `audit_observation`, les clés du même tenant, RLS forcée et les privilèges de provenance immuable. Les anciennes migrations restent inchangées.

Sous verrou organisation PR04, la réservation autorisée enregistre le digest, les octets et un alias de requête. Le quota atomique est de 64 MiB de sources par tenant, y compris staging. L'unicité organisation/acteur/clé d'idempotence empêche la réutilisation de la clé avec une requête changée (409). Le fingerprint de contenu inclut tenant, mandat/révision/cible, format, convertisseur et digest ; un nouveau nom ou une nouvelle clé sur le même contenu réutilise le reçu original.

L'écriture privée se fait hors transaction, vers `organisationUUID/importUUID.json`. Après écriture, une seconde transaction réautorise, crée le job interne et son outbox puis lie le reçu `ready`. Une panne laisse un reçu staging visible et comptabilisé ; la même soumission reprend l'écriture immuable et la mise en file. Le backend d'un staging ne peut pas changer.

Le worker lit le reçu lié au job courant, vérifie backend, taille, SHA-256 et UTF-8 avant de parser. Les observations, la date/nombre de complétion et la réussite du job sont écrits dans une même transaction, avec autorisation actuelle et jeton de tentative. Un échec de cette transaction ne publie aucune observation partielle. Les erreurs stockage/intégrité passent par les trois tentatives PR04, backoff exponentiel initial 1 s et timeout de tentative 30 s, puis DLQ. Annulation, arrêt d'urgence et jeton obsolète empêchent la publication.

La déduplication conserve aussi les jobs terminaux : après DLQ, annulation ou refus d'autorisation, renvoyer le même contenu avec une nouvelle clé retrouve le même reçu/job. Aucune API de replay manuel d'import n'est livrée ici. La procédure PR04 de nouveau job/nouvelle clé concerne le handler synthétique ; elle ne relance pas un import dédupliqué. Une panne transitoire est reprise automatiquement dans les trois tentatives, et un staging peut être repris par resoumission ; au-delà, une procédure opérateur contrôlée reste à concevoir avant usage réel.

## Stockage et développement

`@bump/integrations` fournit `createArtifactStore`. Aucun credential opérateur ne vient du POST. API et worker doivent utiliser le même backend et le même stockage ; changer cette configuration ne migre pas les sources existantes.
- Local, développement/tests seulement : `ARTIFACT_BACKEND=local`, `ARTIFACT_LOCAL_ROOT`. Les exemples lancés depuis les apps utilisent `../../.artifacts/audit-objects`. Répertoires/fichiers privés, refus des liens symboliques/jonctions, lecture bornée et publication exclusive atomique. Compose partage un volume dédié entre API et worker non-root avec filesystem système en lecture seule.
- S3 compatible : `ARTIFACT_BACKEND=s3`, `ARTIFACT_S3_ENDPOINT`, `ARTIFACT_S3_REGION`, `ARTIFACT_S3_BUCKET`, `ARTIFACT_S3_ACCESS_KEY_ID`, `ARTIFACT_S3_SECRET_ACCESS_KEY`. Bucket privé préprovisionné ; HTTPS et credentials non exemples exigés en production. SDK AWS épinglé, PUT conditionnel `If-None-Match:*`, contrôle du digest sur un objet existant, lecture bornée, délais/retries bornés. L'application ne provisionne ni bucket ni politique IAM, ne publie pas d'ACL ni d'URL signée. L'accès administratif au stockage et à PostgreSQL reste hors de cette isolation runtime.

`pnpm infra:up` démarre aussi un service S3 jetable sur loopback 8333. Copier `.env.test.example` vers `.env.test`, provisionner le rôle runtime comme décrit dans IDENTITY.md, puis migrer la base de test avant les intégrations. Les tests exigent les noms/credentials synthétiques et l'endpoint loopback exacts ; ne jamais les diriger vers un service réel. La CI vérifie le stockage S3 authentifié et le pipeline d'import complet sur SeaweedFS 4.48 ; cela ne certifie aucune configuration AWS réelle. Sources du choix : [version 4.48](https://github.com/seaweedfs/seaweedfs/releases/tag/4.48), [mini](https://github.com/seaweedfs/seaweedfs/wiki/Quick-Start-with-weed-mini), [opérations conditionnelles](https://github.com/seaweedfs/seaweedfs/wiki/S3-Conditional-Operations).

## Limites et dépendances

Pas d'UI métier, d'upload multipart, de sources compressées, d'import par URL ni de récupération externe. Les sources staging, les sources échouées et les aliases sont conservés ; le quota peut donc nécessiter une intervention opérateur. Il n'y a pas de purge automatique ni d'API de suppression : rétention/export relèvent de PR08. Pas de garantie de survie à une perte complète du disque sans sauvegarde ; restauration, IAM réel, chiffrement/rotation opérateur et charge restent à valider avant production.

Les [résultats observés](INGESTION_VALIDATION.md) déterminent l'état de la PR. PR06 connecteurs dépend de PR03/04/05 vérifiées ; **elle n'est pas commencée dans cette session**, conformément à la demande d'arrêt après PR05.
