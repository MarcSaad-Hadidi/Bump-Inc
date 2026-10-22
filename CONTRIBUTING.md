# Contributing to Bump OS

Read [the architecture](docs/ARCHITECTURE.md), [PR roadmap](docs/PR_ROADMAP.md) and repository agent instructions before editing. Use a dedicated `codex/` branch, one coherent feature per PR and coordinated ownership of shared contracts and schemas.

PR 01 must be verified and opened before dependent implementation. Use merged prerequisites or a documented stack based on a verified commit. List dependency PRs, target the immediate base branch and rerun affected checks after rebasing. Never auto-merge or change branch protections.

## Implementing a change

- Search existing callers, tests, configuration and exports before changing shared code.
- Use strict TypeScript and validate untrusted inputs. Keep changes small; do not create empty feature packages or placeholder business behavior.
- Test new logic and regressions. Data/queue changes need real-service integration checks; authorization changes need negative and cross-tenant cases.
- Keep shared migration history immutable. Review SQL, document data impacts and prove upgrade behavior. Never point tests or destructive commands at production.
- Keep secrets, customer information and real audit evidence out of this public repository, fixtures, logs and PRs. Clearly identify synthetic fixtures.

## Checks and review

Follow README setup, then run `pnpm check`, `pnpm test:integration` and `pnpm test:e2e` for foundation or cross-application changes. Install Chromium with `pnpm exec playwright install chromium`. CI also checks dependencies and secrets. Fix failures rather than weakening checks or suppressing findings without assessment.

Record actual runtimes, commands, outcomes and blockers. A check that could not run has not passed. Missing Docker, supported Node or external permissions leaves the corresponding gate unverified.

Each PR describes the problem/result, delivered scope, architecture, dependency PRs and verified base commit, migrations, executed tests, limitations, risks and reproduction steps. Use the PR template where present. Allowed states are **DRAFT** (incomplete), **BLOCKED** (missing dependency/permission), and **READY FOR REVIEW** (required checks pass). Human review controls merge; deployment requires separate explicit authorization and configuration.
