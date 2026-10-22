# PR05 — ingestion passive, conception et plan

Base : PR04 / GitHub #5, `5939330f6959c34ae577895fe9db05d097fdfe3a`, CI documentaire complète [39868997076](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39868997076) réussie. Source fonctionnelle `eee336b` vérifiée par CI 39867661216. Branche : `codex/audit-ingestion`. La demande utilisateur impose **l'arrêt après cette prochaine PR**, sans commencer PR06.

## Périmètre

Importer passivement du JSON Bump v1, un profil SARIF 2.1.0 et un profil SBOM CycloneDX 1.6 JSON. Conserver une source privée immuable, son SHA-256 et sa provenance serveur ; produire des observations validées, sans corrélation ni verdict de sécurité. Aucune référence de rapport n'est récupérée, aucune cible n'est contactée, aucune commande ou scan n'est lancé. Les profils pris en charge sont explicitement bornés ; aucune conformité normative exhaustive n'est annoncée.

La soumission nécessite l'action de mandat `audit.import` sur une cible exacte, avec appartenance et approbation courantes. Le worker utilise les claims, checkpoints, délais, annulations et jetons PR04. L'insertion des observations et la réussite du job partagent la même transaction finale réautorisée et protégée par le jeton.

## Contrats communs

- Formats : `bump-json-v1`, `sarif-2.1.0`, `cyclonedx-1.6-json` ; version de convertisseur `bump-ingestion-v1`.
- Soumission HTTP : `{engagementId, expectedRevision, target, format, sourceName, sourceText, idempotencyKey}`. L'acteur, le tenant, le backend, les clés de stockage et l'action sont fournis par le serveur.
- Limites : corps HTTP existant 1 MiB ; source UTF-8 bien formée au plus 512 KiB ; 1000 observations ; profondeur JSON 32 ; 25000 nœuds ; champs texte bornés ; réservation de quota de 64 MiB par tenant, sources staging comprises.
- Observation : `{kind:'issue'|'component',title,description?,reportedSeverity:'unknown'|'info'|'low'|'medium'|'high'|'critical',sourceLevel?:'none'|'note'|'warning'|'error',ruleId?,location?:{uriText,startLine?},component?:{name,version?,purl?},sourcePointer}`. Les niveaux SARIF restent des niveaux déclarés, sans conversion en risque métier. Un composant SBOM ne constitue pas une vulnérabilité.
- Bump JSON : `{version:1,observations:[...]}` ; zéro observation est accepté sans attester une absence de problème. SARIF : version exacte, runs/tool.driver, résultats, règles et localisations bornés ; références de règles consommées vérifiées. CycloneDX : `bomFormat:'CycloneDX',specVersion:'1.6'`, composants bornés. Le document source reste conservé.

## Données et reprise

`audit_import` conserve la provenance immuable : organisation, acteur, mandat/révision, cible, format, convertisseur, sourceName, digest, octets, backend et clé serveur, date de réception et requestId. État `staging` puis `ready`, job lié unique, nombre d'observations et date de complétion.

`audit_import_request` lie durablement organisation/acteur/idempotencyKey à un hash de requête et un import. Cette table est nécessaire pour garder la sémantique de conflit même lorsqu'une nouvelle clé déduplique un contenu déjà reçu. `audit_observation` stocke import/organisation/ordinal et observation canonique, sans mutation runtime.

Déduplication du contenu : organisation + mandat/révision + cible canonique + format + version du convertisseur + SHA256. Les requêtes identiques et concurrentes réutilisent le même import et le même job ; une requête changée sous une clé déjà reconnue échoue en 409. Le contrôle actuel du mandat précède aussi le retour d'un doublon.
1. Transaction tenant sous verrou organisation PR04 : réautoriser, vérifier alias/digest/quota, réserver un import staging et son alias.
2. Écrire la source hors transaction vers une clé générée par le serveur, de forme `organisationUUID/importUUID.json` ; put immuable et idempotent, vérifier digest et taille. Un échec laisse une réservation staging connue et reprenable avec la même requête.
3. Nouvelle transaction tenant réautorisée : créer un job interne `kind:'audit.import',payload:{importId}` et lier l'import ready atomiquement à son outbox. L'endpoint `/executions` demeure réservé au handler synthétique.
4. Worker : claim PR04, lire l'import dans le tenant, vérifier le stockage/digest/taille, parser, checkpoint, finaliser observations + import + succès du job dans une seule transaction réautorisée et protégée par le jeton.

