# GitHub operations and repository governance

This guide defines **desired controls** and the remaining owner-only configuration tasks.
Committing configuration files does not activate repository-level protections.
Follow [CONTRIBUTING.md](../CONTRIBUTING.md), [SECURITY.md](../SECURITY.md),
[architecture](ARCHITECTURE.md), and [security operations](SECURITY_OPERATIONS.md).
The application is not authorized for a public production deployment.

## Repository ownership and account security

- The current repository is owned by an individual account and is public.
  Decide on a company-owned GitHub organization and an explicit source-code
  visibility policy before transferring ownership or changing visibility.
  Transferring a repository changes links, policies and access; coordinate it
  with all contributors and integrations.
- Require two-factor authentication for all maintainers; prefer passkeys or
  hardware-backed security keys and store recovery codes separately.
- Give the smallest access level needed. No shared accounts or shared personal
  access tokens. Review members, outside collaborators, installed GitHub Apps
  and deploy keys quarterly and after personnel changes.
- When an organization exists, keep at least two trusted organization owners for
  recovery, with separate accounts; grant repository write access to actual
  contributors and admin access only to maintainers.
- Keep the default GitHub Actions token read-only; grant extra permissions
  only to the workflow/job needing them. Never put privileged deployment
  credentials in ordinary PR workflows or untrusted pull_request_target jobs.

## Branch model and pull requests

- §main§ is the integration branch. Work in a §codex/<scope>§ branch with one
  coherent change per PR. Do not push directly to §main§.
- Use draft PRs while dependencies, tests or documentation are incomplete.
  Explain why when a check is unavailable; never mark an unchecked gate passed.
- Require review by another human contributor and resolve review conversations.
  Authors cannot approve their own PRs. The initial CODEOWNERS file routes
  review requests to the current maintainer; **do not enable required CODEOWNERS
  review for every PR until a second authorized reviewer is added**, or owner
  authored PRs may become impossible to merge.
- Prefer squash merges for independently reviewable changes, with a clear title.
  Do not enable automatic merging while the foundation is under development.
- Treat dependency update PRs as ordinary changes: review source/changelogs,
  Node compatibility, Docker images, permissions and all affected checks.
  In particular, major Node updates must not override the pinned Node 24 engine
  requirement without a separate compatibility migration and tests.

## Ruleset to activate manually (GitHub Settings > Rules > Rulesets)

Create an **active branch ruleset** covering the default branch §main§:

1. Require pull requests before merging and at least **one approval from a
   person other than the PR author**. Dismiss stale approvals when the diff
   changes; require conversation resolution.
2. Require passing status checks; select the *exact checks shown on a completed
   PR run*. Existing CI job names are §quality§, §secrets§, and §compose§.
   Once the new workflows have executed successfully, also include §codeql§
   and §dependency-review§. Do not guess check names or mark a failing/unrun
   workflow as required before validating it.
3. Block force pushes and branch deletion. Do not provide a permanent human
   bypass unless a documented emergency procedure truly requires it.
4. Optionally require branches to be current with §main§ before merging,
   balancing stricter verification against extra CI reruns.
5. Open a disposable PR and confirm that failed checks and missing human
   approval actually prevent merging; also verify an authorized reviewer can
   approve a normal PR. A visible ruleset alone is not enforcement proof.

GitHub repository ruleset and required-review features depend on repository
visibility and plan. Confirm coverage before changing the repo to private.

## Automated checks supplied by repository files

- Existing CI: §quality§ (lint/types/tests/build/integration/browser/dependency
  audit), §secrets§ (Gitleaks), and §compose§ (stack smoke test).
- CodeQL: TypeScript/JavaScript and GitHub Actions analysis on §main§, PRs,
  and weekly schedule. Only use **one** CodeQL setup mode: do not duplicate
  an already enabled Default Setup with this Advanced Setup workflow.
- Dependency Review: evaluates new risky dependencies in PRs. The existing
  §pnpm audit:dependencies§ remains complementary and checks the lockfile.
- Dependabot: weekly npm, GitHub Actions and Docker update PRs. Human review,
  tests, and support-window validation remain mandatory.
- Workflows use pinned third-party commit SHAs; review and update those pins
  through audited dependency PRs. Required status checks should be added only
  after their actual names and successful operation have been confirmed.

Public-repository CodeQL and Dependency Review are normally available. If
the repository becomes private, GitHub Code Security licensing/eligibility
can affect these checks: verify access before requiring them.

## Security settings requiring manual administration

- Inspect §Settings > Security / Code security and analysis§: enable supported
  secret scanning and push protection, security advisories/private vulnerability
  reporting and Dependabot security updates. Availability depends on plan.
- Review GitHub Actions policy: trusted actions only, least privilege token,
  and no unauthorized workflow creation or self-hosted runners.
- Enable alert notifications for the maintainers; triage code scanning alerts,
  dependency alerts and leaked secrets. Do not silence findings just to pass CI.
- Protect releases/tags with an appropriate tag ruleset when production
  versioning starts. Configure environments (§staging§ and §production§)
  only once explicit deployment approval, external secrets, rollback and
  recovery procedures are in place.
- Audit collaborator access, app permissions and settings periodically.
  Never assume a YAML file changed any of these settings automatically.

## Standard review and release routine

1. Open or link an issue, identify the roadmap dependency and create a
   scoped branch.
2. Open a draft PR, explain risks, and run affected local checks.
3. Wait for the real GitHub CI results; fix failures instead of weakening gates.
4. Request human review, respond to comments, and merge only after required
   checks are green. Do not auto-merge.
5. Review the §main§ checks after merge. For a future authorized deployment,
   promote a validated build through staging with manual production approval,
   documented migrations, rollback, evidence and post-deploy verification.

Production release automation has **not** been enabled by this governance work.
