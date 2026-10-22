# ADR 0001: modular monolith with separate workers

Status: accepted for implementation; delivery validation is tracked separately.

## Context

Bump OS begins almost empty and must eventually support tenant consulting, authorized audits, evidence, AI-assisted analysis and reporting. Distributed microservices would multiply contracts, deployment coordination and failure modes before there is measured demand.

## Decision

Use a pnpm workspace with strict TypeScript on Node.js 24 LTS. Keep synchronous HTTP in Fastify 5, minimal internal administration in Next.js 16 / React 19, and BullMQ processing in a separate worker. PostgreSQL 17 owns durable data through Drizzle migrations; Redis 7 supports queues. Zod validates boundaries. Vitest and Playwright test behavior; Docker Compose supplies local dependencies and a full-stack profile.

Create shared packages only for used behavior. The foundation's internal system probe is a testable queue-to-database vertical slice, not the authorized execution engine. Prefer existing framework/platform features. No external fonts or ornamental administration features are required. Pin dependencies in manifests and the lockfile.

## Alternatives and consequences

Microservices have no established independent scaling or ownership need. An in-process worker would couple job and HTTP lifecycles. Custom authentication/cryptography are excluded; PR 02 must choose an established maintained solution. S3 adapters, scanner connectors, AI integrations and OpenTelemetry arrive with their using features rather than empty foundation packages.

API and worker share contracts and durable schemas but scale separately. Schema changes need compatibility across deployed processes. Migrations run explicitly instead of racing application startups. Redis availability affects jobs and readiness; advanced retries, cancellation and recovery belong to PR 04.

Identity, tenant boundaries, mandates, external secrets, retention, backup and deployment remain separate roadmap gates. Extract services only when evidence justifies the operational cost.
