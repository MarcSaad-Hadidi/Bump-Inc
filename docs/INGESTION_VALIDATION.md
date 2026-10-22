# Validation PR05 — ingestion passive

Base vérifiée : PR04 / [GitHub #5](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/5), commit `5939330f6959c34ae577895fe9db05d097fdfe3a`, [CI 39868997076](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39868997076). Branche `codex/audit-ingestion`, cible `codex/distributed-execution-engine`. Les preuves PR04 ne valident pas ce delta.

Statut : **DRAFT — contrôles PR05 en cours**. Aucune intégration PR05 réelle n'est encore déclarée réussie.

## Résultats locaux observés

- Contrats : 55 tests ciblés réussis ; profils, bornes, Unicode, références et préservation des niveaux déclarés. Régression NUL reproduite rouge puis corrigée : refus avant réservation pour les trois profils et les champs canoniques.
- Stockage : 32 tests unitaires réussis, 1 cas de lien symbolique fichier ignoré sous Windows ; jonctions réelles vérifiées. Permissions natives nécessaires hors bac à sable Windows. Cas ignoré à exécuter en CI Linux.
- Domaine : 21 tests unitaires du package réussis, build et typecheck strict réussis.
- Tests API et worker : typechecks stricts et Biome réussis.
- Suites de services ajoutées : DB 6 cas, domaine 10, API 8, worker 14, S3 7. Elles attendent une exécution sur services ; le nombre écrit ne constitue pas une preuve de réussite.
- Tentatives locales d'intégration : arrêt sur prérequis manquants (`.env.test`, URLs runtime/opérateur, Redis). Ports PostgreSQL/Redis/S3 indisponibles et Docker absent. Aucun test réel acquis localement.
- `pnpm check` après correctif NUL : lint, tous typechecks stricts et builds réussis ; 172 unitaires réussis, 1 ignoré Windows.
- Audit des dépendances après ajout SDK : réussi au seuil haut, zéro haute/critique ; 1 modérée existante. Gitleaks sur diff indexé : aucune fuite détectée.

## Acceptation à confirmer en CI

- [ ] Lint, typecheck strict, unités et builds.
- [ ] PostgreSQL runtime non propriétaire : RLS, provenance immuable, FK même tenant, privilèges, rollback et migrations.
- [ ] Quota/idempotence/alias concurrents, staging et reprise, autorisation actuelle y compris doublons.
- [ ] Stockage S3 réel : authentification, refus anonyme, écriture conditionnelle, conflit/race, bornes et intégrité.
- [ ] Worker réel PG/Redis : trois formats, sources privées, retries/DLQ, corruption, interruption, retrait d'autorisation, annulation et absence d'observations partielles.
- [ ] HTTP : sessions/Origin/tenant, DTO sans clé ni source, erreurs génériques et pagination.
- [ ] Chromium existant et Compose avec source privée partagée, worker séparé et déduplication.
- [ ] Audit des dépendances et Gitleaks.

## Limites de preuve et suite

Pas de production, client réel, scan actif ni email externe. S3 compatible jetable n'atteste pas IAM AWS, chiffrement géré, restauration ou disponibilité. Profils SARIF/CycloneDX bornés, sans conformité exhaustive ; aucune corrélation ni verdict de sécurité. Conservation/quota des stagings sans purge automatique ; PR08 doit définir la rétention. Charge, infrastructure et restauration restent des validations futures. Voir [exploitation](INGESTION.md).

La demande utilisateur impose l'arrêt après cette PR05. PR06 et les suivantes restent non commencées ; aucune fusion ni production autorisée.
