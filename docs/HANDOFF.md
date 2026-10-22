# Passage de relais — Bump OS

## Reprise PR04 du 2026-10-22

La consigne d'arrêt après PR03 ci-dessous décrit la session précédente. L'utilisateur a ensuite demandé PR04 et la continuation selon les dépendances. La reprise actuelle est sur `codex/distributed-execution-engine`, depuis la base PR03 vérifiée `6b8562f8e0db378f8fc129e4f577f9aa10499f6a`.
- Jalon PR04 : [PR GitHub #5](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/5), READY FOR REVIEW après vérification, cible `codex/engagement-authorization`. GitHub #4 concerne une autre proposition documentaire ; elle n'est pas le moteur PR04.
- Implémentation initiale : `101d574c0c86b98b80405650a1b5423c026f657e`. Jobs/états/tentatives/historique/outbox PostgreSQL, transport BullMQ, autorisation transactionnelle courante à chaque claim/retry/checkpoint/finalisation, limites distribuées par organisation, timeout/reprise avec jeton, annulation/arrêt d'urgence et handler synthétique local uniquement.
- `pnpm check` local réussi : 122 unitaires, lint, typechecks stricts et builds. Audit : zéro haute/critique, une modérée déjà évaluée. Gitleaks diff indexé : réussi. Exécution hors bac à sable nécessaire pour les liens Windows Next standalone.
- Services réels indisponibles localement : Docker absent, `.env.test` absente. Tentatives d'intégration/E2E échouées sur leurs prérequis, aucune validation réelle locale acquise.
- Correction fonctionnelle `eee336bffdde06662fbfe2915a6c6a5df5ceb200` vérifiée par [CI 39867661216](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39867661216) : 122 unitaires, 72 intégrations PostgreSQL/Redis, un Chromium, Compose, audit et Gitleaks réussis. Un test SIGKILL a reproduit un défaut de déduplication transport, corrigé en laissant BullMQ générer une nouvelle identité de notification ; PostgreSQL conserve l'idempotence et le fencing. PR04 est READY FOR REVIEW, sans fusion.
- Références actuelles : [suivi vivant](PROGRESS.md), [validation PR04](EXECUTION_VALIDATION.md), [exploitation](EXECUTION.md), [plan](EXECUTION_PLAN.md), [ADR 0004](adr/0004-durable-execution.md). Ces fichiers ont priorité pour l'état PR04 sur les paragraphes historiques ci-dessous.

Avant la suite : lire les résultats CI et la revue, corriger toute anomalie, mettre à jour les preuves. PR05 attend PR02 + PR04 vérifiées ; toute capacité suivante reste dans sa propre branche/PR empilée. Aucune fusion automatique, donnée client, action externe réelle ou mise en production autorisée.

## Consigne pour l’IA suivante

Reprends le développement de Bump OS à partir du dépôt existant. Termine les vérifications du jalon PR03 si nécessaire, puis prépare PR04 uniquement après confirmation de sa base vérifiée. Ne recrée pas la fondation, ne fusionne aucune PR automatiquement et ne déploie rien en production. L’utilisateur a demandé l’arrêt de cette session après PR03 ; PR04 appartient à la prochaine session.
- Dépôt : <https://github.com/MarcSaad-Hadidi/Bump-Inc>.
- Workspace Windows : `C:\Users\hadid\Bump-Inc` ; terminal PowerShell.
- Branche de travail au passage de relais : `codex/engagement-authorization`.
- Lire d’abord `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/PR_ROADMAP.md`, les ADR et les documents de validation.
- Inspecter `git status`, la branche réelle, les modifications existantes, les PR GitHub et leurs CI avant toute nouvelle branche. Préserver le travail non commité ; ne pas supposer qu’un état décrit ici est encore actuel.

## Pile de PR et état vérifiable

| PR                                                         | Branche                          | Base prévue                   | État au moment de la rédaction                                             |
| ---------------------------------------------------------- | -------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| [PR01](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/1) | `codex/production-foundation`    | `main`                        | READY FOR REVIEW, preuves dans `docs/VALIDATION.md`                        |
| [PR02](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/2) | `codex/identity-tenancy`         | `codex/production-foundation` | READY FOR REVIEW, preuves dans `docs/IDENTITY_VALIDATION.md`               |
| [PR03](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/3) | `codex/engagement-authorization` | `codex/identity-tenancy`      | READY FOR REVIEW, correction des UUID comprise, tous les contrôles réussis |

**`docs/ENGAGEMENT_VALIDATION.md` est la référence pour l’état final de PR03**, son commit vérifié, les résultats et les limites. Le commit fonctionnel `88187826e609d6d58603e4179df231100413ade6` a passé [la CI 39847356527](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39847356527) : 116 tests unitaires, 45 tests d’intégration réels, 1 Chromium, Compose, audit des dépendances et Gitleaks. Le commit de documentation qui contient ce passage de relais lui succède. Vérifier également les bases et états GitHub réels : aucune fusion n’était effectuée lors de la rédaction.

Une PR dépendante cible la branche vérifiée de sa dépendance tant que celle-ci n’est pas fusionnée. Documenter le lien et le commit exact de cette base. Si elle change, rebaser proprement et relancer les contrôles concernés. Ne jamais désactiver une protection ni transformer une PR incomplète en READY FOR REVIEW.

## Ce qui existe réellement

- Monolithe modulaire TypeScript strict : Node 24, pnpm 10, Fastify 5, Next 16/React 19, PostgreSQL 17, Redis 7/BullMQ, Drizzle, Zod, Vitest et Playwright. Versions exactes dans les manifestes et le lockfile.
- `apps/api` : santé, identité, organisations, invitations, RBAC, paramètres, événements administratifs et API de mandats.
- `apps/web` : diagnostic interne de santé uniquement ; pas d’interface métier complète.
- `apps/worker` : sonde interne BullMQ avec résultat PostgreSQL ; **ce n’est pas le moteur d’exécution PR04**.
- `packages/identity` : Better Auth, sessions vérifiées en base, confirmation d’adresse, invitations et organisations. `packages/integrations` : SMTP borné, TLS en production, Mailpit local pour les tests.
- `packages/db` : migrations SQL, accès tenant transactionnel, rôle applicatif non propriétaire, RLS et historique protégé. `packages/contracts` : validation partagée. `packages/observability` : journaux structurés sans données sensibles.
- `packages/core` : mandats versionnés immuables, périmètre exact, exclusions prioritaires, opérateur responsable, dates, preuve textuelle et SHA256, approbation propriétaire, révocation irréversible. Chaque révision exige sa propre approbation.
- L’autorisation relit l’appartenance courante, la révision et l’autorité de l’approbateur. Son résultat est un instantané, jamais un permis durable. Voir `docs/ENGAGEMENTS.md` et ADR 0003.
- Aucun scanner, moteur IA, import d’audit client ni déploiement de production n’est livré. PR05–16 restent les capacités planifiées du graphe de `docs/PR_ROADMAP.md`, pas des implémentations acquises.

## Prochaine étape : PR04, moteur d’exécution

Avant de coder, confirmer les preuves PR03 et examiner le worker existant. Créer une seule PR de capacité, sur sa base vérifiée, avec un périmètre testable et sans commandes arbitraires ni faux connecteurs. Critères d’acceptation à concrétiser :
1. PostgreSQL conserve les tâches, transitions, tentatives et historique ; BullMQ/Redis transporte les notifications. Une perte Redis ne doit pas faire perdre l’état métier.
2. Réexaminer le tenant et le mandat à l’exécution **et à chaque nouvelle tentative** : membre actuel, opérateur, révision attendue, approbation actuelle, dates, exclusions, cible/action exactes et révocation. Ne jamais réutiliser une autorisation mise en cache comme preuve suffisante.
3. Définir et persister les états, un outbox transactionnel, des clés d’idempotence et les transitions atomiques. Tester livraison en double, publication interrompue et reprise après crash ; ne pas promettre une exécution « exactement une fois » sans preuve sur les effets.
4. Fournir retries bornés, backoff, timeout, annulation, file de rebut/DLQ et reprise contrôlée. Une annulation ou un arrêt d’urgence doit empêcher les nouvelles exécutions et encadrer les tâches déjà en cours.
5. Borner débit et concurrence, éviter l’exécution concurrente d’une même tâche, récupérer les tâches interrompues et conserver un historique exploitable des décisions et tentatives.
6. Tester de manière déterministe avec PostgreSQL et Redis réels : doublons, interruptions, panne/reprise, concurrence, timeout, annulation, arrêt d’urgence, DLQ et refus après retrait de membre, modification/expiration/révocation du mandat.
7. Garder la démonstration inoffensive et synthétique. Les futurs connecteurs devront aussi vérifier les IP résolues et les redirections ; le périmètre PR03 ne fait ni résolution DNS ni scan actif.

Documenter architecture, migrations, commandes reproductibles, résultats réellement observés, limites et dépendances. PR05–16 suivent leurs prérequis directs et transitifs ; ne pas créer de modules vides pour simuler leur avancement.

## Environnement et vérifications

Le Node système de cette machine est 25, hors plage du projet. Le runtime requis est `.tools/node-v24.22.1-win-x64/node.exe` ; pnpm 10.34.7 est disponible via `.tools/pnpm/package/bin/pnpm.cjs`. Ces outils locaux ne remplacent pas les pins du dépôt.

```powershell
Set-Location C:\Users\hadid\Bump-Inc
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.1-win-x64') + ';' + (Join-Path (Get-Location) '.tools/bin') + ';' + $env:PATH
node --version
pnpm --version
# Si pnpm n’est pas accessible : node .tools/pnpm/package/bin/pnpm.cjs <commande>
pnpm install --frozen-lockfile
pnpm check
pnpm audit:dependencies
```

Docker est absent de cet hôte ; GitHub Actions fournit PostgreSQL/Redis réels et valide également Compose, Mailpit et Chromium. Ne pas annoncer localement ces contrôles comme réussis. Sur un environnement avec Docker : créer `.env` et `.env.test` depuis les exemples uniquement s’ils n’existent pas, puis suivre `README.md` pour `pnpm infra:up`, `pnpm db:migrate`, `pnpm test:integration`, `pnpm exec playwright install chromium` et `pnpm test:e2e`. Le stack complet utilise `docker compose --profile app up --build`.

`pnpm build:packages` reconstruit les exports partagés ; `pnpm dev` lance les applications. Les tests utilisent une base isolée suffixée `_test`, des identifiants runtime/migration distincts et Redis de test. Les variables du shell prévalent sur les fichiers d’environnement : contrôler les destinations avant toute migration. Pour un EPERM de répertoire temporaire Vitest sur cet hôte, utiliser le répertoire local existant `.artifacts/tmp` pour `TEMP` et `TMP`.

## Contraintes à préserver

- Limites connues : inscription publique et amorçage des comptes de production indisponibles ; aucun déploiement prêt à être exploité. L’audit de dépendances relève zéro vulnérabilité haute/critique et une modérée dans esbuild, dépendance de développement transitive de drizzle-kit, évaluée dans `docs/VALIDATION.md`.
- Aucune fusion automatique, aucun affaiblissement de protection, aucun déploiement sans autorisation explicite d’infrastructure.
- Données synthétiques exclusivement ; aucun client réel, document confidentiel, secret ou email externe réel dans les tests. Ne pas afficher ni commiter les fichiers `.env`, cookies, tokens ou identifiants.
- L’acteur vient de la session ; chaque accès métier vérifie l’appartenance courante via `withTenant`. Le login applicatif n’utilise jamais le rôle de migration.
- Aucun shell construit depuis une entrée utilisateur ou une sortie IA. Les références documentaires restent du texte inerte, jamais des URL à récupérer automatiquement.
- Ne pas supprimer de volumes ou écraser des changements existants pour contourner un problème. Ne pas modifier une migration déjà appliquée à un environnement partagé.
- Rapporter les contrôles réellement passés, ceux qui échouent et ceux indisponibles. CI configurée, SHA256 documentaire et exigences OWASP/Loi 25 ne constituent ni preuve d’exécution, ni signature légale, ni certification de conformité.
