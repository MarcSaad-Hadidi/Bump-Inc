# Bump OS

Technology consulting platform. PR 01 supplies the verified TypeScript/Fastify/PostgreSQL/Redis foundation. PR 02 adds Better Auth identity, organizations, invitations, role checks, tenant settings, PostgreSQL row security and transactional administrative events. **Both PRs are READY FOR REVIEW with passing CI.** See [the PR roadmap](docs/PR_ROADMAP.md) for delivery gates.

PR 03 adds [versioned mandates and explicit authorization](docs/ENGAGEMENTS.md). It is **DRAFT pending its own validation**; the authorization preview performs no scan or job execution.

Use synthetic local data only. The diagnostic web page and health endpoints remain unauthenticated and internal; identity operations are exposed through the API. Public production signup, initial production account provisioning and deployment hardening are not delivered. Production deployment has not been authorized or verified.

## Local setup

Use Node.js **24.22.1**, pnpm **10.34.7** and Docker with Docker Compose. Start Docker first. Ports 3000 (web), 3001 (API), 3002 (worker health), 5432 (PostgreSQL), 6379 (Redis), 1025 (local SMTP) and 8025 (Mailpit) must be available.

From the repository root, in PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
pnpm install --frozen-lockfile
pnpm infra:up
pnpm build:packages
pnpm db:migrate
pnpm dev
```

On a POSIX shell use `cp` in place of `Copy-Item`. Examples contain local development/test configuration only. Keep environment files out of version control, and do not reuse their database credentials elsewhere. Review environment values before running migrations. `DATABASE_URL` uses the non-owner `bump_app` login; only migration tooling receives `MIGRATION_DATABASE_URL`. Existing foundation volumes need the [documented role bootstrap and migration upgrade](docs/IDENTITY.md#upgrade-an-existing-foundation-volume); preserve their data.

The local example explicitly enables signup with `AUTH_ALLOW_SIGNUP=true`. [Mailpit](http://127.0.0.1:8025) captures verification, reset and invitation messages locally without an external relay. Follow the [identity API flow](docs/IDENTITY.md#api-flow) to verify an email, sign in, create an organization and manage membership. Mutation requests require the configured `Origin` and JSON content type. Invitations are accepted only by their verified recipient while unexpired and while the inviter still has owner/admin membership. Reissuing creates a fresh invitation attributed to the current actor.

Open [the diagnostic page](http://127.0.0.1:3000). It performs fresh server-side checks and displays failed or timed-out checks as unavailable. API [liveness](http://127.0.0.1:3001/health/live) checks the process; [readiness](http://127.0.0.1:3001/health/ready) also checks PostgreSQL and Redis.

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

Integration and browser tests require PostgreSQL and Redis. Identity integration checks additionally require separately provisioned runtime/migration credentials and exercise synthetic users, tenant denial, session revocation and audit rollback. The full-stack identity smoke uses Mailpit. Run checks only against isolated local test services; shell-provided values override environment files. [Foundation validation evidence](docs/VALIDATION.md) applies to PR 01; [identity validation](docs/IDENTITY_VALIDATION.md) records PR 02's passing real-service gates.

The browser smoke test expects healthy API dependencies. Unit tests cover unreachable API behavior, non-success health responses and invalid internal URLs. The worker's internal probe verifies queue-to-database delivery; it is not a customer job API or full execution engine.

GitHub Actions supplies automated checks, dependency analysis and secret scanning. A configured workflow is not evidence that it passed. No required check may be skipped to mark a PR ready for review.

## Repository map

| Location                 | Responsibility                                         |
| ------------------------ | ------------------------------------------------------ |
| `apps/api`               | HTTP API and health checks                             |
| `apps/worker`            | Asynchronous job consumption                           |
| `apps/web`               | Internal foundation diagnostics                        |
| `packages/db`            | Database schema and versioned migrations               |
| `packages/contracts`     | Shared boundary validation                             |
| `packages/identity`      | Better Auth configuration and organization integration |
| `packages/integrations`  | Validated SMTP delivery                                |
| `packages/observability` | Structured logging without sensitive payloads          |
| `tests/e2e`              | Essential browser behavior                             |
| `docs`                   | Architecture, roadmap, decisions and validation        |

See [architecture](docs/ARCHITECTURE.md), [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md), [the foundation ADR](docs/adr/0001-modular-monolith.md), and [the identity ADR](docs/adr/0002-identity-and-tenant-isolation.md). PR 03 is based on verified PR 02; PR 04 execution depends on its authorization gate.
