# Bump OS architecture

Status: PR 01 foundation under implementation. This document records the chosen design; it does not certify deployment readiness or successful validation. See [the roadmap](PR_ROADMAP.md) for gates and dependencies.

Branch note: `loi-25` adds a [local passive audit prototype](LOI25.md). PostgreSQL owns reports,
the existing BullMQ worker owns queued scans, and development runs the same scanner directly
in the API with PostgreSQL or a memory fallback. Business endpoints deny production and
non-loopback access until the identity/tenant/mandate modules exist; this branch does not
claim to deliver or unblock those roadmap modules.

## Decision: a modular monolith with separate workers

The API owns synchronous HTTP operations. A separate worker executes asynchronous jobs through Redis and BullMQ. PostgreSQL is the source of truth. Both processes share versioned contracts and database code inside one pnpm workspace. Separate deployable processes do not imply independent microservices or distributed domain ownership.

This keeps transactional consistency and local development simple while allowing worker concurrency to evolve. Split a service only when measured scaling, security isolation, or team ownership requires it. Domain packages are created when a real feature needs them, not as empty placeholders.

| Area           | Choice                  | Purpose                                                             |
| -------------- | ----------------------- | ------------------------------------------------------------------- |
| Runtime        | Node.js 24 LTS, pnpm 10 | Pinned, reproducible workspace tooling                              |
| Language       | Strict TypeScript       | Compile-time contracts without replacing input validation           |
| Admin          | Next.js 16 / React 19   | Minimal server-rendered operational interface                       |
| HTTP           | Fastify 5               | Schema-validated API, structured logging and central error handling |
| Data           | PostgreSQL 17 / Drizzle | Versioned SQL migrations and typed persistence                      |
| Jobs           | Redis 7 / BullMQ        | Separate asynchronous worker                                        |
| Contracts      | Zod                     | Validate environment and untrusted input at boundaries              |
| Tests          | Vitest / Playwright     | Unit, real-service integration and essential browser tests          |
| Local services | Docker Compose          | Reproducible PostgreSQL and Redis dependencies                      |

Exact patch versions are recorded in package manifests and the lockfile. Dependency changes require compatibility and vulnerability checks.

## Foundation boundaries

`apps/api` exposes liveness and dependency readiness checks. `apps/worker` consumes an internal probe job and records completion in PostgreSQL `system_probes`; this verifies a real queue-to-database path without adding a customer-facing execution API. `apps/web` displays API health, fetching only its configured internal API origin with a bounded timeout. `packages/db` owns migrations. `packages/contracts` owns shared validation schemas where used.

Health endpoints and the diagnostic page have no customer data or privileged actions. They are unauthenticated in PR 01 and must stay internal. No tenant isolation, identity provider, authorization engine, audit ingestion, scanner execution, or AI gateway is delivered by foundation work. The internal probe is not the PR 04 execution engine.

API readiness indicates whether its dependencies respond. Liveness indicates whether a process responds; it does not promise its dependencies are ready. Neither substitutes for a measured availability guarantee. Tests must exercise failed dependencies as well as successful paths.

Environment variables are validated on application startup or first server access. Test databases and queue namespaces must be isolated from development and production. Logs must not serialize credentials, authorization headers, cookies, tokens, raw request bodies, or customer evidence. Server errors return a generic public message and correlation identifier rather than internal exception details.

## Domain evolution and security gates

PR 02 introduces proven authentication, secure sessions, organizations, permissions, administrative events and tenant boundaries. Its design must evaluate PostgreSQL row-level security alongside scoped application queries. Negative tests must deny cross-tenant reads, writes, list operations and background work before customer data is accepted.

PR 03 adds explicit, expiring mandates and allowed assets/actions. PR 04 rechecks tenant access and mandate validity at execution, including retries. Connectors cannot execute arbitrary commands, and model output cannot become executable shell input. Active security operations require documented authorization and confinement to approved environments.

S3-compatible storage with a local development adapter arrives with ingestion/evidence, when artifact semantics exist. OpenTelemetry is introduced in PR 15 alongside measured reliability needs; foundation structured logs and health checks remain the initial diagnostics. AI integrations arrive in PR 09 and do not include Cyber AI training.

OWASP ASVS 5.0 and applicable Quebec Law 25 requirements are future acceptance inputs: identity/session controls (PR 02), authorization (PR 03–04), protected evidence and retention (PR 05/08), data minimization for AI (PR 09), controlled reporting (PR 12), and operational safeguards (PR 15–16). Requirements need a traceable control/test matrix and qualified legal assessment before any compliance claim. The repository makes no legal-compliance claim.

## Delivery and operations

Each major capability is a separate branch and reviewable PR. Dependent work begins only on a verified base, either merged or as an explicitly documented stacked PR. Nothing merges automatically. PR 01 must pass its required checks and have a real GitHub PR before dependent feature implementation proceeds.

Production deployment, external infrastructure changes, real customer imports and active security scans are outside this foundation. PR 16 requires explicit infrastructure configuration and deployment authorization. Backup restoration, load targets, rollback, external secrets, TLS and incident response remain unverified until their own acceptance tests pass.
