# Execution validation evidence

Status: **READY FOR REVIEW — corrected implementation verified**. Corrected source `eee336bffdde06662fbfe2915a6c6a5df5ceb200` passed every required gate in [CI 39867661216](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39867661216): 122 unit tests, 72 PostgreSQL/Redis integration tests, one Chromium test, full Compose synthetic execution/retry/history smoke, dependency audit threshold and full-history Gitleaks. The following evidence-only commit records those results. Base PR03 commit `6b8562f8e0db378f8fc129e4f577f9aa10499f6a` passed CI [39847969234](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39847969234), independently checked before branching.

Initial implementation `101d574c0c86b98b80405650a1b5423c026f657e` passed all gates in [push CI 39866355404](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39866355404): unit/build/typecheck/lint, isolated PostgreSQL/Redis integration, Chromium, full Compose synthetic submission/retry/history smoke, dependency audit threshold and Gitleaks. The subsequent acceptance follow-up adds explicit exponential backoff, active mandate revocation and cooperative shutdown/retry tests; it requires a fresh successful CI before closing the PR04 gate. The GitHub PR for this roadmap capability is [#5](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/5).

The initial run's observed counts were 122 unit tests, 68 real-service integration tests and one Chromium test. A read-only independent source review found no actionable blocker, while identifying the absence of an actual process-death test. Commit `b7c8413` adds a child worker killed with SIGKILL after PostgreSQL records its active attempt; CI [39867123130](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39867123130) must establish recovery while Redis still retains that worker's active notification. The pinned BullMQ worker uses a 30-second transport lock by default; this transport state must not block the shorter PostgreSQL recovery policy.

The actual process-death regression failed as intended in [CI 39867128707](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39867128707): 71 integrations passed, one remained `retry_wait` because the abandoned Redis notification retained the same transport job ID. The correction removes the fixed BullMQ ID so every publication gets a fresh notification identity; PostgreSQL continues to enforce idempotence and fencing. The corrected commit requires its own complete successful run. Backoff, active revocation and cooperative shutdown tests passed in that failing run; a failed suite still keeps the PR DRAFT.

Corrected source `eee336bffdde06662fbfe2915a6c6a5df5ceb200`: [PR CI 39867661216](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39867661216) completed successfully. The crash regression now passes without waiting for the dead worker's Redis lock, alongside explicit backoff, active revocation and shutdown/retry tests. A follow-up review found no actionable blocker; it noted unmeasured transport backlog capacity with a live dispatcher and unavailable consumers, recorded in execution limits.

## Checks observed during development

- Contracts: two new unit tests passed.
- Core: execution/policy focused suite passed, 15 tests; build/typecheck passed.
- Database package: build/typecheck passed.
- API/worker focused strict typechecks passed after fixing a nullable deadline access.
- Full `pnpm check`: passed after formatting correction and rerun outside the Windows sandbox (Next standalone symlinks otherwise fail with EPERM): lint, strict workspace typechecks, 122 unit tests in 12 files and all builds.
- Dependency audit with registry network access: exit 0, zero high/critical and one moderate advisory. This is the existing development-only esbuild issue assessed in [foundation validation](VALIDATION.md); no new external dependency added.
- Full directory Gitleaks scan also inspected ignored tools/Next build output and reported generated/example keys; a synthetic token literal in a new unit fixture was replaced by `randomUUID()`. Gitleaks staged diff scan passed, no leaks found; no blanket rule suppression added.

## Real-service checks

Docker, PostgreSQL and Redis executables are unavailable locally; `.env.test` is absent. `pnpm test:integration` was attempted: eight suites failed prerequisite configuration before collection, and the existing API runtime test failed the same missing environment guard. New suites executed zero service cases. `pnpm test:e2e` was attempted and failed to start its application server without that environment. These are unavailable services, not passing test results. CI supplies isolated PostgreSQL 17 and Redis 7 and must validate migration 0003, all integrations, Chromium, full Compose smoke and Gitleaks before PR04 is considered verified.

All 72 integration cases passed in CI, including 27 new PR04 cases (5 DB, 18 worker, 4 HTTP). They cover durable idempotency, duplicate notifications, atomic multiworker claims, distributed limits, bounded retry/DLQ and timeout, exact exponential backoff, cancellation/emergency stop, revocation/amendment/expiry/approver demotion/member removal before retry, active revocation, cooperative shutdown/retry, interrupted publication, lost notifications, actual SIGKILL recovery, expired lease recovery and stale-result fencing. Database cases exercise forced RLS, actor/same-tenant constraints, immutable events/inputs and single attempt finalization. HTTP cases exercise sessions, tenant/operator boundaries, validation, controls, idempotency/history and internal token redaction.

## Limits and continuation gate

Only local synthetic work is implemented. No scanner, external effect, email, customer data, arbitrary command, merge or production deployment was performed. No claim of exactly-once external effects, measured load/recovery SLOs or production readiness. See [execution operation](EXECUTION.md) and [ADR 0004](adr/0004-durable-execution.md).

PR05 may now use the verified PR04 implementation as its prerequisite, in its own branch/PR stacked on [#5](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/5). Recheck the exact base and current GitHub state before beginning. No PR was automatically merged and no production infrastructure was changed.
