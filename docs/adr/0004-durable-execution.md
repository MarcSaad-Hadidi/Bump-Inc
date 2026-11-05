# ADR 0004: durable authorized execution with notification transport

Date: 2026-10-22. Status: PR04 implementation, validation tracked separately.

## Decision

Keep execution services in the existing `packages/core`, storage/migrations in `packages/db`, shared input validation in contracts, HTTP in API and dispatch/processing in the separate worker. PostgreSQL owns jobs, attempts, transitions, controls and transactional outbox. BullMQ/Redis carries an opaque identifier; PostgreSQL retries and republishes notifications after interruption or transport loss.

Claim, finalization, cancellation, control changes and lease recovery share organization advisory locks. Running attempts consume distributed slots, attempt-start history supplies a rolling-minute rate cap, fixed deadlines bound leases and per-attempt tokens fence stale workers. Terminal events are immutable to runtime. No exactly-once external-effect guarantee is made.

Reuse PR03's policy through a transaction-level function. The caller establishes current locked membership through `withTenant`, then rechecks the mandate in the claim transaction and on every retry. Checkpoints and finalization repeat the policy; mutable approvals, membership and revisions cannot become cached execution permits. Authorization and deadline decisions use the database clock. Missing access fails closed.

## Narrow maintenance access

Dispatch must discover routable IDs across tenants, recover expired attempts and record denial after actor membership is removed. It cannot establish the removed actor's tenant context. Use five bounded SECURITY DEFINER functions owned by a separate trusted BYPASSRLS migration operator. The runtime role only executes them and has no operator credential. Routing returns IDs only; maintenance cannot change targets, actors, mandates, approvals, policy bounds or successful history. SQL is fixed and parameterized, search paths fixed and PUBLIC access revoked.

This is a trusted application-process boundary, like the identity subsystem, not resistance to runtime credential compromise. Separate API/worker database roles and a broader operational authorization system are not invented in this slice. Forced RLS and column grants continue to restrict ordinary tenant access and immutable inputs/history.

## Alternatives and consequences

BullMQ-only business state loses the authoritative history/retry policy if Redis is lost. Holding tenant transactions open throughout a handler delays revocation and consumes database connections. Separate orchestration services add deployment and consistency overhead before a measured need. A general-purpose command runner would introduce unauthorized execution risk; only a bounded, cooperative, local synthetic handler is delivered.

Cancellation and emergency stop prevent new starts and persist requests for active handlers; they cannot reverse effects. Remote connectors must later implement idempotent effects, fencing and cancellation along with DNS/destination confinement. DLQ replay is an explicit new authorized job, preserving the original bounded attempt history. No automatic merge or production deployment follows this ADR.

## Acceptance

Require real PostgreSQL/Redis tests for duplicate delivery, distributed limits, bounded retry/backoff, timeout, cancellation/emergency, interrupted publication, lost notifications, lease recovery, stale-token rejection, immutable/RLS boundaries and authorization loss before retries. Keep missing or failed checks distinct in [execution validation](../EXECUTION_VALIDATION.md).

BullMQ's [job ID semantics](https://docs.bullmq.io/guide/jobs/job-ids) and [connection guidance](https://docs.bullmq.io/guide/connections) inform transport deduplication and bounded producer/reconnecting consumer behavior; the installed version remains pinned in the workspace lockfile.
