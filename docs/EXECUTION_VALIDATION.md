# Execution validation evidence

Status: **DRAFT — service-backed PR04 acceptance pending**. Base PR03 commit `6b8562f8e0db378f8fc129e4f577f9aa10499f6a` passed CI [39847969234](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39847969234), independently checked during this session. This prior success does not validate PR04.

Initial implementation `101d574c0c86b98b80405650a1b5423c026f657e` passed all gates in [push CI 39866355404](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39866355404): unit/build/typecheck/lint, isolated PostgreSQL/Redis integration, Chromium, full Compose synthetic submission/retry/history smoke, dependency audit threshold and Gitleaks. The subsequent acceptance follow-up adds explicit exponential backoff, active mandate revocation and cooperative shutdown/retry tests; it requires a fresh successful CI before closing the PR04 gate. The GitHub PR for this roadmap capability is [#5](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/5).

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

Integration tests are authored for durable idempotency, duplicate notifications, atomic multiworker claims, distributed limits, bounded retry/DLQ and timeout, cancellation/emergency stop, revocation/amendment/expiry/approver demotion/member removal before retry, interrupted publication, lost notifications, expired lease recovery and stale-result fencing. Database tests exercise forced RLS, actor/same-tenant constraints, immutable events/inputs and single attempt finalization. HTTP tests exercise sessions, tenant/operator boundaries, validation, controls, idempotency/history and internal token redaction. These are intended coverage until their execution succeeds.

## Limits and continuation gate

Only local synthetic work is implemented. No scanner, external effect, email, customer data, arbitrary command, merge or production deployment was performed. No claim of exactly-once external effects, measured load/recovery SLOs or production readiness. See [execution operation](EXECUTION.md) and [ADR 0004](adr/0004-durable-execution.md).

PR05 remains pending until PR04 passes its required gates. Record the actual PR link, commit, CI run and observed counts here when available; leave any unmet requirement explicit and the PR DRAFT.
