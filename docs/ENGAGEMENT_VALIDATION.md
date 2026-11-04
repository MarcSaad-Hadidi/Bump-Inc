# Engagement validation evidence

Status: **READY FOR REVIEW**. [PR #3](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/3) is stacked on verified identity PR #2. All required gates passed for implementation commit `88187826e609d6d58603e4179df231100413ade6` in [CI run 39847356527](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/39847356527), recorded 2026-10-22. Its base is the identity evidence commit `1580ae72e1e857fc6459a0d20ba46afd8f629124`, which also passed all gates in CI run 39844950839.

Node 24.22.1 / pnpm 10.34.7 validation passed locally and in CI: frozen install, lint, full strict typecheck, 116 unit tests and all workspace builds. The UUID follow-up passed focused local build/typecheck and 14 API unit tests, then the complete CI suite. Dependency audit reports zero high/critical issues and the same assessed moderate development-only esbuild advisory from [foundation validation](VALIDATION.md).
- 45 real PostgreSQL 17 / Redis 7 integration tests passed: 11 engagement API/service, 7 engagement database, 12 identity API, 10 identity database and 5 foundation tests.
- Engagement coverage includes exact scope and exclusions, expiry, current membership/operator/approver checks, cross-tenant denial, immutable history privileges, same-organization foreign keys, stale revisions, concurrent amendments/approvals, irreversible revocation, audit-induced transaction rollback and document tampering denial.
- A deterministic mixed-case UUID test holds the canonical PostgreSQL advisory lock, observes both requests waiting through `pg_locks`, then verifies one amendment succeeds and the other conflicts. Review found that PostgreSQL treats differently cased UUIDs as one row while raw text advisory keys differ; the shared service now normalizes the identifier before locking.
- 1 Chromium test passed against compiled applications and real dependencies.
- Full Compose build, runtime-role provisioning, all migrations and startup passed. HTTP smoke covered Mailpit verification, sign-in, organization/settings, mandate creation, draft denial, owner approval, authorization, revocation denial and logout.
- Gitleaks passed locally and in CI. No secrets were found.

Docker is unavailable on the local Windows host; CI supplied isolated real services. No active scan, external email, real customer document, production deployment or automatic PR merge occurred. PR04 execution, production onboarding, load/restore testing and production hardening remain unimplemented. See [the handoff](HANDOFF.md) for the next session.
