# Execution engine — PR04

Delivery status and executed checks: [EXECUTION_VALIDATION.md](EXECUTION_VALIDATION.md). Progress: [PROGRESS.md](PROGRESS.md). PR04 depends on PR03 at `6b8562f8e0db378f8fc129e4f577f9aa10499f6a` and targets `codex/engagement-authorization` until that branch merges.

## Durable state and transport

`execution_job` is authoritative. States are `queued`, `running`, `retry_wait`, `succeeded`, `cancelled`, `denied`, `dead_letter`. A job stores its original actor, exact engagement revision/target/action, bounded policy and request digest. The unique organization/actor/idempotency key returns the same job for a normalized identical request; different input under that key conflicts with HTTP 409.

Submission, event append and outbox creation commit together. `execution_attempt` records each actual attempt and a unique fencing token; its identity cannot be rewritten by runtime. Finalized attempts cannot be changed again. `execution_event` is append-only to runtime. Completion, retries and their events/outbox updates commit together.

The separate worker publishes only `{jobId}` to `bump-executions`. BullMQ is notification transport, not the business ledger or retry authority. Publication acknowledgement postpones another notification five seconds; the outbox persists until claim or terminal state. A crash around publication, duplicate notification or loss of queued Redis data causes redelivery. Claiming serializes in PostgreSQL and skips already running or completed jobs. Application retries use stored PostgreSQL attempt counts and exponential delays `min(60000, backoffMs * 2^(attempt - 1))`; BullMQ notification attempts are one. Redis removes completed/failed notifications; PostgreSQL retains the DLQ and history.

Every worker tick performs bounded recovery and dispatch (100 rows each, one-second idle interval). Expired running attempts become retries or DLQ; recovery checks the lease under the same organization lock as claim/finalization. A fresh token fences old checkpoints/results. Availability after recovery includes the stored backoff. Recovery does not grant execution authority: the next claim reauthorizes everything.

## Authorization and controls

API actors come from verified database sessions. Business reads and mutations use `withTenant`; current membership is locked through the transaction. A claim calls PR03's authorization policy **inside the claim transaction**, reloading current responsible operator, engagement head/version, approval and approver role, validity dates, integrity and exact scope/exclusions. A previous authorization never replaces this check. Checkpoints and finalization repeat it. Denied authorization terminates the job without further handler work.

Organization advisory locks serialize claims, cancellation, controls, finalization and maintenance across worker processes. The concurrency cap counts running jobs, including requested cancellations until they stop or expire. The rate cap counts attempt starts over the preceding rolling 60 seconds. Defaults: concurrency 2, rate 30 starts/minute. Administrator bounds: concurrency 1–32 and rate 1–1000. Lowering a cap prevents additional claims until the count allows them.

Cancellation terminates queued/retry jobs immediately; an active attempt receives a persistent cancellation request. The synthetic handler checkpoints at intervals of at most 100 ms of local delay, plus database latency. An organization emergency stop blocks submission/claims, cancels queued/retry work and requests active cancellation. Resuming allows new jobs; cancelled work remains cancelled. Requests and outcomes remain in history. Control changes append an administrative event transactionally.

The built-in handler is explicitly `synthetic`: a bounded local wait and optional deterministic failure for acceptance testing. It reads no declared target and launches no network activity, scanner, shell or AI execution. Timeout is authoritative in PostgreSQL; the handler also uses a monotonic local deadline. Process shutdown stops dispatch, signals active work and records failed attempts when possible; a hard crash is recovered after its deadline. A database outage fails closed and leaves durable recovery to a later tick.

## HTTP API

All paths require a verified session; mutations require the configured Origin.

