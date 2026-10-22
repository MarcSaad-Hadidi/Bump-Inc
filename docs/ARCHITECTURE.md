# Bump OS architecture

Status: PR01 foundation, PR02 identity and PR03 mandates are verified and observed merged. PR04 execution is **READY FOR REVIEW**; PR05 passive ingestion has passed its functional CI. This document records design and implemented boundaries, not production readiness. See [the roadmap](PR_ROADMAP.md), [identity validation](IDENTITY_VALIDATION.md), [engagement validation](ENGAGEMENT_VALIDATION.md), [execution validation](EXECUTION_VALIDATION.md) and [ingestion validation](INGESTION_VALIDATION.md) for delivery gates and PR status.

## Decision: a modular monolith with separate workers

The API owns synchronous HTTP operations. A separate worker executes asynchronous jobs through Redis and BullMQ. PostgreSQL is the source of truth. Both processes share versioned contracts and database code inside one pnpm workspace. Separate deployable processes do not imply independent microservices or distributed domain ownership.

This keeps transactional consistency and local development simple while allowing worker concurrency to evolve. Split a service only when measured scaling, security isolation, or team ownership requires it. Domain packages are created when a real feature needs them, not as empty placeholders.

| Area           | Choice                                 | Purpose                                                             |
| -------------- | -------------------------------------- | ------------------------------------------------------------------- |
| Runtime        | Node.js 24 LTS, pnpm 10                | Pinned, reproducible workspace tooling                              |
| Language       | Strict TypeScript                      | Compile-time contracts without replacing input validation           |
| Admin          | Next.js 16 / React 19                  | Minimal server-rendered operational interface                       |
| HTTP           | Fastify 5                              | Schema-validated API, structured logging and central error handling |
| Data           | PostgreSQL 17 / Drizzle                | Versioned SQL migrations and typed persistence                      |
| Jobs           | Redis 7 / BullMQ                       | Separate asynchronous worker                                        |
| Contracts      | Zod                                    | Validate environment and untrusted input at boundaries              |
| Identity       | Better Auth / official Drizzle adapter | Passwords, verification, sessions and organizations                 |
| Email          | Nodemailer / local Mailpit             | Explicit SMTP delivery and local message capture                    |
| Tests          | Vitest / Playwright                    | Unit, real-service integration and essential browser tests          |
| Local services | Docker Compose                         | Reproducible PostgreSQL and Redis dependencies                      |

Exact patch versions are recorded in package manifests and the lockfile. Dependency changes require compatibility and vulnerability checks.

## Foundation boundaries

`apps/api` exposes liveness and dependency readiness checks. `apps/worker` consumes an internal probe job and records completion in PostgreSQL `system_probes`; this verifies a real queue-to-database path without adding a customer-facing execution API. `apps/web` displays API health, fetching only its configured internal API origin with a bounded timeout. `packages/db` owns migrations. `packages/contracts` owns shared validation schemas where used.

Health endpoints and the diagnostic page have no customer data or privileged actions. They remain unauthenticated and internal. PR 01 did not include identity; PR 02 adds the separate API boundaries below. PR05 adds the passive ingestion boundary described below; scanner execution and the AI gateway remain unimplemented. The internal probe is not the PR 04 execution engine.

API readiness indicates whether its dependencies respond. Liveness indicates whether a process responds; it does not promise its dependencies are ready. Neither substitutes for a measured availability guarantee. Tests must exercise failed dependencies as well as successful paths.

Environment variables are validated on application startup or first server access. Test databases and queue namespaces must be isolated from development and production. Logs must not serialize credentials, authorization headers, cookies, tokens, raw request bodies, or customer evidence. Server errors return a generic public message and correlation identifier rather than internal exception details.

## PR 02 identity and tenant boundaries

`packages/identity` configures Better Auth 1.7.12 with its official Drizzle adapter and organization plugin. The API allowlists public auth endpoints and wraps organization creation, invitations, membership changes and settings updates in transactions that also append administrative events. The authenticated session supplies the actor; raw organization-plugin HTTP endpoints are blocked. Sessions use database checks without cookie caching, and each tenant transaction locks current membership before setting transaction-local user/organization context.

