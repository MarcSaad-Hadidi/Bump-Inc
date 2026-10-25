## Problem and resulting behavior

Explain the user or engineering problem and the observable result.

## Dependencies and base branch

Link prerequisite PRs, verify the base commit and identify stacked PRs.

## Implemented scope and architecture

Describe changed modules, public interfaces, data flows, permissions and any deliberate exclusions.

## Validation actually executed

Check a box only after running the command successfully; explain any non-applicable or unavailable check.
A failed, skipped or unavailable required check keeps this PR **DRAFT / BLOCKED**.
- [ ] `pnpm check` (or documented narrower checks)
- [ ] `pnpm test:integration` when data, authorization or queue behavior changes
- [ ] `pnpm test:e2e` when web or cross-application behavior changes
- [ ] `pnpm audit:dependencies` when dependencies change
- [ ] Relevant GitHub Actions jobs completed successfully
- [ ] Reproduction steps, commands, results and blockers recorded below

**Commands, results and missing evidence:**

## Security and data boundaries

- [ ] No secrets, credentials, real customer data, private audit artifacts or sensitive logs included
- [ ] Authorization / tenant / mandate boundaries evaluated if affected
- [ ] Input validation, logging and error handling reviewed if affected
- [ ] Third-party dependency and GitHub Actions changes reviewed if affected
- [ ] No production deploy, external scan or client import requested by this PR

## Migrations and verification instructions

List schema or configuration changes, backward-compatibility impacts and safe test/rollback steps.
Do not run destructive operations against production.

## Risks, known limitations, and next dependencies

Mention outstanding risks, existing alerts, affected services and follow-up issues.

**Merge rule:** Human review and required green checks before merging. No automatic merge or production deployment.
