# Bump OS

Le site public Bump (version 46, français et anglais) est disponible dans **[`website/`](website/README.md)**. Ce dossier contient ses propres sources, modèles 3D, musique, polices, dépendances et instructions pour un hébergement indépendant.

Le dépôt réunit Bump OS, le prototype local Loi 25 et l’espace privé **Bump Cyber** à `/cyber`. Cyber réutilise Next.js/React, Fastify, PostgreSQL/Drizzle, Redis/BullMQ et Better Auth. Ses clients, mandats, analyses, constats et rapports sont distincts du produit Loi 25. Voir [l’architecture Cyber](docs/CYBER_ARCHITECTURE.md), [l’installation et l’exploitation](docs/CYBER_OPERATIONS.md) et [les résultats de validation](docs/CYBER_VALIDATION.md).

The `loi-25` branch adds a local passive audit prototype at `/loi-25`; see [setup, scope and restrictions](docs/LOI25.md).

L’authentification avec email vérifié, le TOTP, les contrôles de rôles et l’isolation tenant sont implémentés dans le parcours Cyber. L’exploitation de production, la conservation documentaire et les accès d’infrastructure doivent encore être validés avant des données client réelles. Les applications de développement restent privées ; aucun déploiement n’a été autorisé ni effectué.

## Local setup

For the local Loi 25 console without infrastructure, run `pnpm install --frozen-lockfile`
then `pnpm dev`. API (3001) and web (3000) start together with local defaults; no `.env`
or feature flag is needed. Missing PostgreSQL/audit tables select the labelled memory
fallback. See [Loi 25 development behavior](docs/LOI25.md) before enabling persistence.

For the full foundation stack, use Node.js **24.22.1**, pnpm **10.34.7** and Docker with Docker Compose. Start Docker first. Ports 3000 (web), 3001 (API), 3002 (worker health), 5432 (PostgreSQL) and 6379 (Redis) must be available.

From the repository root, in PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
pnpm install --frozen-lockfile
pnpm infra:up
pnpm build:packages
pnpm db:migrate
pnpm cyber:init
pnpm dev
```

On a POSIX shell use `cp` in place of `Copy-Item`. Examples contain local development/test configuration only. Keep environment files out of version control, and do not reuse their database credentials elsewhere. Review environment values before running migrations.

Open [the diagnostic page](http://127.0.0.1:3000). It performs fresh server-side checks and displays failed or timed-out checks as unavailable. API [liveness](http://127.0.0.1:3001/health/live) checks the process; [readiness](http://127.0.0.1:3001/health/ready) also checks PostgreSQL and Redis.

Pour Cyber, ouvrir [l’espace privé](http://127.0.0.1:3000/cyber), créer un compte local, vérifier le courriel dans [Mailpit](http://127.0.0.1:8025), puis créer l’organisation. `pnpm cyber:tools` prépare les trois images officielles épinglées et la base publique Trivy, sans analyser de cible. Les moteurs natifs nécessitent un daemon Docker Linux capable d’appliquer CPU, mémoire, swap, PID et seccomp ; sinon ils restent indisponibles et les imports JSON/SARIF restent proposés. Voir [les profils réellement intégrés](docs/CYBER_SCANNERS.md).

`API_INTERNAL_URL` is a server-side HTTP(S) origin, normally `http://127.0.0.1:3001`; the full container stack uses `http://api:3001`. It cannot contain credentials, a non-root path, query or fragment. Next loads the root `.env` with Node's native environment-file support; shell-provided variables take precedence. Configuration must come from trusted operators.

To run the complete stack in containers:

```powershell
docker compose --profile app up --build
```

Stop application processes with Ctrl+C and infrastructure with `pnpm infra:down`. Compose preserves the PostgreSQL volume by default. Do not remove volumes unless deliberately deleting local data.

## Verification

```powershell
pnpm check
pnpm test:integration
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` runs lint, typecheck, unit tests and build. Integration tests load `.env.test`; its example uses database `bump_test` and Redis database 1. Compose initializes the test database when its PostgreSQL volume is first created. For an existing volume, create that test database explicitly without deleting development data. Browser tests use separate application ports 3100 and 3101.

Integration and browser tests require PostgreSQL and Redis. They verify actual persistence and queue processing. Run them only against isolated local test services; shell-provided values override environment files. Les E2E utilisent 3100, 3101 et 3102 avec un worker réel. `pnpm test:scanners` exécute les trois outils natifs dans des conteneurs isolés sur le laboratoire synthétique ; l’absence de limites Docker bloque ce contrôle. Review [Cyber validation evidence](docs/CYBER_VALIDATION.md) for actual results and blockers.

The browser smoke test expects healthy API dependencies. Unit tests cover unreachable API behavior, non-success health responses and invalid internal URLs. The worker's internal probe verifies queue-to-database delivery; it is not a customer job API or full execution engine.

GitHub Actions supplies automated checks, dependency analysis and secret scanning. A configured workflow is not evidence that it passed. No required check may be skipped to mark a PR ready for review.

## Repository map

| Location             | Responsibility                                  |
| -------------------- | ----------------------------------------------- |
| `apps/api`           | HTTP API and health checks                      |
| `apps/worker`        | Asynchronous job consumption                    |
| `apps/web`           | Diagnostics, Loi 25 et espace privé Cyber       |
| `packages/db`        | Database schema and versioned migrations        |
| `packages/contracts` | Shared boundary validation                      |
| `tests/e2e`          | Essential browser behavior                      |
| `docs`               | Architecture, roadmap, decisions and validation |

See [architecture](docs/ARCHITECTURE.md), [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md), and [the foundation ADR](docs/adr/0001-modular-monolith.md). Add domain packages only when real functionality needs them.

## Bump Cyber security foundation

The verified identity, mandate, execution and private ingestion modules are reconciled from the existing PR02–05 branches. See [Cyber architecture](docs/CYBER_ARCHITECTURE.md), [identity](docs/IDENTITY.md) and [mandates](docs/ENGAGEMENTS.md). Runtime uses the non-owner `bump_app` role; migrations use `MIGRATION_DATABASE_URL`. Local defaults do not authorize customer use.