`DATABASE_URL` belongs to a non-owner application login. Only migration tooling uses `MIGRATION_DATABASE_URL`. Organization settings and administrative events enforce PostgreSQL RLS in addition to application authorization. The shared identity tables are governed by Better Auth and Bump's API checks. Runtime roles cannot update, delete or truncate audit records; a database administrator can still administer data. [ADR 0002](adr/0002-identity-and-tenant-isolation.md) defines this boundary and its limits.

Invitations require the verified intended recipient, an unexpired grant and the inviter's current owner/admin membership at acceptance. Demotion or removal of the inviter prevents acceptance. Reissue creates a fresh invitation attributed to the current actor. Delivery occurs after transaction commit; failure preserves a pending invitation and reports failure. `packages/integrations` validates bounded plaintext mail and explicit SMTP configuration; production requires verified TLS. Local Mailpit captures messages without external delivery.

The UI remains diagnostic. Local signup is explicitly configured; public production signup and initial production account provisioning are unavailable. MFA, owner transfer, organization/account deletion, advanced pagination and production mail operations are outside this slice. Cross-tenant denial, revocation, forced audit rollback and real SMTP/verification flows passed the acceptance run linked in identity validation.

## Domain evolution and security gates

PR 03 introduces `packages/core` for actual mandate services and deterministic authorization policy. Immutable revisions snapshot the objective, responsible operator, exact targets/actions, exclusions, dates and plaintext authorization evidence. Owner approval binds the exact document digest and revision. Amendments require new approval; revocation is irreversible. API routes and future workers share the domain authorization function, which rechecks current membership, operator assignment and approver authority. Three new tenant tables enforce RLS and immutable history privileges. [ADR 0003](adr/0003-versioned-engagement-authorization.md) explains locking and scope limits.

PR 04 adds durable jobs, attempts, append-only events, organization controls and an outbox in PostgreSQL, with BullMQ as notification transport. Execution services remain in `packages/core`, used by API and the separate worker. Claims, retries, checkpoints and finalization recheck current tenant membership and PR03 mandate authorization in their tenant transaction. Organization locks, deadlines and attempt tokens coordinate distributed limits and recovery. Bounded SQL maintenance functions expose routing IDs and safe recovery only; their trusted migration owner retains BYPASSRLS while application processes do not. [ADR 0004](adr/0004-durable-execution.md), [operation](EXECUTION.md) and [validation](EXECUTION_VALIDATION.md) define the implemented boundary and pending gates.

Only a local synthetic handler is delivered in PR04. No customer jobs or scanners are launched by PR03's authorization preview. Connectors cannot execute arbitrary commands, and model output cannot become executable shell input. Active security operations require documented authorization and confinement to approved environments.

PR05 implements passive ingestion with bounded JSON Bump, SARIF and CycloneDX profiles. API reserves a tenant quota and immutable receipt, stores private bytes through the local/S3 adapter in `packages/integrations`, then atomically creates its internal PR04 job. The worker checks source integrity and current authorization before committing observations and job success in one transaction. PostgreSQL retains provenance and idempotence; Redis carries only the job ID. See [ADR 0005](adr/0005-passive-audit-ingestion.md), [operations](INGESTION.md) and [validation](INGESTION_VALIDATION.md) for supported profiles, storage and actual delivery gates. No scanner or connector is introduced.

OpenTelemetry is introduced in PR 15 alongside measured reliability needs; foundation structured logs and health checks remain the initial diagnostics. AI integrations arrive in PR 09 and do not include Cyber AI training.

OWASP ASVS 5.0 and applicable Quebec Law 25 requirements are future acceptance inputs: identity/session controls (PR 02), authorization (PR 03–04), protected evidence and retention (PR 05/08), data minimization for AI (PR 09), controlled reporting (PR 12), and operational safeguards (PR 15–16). Requirements need a traceable control/test matrix and qualified legal assessment before any compliance claim. The repository makes no legal-compliance claim.

## Delivery and operations

Each major capability is a separate branch and reviewable PR. Dependent work begins only on a verified base, either merged or as an explicitly documented stacked PR. Nothing merges automatically. PR 01 must pass its required checks and have a real GitHub PR before dependent feature implementation proceeds.

Production deployment, external infrastructure changes, real customer imports and active security scans are outside this foundation. PR 16 requires explicit infrastructure configuration and deployment authorization. Backup restoration, load targets, rollback, external secrets, TLS and incident response remain unverified until their own acceptance tests pass.