Les sources staging sont comptées dans le quota. Leur conservation/reprise est documentée ; aucune suppression automatique ou effacement d'une source partagée ne masque un incident. La rétention et l'export appartiennent à PR08. Les anciennes migrations sont inchangées ; migration 0004 pour les trois tables, RLS, privilèges, clés du même tenant et extension explicite du genre de job.

## Stockage

Interface utilisée dans `@bump/integrations` : `ArtifactStore {backend:'local'|'s3';put(key,bytes,sha256):Promise<void>;get(key,maxBytes):Promise<Buffer>;close():void}`. La source et les observations ne transitent jamais par Redis ou les logs.

Local : développement/tests, racine privée configurable, clés générées validées, refus de traversal/symlinks, fichiers privés, publication atomique/exclusive et vérification d'un objet existant. API et worker Compose conservent `read_only:true` avec un volume de données dédié, propriétaire node.

S3 : SDK AWS maintenu `@aws-sdk/client-s3` 3.1156.0 vérifié sur le registre, bucket privé provisionné et configuration explicite. PUT conditionnel `IfNoneMatch:'*'`, lecture bornée et vérification du digest, délais/retries bornés et erreurs génériques. Aucun bucket externe créé, ACL publique, URL signée ou configuration d'infrastructure réelle.

Tests de service S3 : SeaweedFS `chrislusf/seaweedfs:4.48`, distribution publique vérifiée dans les sources primaires et support déclaré du PUT conditionnel. Service jetable avec `mini -dir=/data`, clés synthétiques et bucket explicitement initialisés par variables ; uniquement port S3 8333 exposé sur loopback et logs désactivés. L'authentification et les PUT conditionnels doivent être vérifiés sur cette image réelle en CI ; ce test ne prouve pas une configuration IAM AWS.

## Propriété exclusive et ordre

- **Contrats/parser** : nouveaux fichiers ingestion des contrats, vocabulaire engagement, variantes execution et exports des contrats. Tests unitaires sur profils valides/invalides, tailles, profondeur, Unicode, références et sévérité déclarée.
- **Stockage** : nouveaux fichiers artifact-store et tests dans integrations, export et manifeste integrations. SDK réel, tests locaux réels et suite S3 contre service isolé. Le coordinateur seul installe les dépendances et modifie le lockfile.
- **DB** : nouveau schéma ingestion + migration 0004/journal/snapshot, extension du schéma execution, exports et assertRuntimeRole, tests DB.
- **Domaine** (après contrats) : nouveaux services ingestion et tests ; extractions transactionnelles minimales de submission/finalisation PR04, sans registre générique de handlers. Aucun fichier des contrats/DB/stockage modifié par cet agent.
- **Coordinateur** : routes HTTP et tests, raccord worker et tests, dépendances app/lockfile, Compose/Docker/CI/env et smoke, documentation/suivi/preuves.

## Acceptation et arrêt

- [x] Contrats et profils avec refus explicites et limites.
- [x] RLS/provenance immuable, quota atomique, alias et doublons concurrents.
- [x] Stockage local privé et S3 réel : auth, conditionnel, lectures bornées, corruption et pannes.
- [x] Import bout en bout ; doublons, reprise staging/worker, rollback final sans observations partielles, annulation/arrêt/retrait d'autorisation et jeton obsolète.
- [x] API authentifiée et générique ; aucune donnée source dans Redis/logs.
- [x] `pnpm check`, intégrations réelles, Chromium, Compose, audit et Gitleaks ; résultats réels dans [INGESTION_VALIDATION.md](INGESTION_VALIDATION.md), CI 39872257617.
- [x] [PR distincte #12](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/12) ciblant `codex/distributed-execution-engine`, dépendance #5 et SHA exact documentés ; DRAFT jusqu'aux contrôles documentaires finaux.
- [x] Mettre à jour PROGRESS/HANDOFF ; **arrêt après finalisation PR05**. Aucune PR06, fusion automatique ou production.