| Method | Path under `/organizations/:organizationId` | Behavior                                                |
| ------ | ------------------------------------------- | ------------------------------------------------------- |
| POST   | `/executions`                               | Submit as the currently authorized responsible operator |
| GET    | `/executions`                               | Most recent 100 jobs in the current tenant              |
| GET    | `/executions/:jobId`                        | Job, all bounded attempts and events                    |
| POST   | `/executions/:jobId/cancel`                 | Originating actor or current owner/admin; empty body    |
| GET    | `/execution-control`                        | Current tenant controls                                 |
| PUT    | `/execution-control`                        | Current owner/admin changes all three controls          |

Submission example (replace IDs with synthetic fixtures from your isolated environment):

```json
{
  "engagementId": "123e4567-e89b-42d3-a456-426614174000",
  "expectedRevision": 1,
  "target": { "kind": "hostname", "value": "lab.example.invalid" },
  "action": "configuration.read",
  "kind": "synthetic",
  "payload": { "durationMs": 0, "failUntilAttempt": 0 },
  "idempotencyKey": "synthetic-example-1",
  "maxAttempts": 3,
  "timeoutMs": 5000,
  "backoffMs": 1000
}
```

The mandate must already exist and be currently approved for that actor/target/action. Defaults are maxAttempts 3, timeoutMs 5000 and backoffMs 1000; bounds are 1–5, 100–30000 ms and 100–60000 ms respectively. Payload duration is 0–30000 ms and failUntilAttempt 0–5. Unknown fields/handlers/commands fail validation. No HTTP response exposes the internal lease token, attempt token or request digest. List/detail is accessible to current organization members, like mandate history.

## Migration and operation

Use `MIGRATION_DATABASE_URL` only in migration tooling. Apply reviewed new SQL migration `0003_execution_engine`; never rewrite 0000–0002 or delete existing volumes. The migration's function owner must be a trusted operator with BYPASSRLS or superuser. This requirement is checked in the migration. API/worker retain the non-owner, NOBYPASSRLS runtime credential; runtime startup checks ownership of all new tables.

Forced RLS protects the five tenant tables. Runtime cannot delete jobs/attempts/events, rewrite job inputs or mutate an event. Bounded SECURITY DEFINER functions expose only routing IDs and controlled publication/recovery/removal denial. Their search path is fixed and PUBLIC execute is revoked. They exist because dispatch and denial after membership removal cannot use an absent actor's tenant access. API and worker share a trusted application role; these functions are not a boundary against application credential/process compromise. See [ADR 0004](adr/0004-durable-execution.md).

Reproduce on a disposable environment with isolated matching `_test` PostgreSQL runtime/operator URLs and Redis database `/1`:

```text
pnpm install --frozen-lockfile
pnpm infra:up
pnpm db:migrate
pnpm check
pnpm test:integration
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit:dependencies
docker compose --profile app up --build -d --wait
node scripts/compose-smoke.mjs
```

Use the documented `.env` development settings for Compose and `.env.test` for isolated tests; shell variables override either file. Review actual destinations before migration. The normal worker entrypoint starts the execution worker and dispatcher alongside the existing internal probe. No production infrastructure is configured or deployed by this work.

## Limits and next dependencies

Execution is at least once with fenced state transitions. A future external side effect must have its own idempotency/fencing contract and cooperative cancellation; PostgreSQL cannot roll back a remote effect after a worker crash. The current handler has no external effects. The engine does not forcibly terminate arbitrary code; such code is not accepted. Revocation/cancellation cannot undo a completed effect. DNS/redirect confinement belongs to PR06 connectors.

The DLQ is queryable durable state, not an automatically replaying queue. After fixing the underlying issue, an authorized operator submits a new job under a new idempotency key and current approved revision; old failed history remains unchanged. Retries of the same job cannot exceed its stored bound. Fair scheduling, retention/archival, global fleet caps, load targets and backup/restore drills remain later operational work. Membership/mandate locks and checkpoints fail closed; availability under heavy tenant contention remains unmeasured.

PR05 ingestion may begin only after PR04's required service-backed checks pass; PR06 also needs PR05. No empty modules or unverified downstream capability are counted as progress.
