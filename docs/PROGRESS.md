# Suivi du développement Bump OS

Dernière mise à jour : 2026-10-22 (America/Toronto). Ce fichier distingue le travail réalisé des validations encore attendues. Une case cochée exige une preuve observée ; les résultats des anciennes PR ne valident pas les changements suivants.

## Base vérifiée

- [x] Lire AGENTS.md, HANDOFF, ARCHITECTURE, PR_ROADMAP, ENGAGEMENT_VALIDATION et ADR 0001–0003.
- [x] Inspecter Git : arbre initial propre, branche `codex/engagement-authorization`, commit `6b8562f8e0db378f8fc129e4f577f9aa10499f6a`.
- [x] Vérifier GitHub : PR [#1](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/1), [#2](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/2), [#3](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/3) ouvertes, non fusionnées et correctement empilées.
- [x] Vérifier les CI [39847356527](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39847356527) et [39847969234](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39847969234) : `quality`, `compose`, `secrets` réussis.
- [x] Créer `codex/distributed-execution-engine` depuis cette base vérifiée. [PR04 = GitHub #5](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/5) cible `codex/engagement-authorization` tant que PR03 reste ouverte.

## PR04 — Distributed Execution Engine

Statut : **DRAFT — implémentation initiale vérifiée, tests complémentaires en attente de CI**.
- [x] Écrire l'implémentation, les contrats, la migration 0003, les routes, le worker et les nouveaux tests ; revue par fichiers attribués terminée. Les critères fonctionnels ci-dessous attendent encore les tests réels.
- [x] Ajouter [le plan](EXECUTION_PLAN.md), [l'exploitation](EXECUTION.md), [ADR 0004](adr/0004-durable-execution.md) et [le registre des validations](EXECUTION_VALIDATION.md).
- [x] `pnpm check` : réussi, 122 tests unitaires (12 fichiers), lint, typechecks stricts et tous les builds. Relance hors bac à sable nécessaire pour les liens Windows du build Next standalone.
- [x] Audit npm : aucun problème haut/critique, une modérée déjà évaluée. Gitleaks sur le diff indexé : aucune fuite détectée.
- [x] Commit initial `101d574` : CI complète réussie, 122 unitaires, 68 intégrations PostgreSQL/Redis, Chromium et Compose. Revue indépendante : aucun blocage identifié sur ce delta.
- [x] Compléments backoff exponentiel exact, révocation active et arrêt coopératif : passés en CI sur `b7c8413`.
- [ ] Crash réel : régression reproduite en CI [39867128707](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39867128707), 71 intégrations réussies et une échouée. Correction : identifiant de notification Redis frais à chaque publication ; nouvelle CI requise.
- [ ] Contrats Zod, stockage SQL des jobs, tentatives, historique et outbox transactionnel.
- [ ] Idempotence et transitions atomiques ; doublons sans double exécution concurrente.
- [ ] Vérification actuelle de l'appartenance et du mandat au démarrage et à chaque retry.
- [ ] Retries bornés, backoff, timeouts et DLQ persistante.
- [ ] Annulation, arrêt d'urgence et limites distribuées de débit/concurrence.
- [ ] Publication/republication et récupération après interruption ou perte Redis.
- [ ] API authentifiée et worker séparé avec démonstration synthétique inoffensive.
- [ ] Tests de sécurité, concurrence, interruptions et reprise contre PostgreSQL/Redis réels.
- [ ] `pnpm test:integration` : tentative locale échouée, configuration PostgreSQL/Redis absente ; validation CI attendue.
- [ ] `pnpm test:e2e` : tentative locale échouée au démarrage du serveur sans environnement ; validation CI attendue.
- [x] PR distincte [#5](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/5) ouverte en DRAFT. CI initiale [39866355404](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39866355404) intégralement réussie sur `101d574`. Une nouvelle CI doit valider les trois tests complémentaires.

## Journal de cette reprise

| Étape               | Réalisé                                                   | Preuve / limite                                                        |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Inspection initiale | Documents, Git, PR et CI contrôlés ; branche dédiée créée | Base et liens ci-dessus ; aucune modification préexistante à préserver |
| Suivi demandé       | Création de ce fichier                                    | Mis à jour à chaque jalon significatif                                 |

## Dépendances suivantes

Code PR04 écrit : stockage et historique, autorisation transactionnelle, worker/dispatch, contrôles et routes. Les nouveaux cas d'intégration restent à valider avec les services ; une assertion explicite du backoff exponentiel a été ajoutée après l'implémentation initiale. La démonstration Compose couvre désormais une soumission avec retry et historique via le worker séparé ; son exécution reste attendue.
- PR05 ingestion : attend PR02 + PR04 vérifiées.
- PR06 connecteurs : attend PR03 + PR04 + PR05 vérifiées.
- PR07–16 : suivre les dépendances directes et transitives de [PR_ROADMAP.md](PR_ROADMAP.md). Rien n'est déclaré livré à ce stade.

## Contraintes permanentes

Aucune fusion automatique, aucun déploiement réel, donnée client, email externe ou scan actif non autorisé. PostgreSQL est la source de vérité ; Redis reste le transport. Aucune commande construite depuis une entrée utilisateur ou IA. Les contrôles indisponibles sont consignés séparément des contrôles réussis.
