# Validation PR05 — ingestion passive

Base vérifiée : PR04 / [GitHub #5](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/5), commit `5939330f6959c34ae577895fe9db05d097fdfe3a`, [CI 39868997076](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39868997076). Branche `codex/audit-ingestion`, cible `codex/distributed-execution-engine`. Les preuves PR04 ne valident pas ce delta.

Statut : **VÉRIFIÉ sur le commit fonctionnel ; éligible READY FOR REVIEW**, [PR GitHub #12](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/12). Commit `ea8f736d5b22b145fa1a567666d9452930ebaf72` : [CI complète 39872257617](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39872257617) réussie, jobs `quality`, `compose` et `secrets`. Le commit documentaire qui consigne ces preuves doit aussi passer ses contrôles avant la transition de la PR.

## Résultats CI observés

| Contrôle                | Résultat réel sur `ea8f736`                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`            | Lint, typechecks stricts, builds ; **173 tests unitaires**, 15 fichiers, aucun ignoré Linux                                           |
| `pnpm test:integration` | **117 tests**, 14 fichiers, PostgreSQL/Redis/S3 réels ; les 45 nouveaux cas PR05 passent                                              |
| `pnpm test:e2e`         | **1 test Chromium** réussi                                                                                                            |
| Compose                 | API/web/worker, SMTP local, mandats, retries/historique PR04 et source privée partagée/import/observations/déduplication PR05 réussis |
| Audit                   | Zéro haute/critique ; 1 modérée dev esbuild déjà évaluée, seuil haut réussi                                                           |
| Gitleaks                | Aucune fuite détectée dans la CI complète                                                                                             |

Le service S3 testé est `chrislusf/seaweedfs:4.48`, digest effectivement téléchargé `sha256:4e61d15fd35994cb1e43e1e553dff106794841fd9a99ade2fc8c8bfce4d7872d`. Les tests réels confirment authentification correcte, refus de mauvais credentials et anonyme, PUT conditionnel 412, courses concurrentes, lecture bornée, erreurs et pipeline worker. Ils ne certifient pas IAM AWS de production.

## Résultats locaux observés

- Contrats : 55 tests ciblés réussis ; profils, bornes, Unicode, références et préservation des niveaux déclarés. Régression NUL reproduite rouge puis corrigée : refus avant réservation pour les trois profils et les champs canoniques.
- Stockage : 32 tests unitaires réussis, 1 cas de lien symbolique fichier ignoré sous Windows ; jonctions réelles vérifiées. Permissions natives nécessaires hors bac à sable Windows. Cas ignoré à exécuter en CI Linux.
- Domaine : 21 tests unitaires du package réussis, build et typecheck strict réussis.
- Tests API et worker : typechecks stricts et Biome réussis.
- Suites de services ajoutées : DB 6 cas, domaine 10, API 8, worker 14, S3 7. Les 45 cas sont désormais passés dans la CI réelle ci-dessus.
- Tentatives locales d'intégration : arrêt sur prérequis manquants (`.env.test`, URLs runtime/opérateur, Redis). Ports PostgreSQL/Redis/S3 indisponibles et Docker absent. Aucun test réel acquis localement.
- `pnpm check` après correctif NUL : lint, tous typechecks stricts et builds réussis ; 172 unitaires réussis, 1 ignoré Windows.
- Audit des dépendances après ajout SDK : réussi au seuil haut, zéro haute/critique ; 1 modérée existante. Gitleaks sur diff indexé : aucune fuite détectée.

## Acceptation vérifiée en CI

La première CI `39872026334` a échoué au lint sur une ligne vide de PROGRESS ajoutée après le contrôle local ; aucun test de service n'a été exécuté dans son job quality. Corrigé dans `ea8f736`, avec contrôle Biome global réussi et nettoyage S3 protégé si le conteneur n'a pas été créé. Les jobs Compose de cette première exécution ne remplacent pas la validation complète du commit corrigé.
- [x] Lint, typecheck strict, unités et builds.
- [x] PostgreSQL runtime non propriétaire : RLS, provenance immuable, FK même tenant, privilèges, rollback et migrations.
- [x] Quota/idempotence/alias concurrents, staging et reprise, autorisation actuelle y compris doublons.
- [x] Stockage S3 réel : authentification, refus anonyme, écriture conditionnelle, conflit/race, bornes et intégrité.
- [x] Worker réel PG/Redis : trois formats, sources privées, retries/DLQ, corruption, interruption, retrait d'autorisation, annulation et absence d'observations partielles.
- [x] HTTP : sessions/Origin/tenant, DTO sans clé ni source, erreurs génériques et pagination.
- [x] Chromium existant et Compose avec source privée partagée, worker séparé et déduplication.
- [x] Audit des dépendances et Gitleaks.

## Limites de preuve et suite

Pas de production, client réel, scan actif ni email externe. S3 compatible jetable n'atteste pas IAM AWS, chiffrement géré, restauration ou disponibilité. Profils SARIF/CycloneDX bornés, sans conformité exhaustive ; aucune corrélation ni verdict de sécurité. Conservation/quota des stagings sans purge automatique ; PR08 doit définir la rétention. Charge, infrastructure et restauration restent des validations futures. Voir [exploitation](INGESTION.md).

La demande utilisateur impose l'arrêt après cette PR05. PR06 et les suivantes restent non commencées ; aucune fusion ni production autorisée.
