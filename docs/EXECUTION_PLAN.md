# PR04 — conception et plan d'exécution

Objectif : livrer le moteur demandé dans le monolithe existant avec processus worker séparé, sur PR03 vérifiée. Les critères détaillés proviennent du handoff et de la demande de reprise.

## Conception retenue

PostgreSQL conserve les jobs, leurs tentatives et événements, le contrôle par organisation et un outbox. Une clé d'idempotence lie un acteur, une organisation et une requête normalisée. BullMQ transporte uniquement un identifiant opaque ; une boucle republie les notifications nécessaires, même après perte de Redis. La prise en charge atomique utilise des verrous et un jeton de tentative ; les résultats d'un worker devenu obsolète ne peuvent pas écraser la tentative courante.

Chaque tentative relit l'appartenance de l'acteur d'origine et appelle la politique PR03 dans sa transaction de prise en charge, sans réutiliser un permis antérieur. Un état non autorisé termine le job sans exécuter le handler. Les tentatives possèdent une échéance bornée ; expiration et interruption donnent lieu à retry/backoff borné, puis DLQ. L'annulation et l'arrêt d'urgence empêchent les prises en charge et signalent l'arrêt des handlers actifs. Les plafonds de concurrence et débit sont sérialisés en PostgreSQL entre tous les workers.

Le seul handler livré est une démonstration synthétique locale, sans réseau ni shell. Les handlers futurs devront respecter l'annulation et l'idempotence de leurs effets ; aucune promesse d'effets exactement une fois. Les fonctions SQL de découverte et entretien du worker ne doivent exposer que les métadonnées de routage indispensables et des transitions strictement bornées, même si l'acteur a perdu son appartenance. Les données métier passent par `withTenant` et sa transaction.

## Propriété des fichiers et tâches

1. **Stockage** : `packages/db/src/execution-schema.ts`, migration SQL 0003 + journal, exports DB, vérification du rôle, tests DB. RLS et historique append-only ; fonctions bornées d'outbox et récupération.
2. **Domaine** : `packages/core/src/execution.ts`, extraction minimale de l'autorisation transactionnelle PR03, exports core et tests de politique. Soumission, lecture, annulation, contrôle, claim, heartbeat/checkpoint et finalisation avec jeton.
3. **API et worker** : contrats partagés, routes HTTP et branchement identité, worker BullMQ et cycle de dispatch/récupération, dépendances workspace existantes et lockfile si nécessaire.
4. **Validation** : nouveaux fichiers de tests d'intégration moteur/API/worker exclusivement, avec données synthétiques. Doublons, outbox interrompu, perte transport, crash, leases, retries et refus après retrait, modification, expiration et révocation.

Le coordinateur possède les contrats, routes, worker, documentation, configuration et intégration finale. Chaque agent reçoit ses chemins exclusifs avant modification. Aucun changement simultané d'un même fichier. Les interfaces sont communiquées avant les travaux dépendants.

## Contrôles et jalons

- [ ] Écrire les contrats et interfaces, puis les tests ciblant les invariants avant l'implémentation concernée.
- [ ] Implémenter SQL et domaine ; compiler les packages et vérifier la compatibilité de PR03.
- [ ] Raccorder les routes et le worker ; exécuter les tests unitaires et contrôles stricts.
- [ ] Exécuter les tests PostgreSQL/Redis, Chromium, Compose, audit et Gitleaks ; consigner toute indisponibilité.
- [ ] Revoir la sécurité et les courses, documenter les limites, publier une PR distincte ciblant PR03 et observer sa CI.
- [ ] Poursuivre PR05 uniquement si tous les prérequis PR04 sont vérifiés, dans une branche et une PR séparées.

Risques à vérifier explicitement : perte d'appartenance après mise en file, concurrence multi-workers, annulation contre finalisation, crash après publication ou effet, restauration du transport vide. Aucun handler externe ne fait partie de PR04.
