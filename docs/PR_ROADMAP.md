# Bump OS PR roadmap

Every row is a separate reviewable feature boundary. PR 01 is in progress; PR 02–16 are planned, unimplemented and blocked by their prerequisite gates. No future row represents a created GitHub PR.

| PR  | Capability                              | Direct prerequisites   | Acceptance evidence                                                                                                                                                   |
| --- | --------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Project Foundation                      | None                   | Reproducible install, checks/build, real PostgreSQL/Redis integration, worker completion, health failure tests, browser smoke, dependency and secret scans, opened PR |
| 02  | Identity, Organizations & Multi-Tenancy | 01                     | Proven identity provider, secure sessions, invitations/RBAC, cross-tenant denial tests, RLS evaluation, admin audit events                                            |
| 03  | Engagement & Authorization Engine       | 02                     | Versioned mandates, expiry/exclusion checks, explicit approval and out-of-scope refusal tests                                                                         |
| 04  | Distributed Execution Engine            | 03                     | Persistent jobs, retry/backoff, idempotence, cancellation, timeouts, dead-letter flow, emergency stop and interruption/concurrency tests                              |
| 05  | Universal Audit Ingestion               | 02, 04                 | Canonical observations, JSON/SARIF/SBOM validation, provenance, limits, protected local/S3 storage, duplicate-import tests                                            |
| 06  | Open Source Security Connectors         | 03, 04, 05             | Confined Semgrep/Trivy/Gitleaks adapters, permissions, limits, normalized results and fixture tests; future adapters only documented                                  |
| 07  | Finding Intelligence Engine             | 05                     | Deterministic correlation/scoring, uncertainty states, human confirmation, history, retest/closure criteria                                                           |
| 08  | Evidence & Audit Trail                  | 02, 05                 | Integrity hashes, append-only event controls, tenant access, secret redaction, retention, controlled export and tamper tests                                          |
| 09  | AI Gateway & Agent Infrastructure       | 03, 04, 08             | Provider/agent/tool registries, validated outputs, prompt versions, budgets/costs, evaluations and sensitive-action approvals; no model training                      |
| 10  | Workflow Intelligence Engine            | 02, 03                 | Process steps, observed/assumed cost inputs, deterministic ROI, automation priorities, before/after and decision history                                              |
| 11  | Remediation Engine                      | 04, 07, 08             | Confirmed-finding tasks, assignment, approval, acceptance checks, retest and verified closure; no automatic production deployment                                     |
| 12  | Professional Reporting Engine           | 07, 08, 10, 11         | Versioned reproducible FR/EN HTML/PDF, authorized evidence, uncertainty labels, publication approval and redaction tests                                              |
| 13  | Commercial & Project Engine             | 03, 10                 | Minimal CRM, estimates/pricing/margins, proposal-to-project conversion, milestones, deliverables and recurring packages; estimates distinguished from contracts       |
| 14  | Integration Hub                         | 02, 04, 08             | Signed webhooks, external credentials, idempotent sync/mapping, provider limits, retries and event history                                                            |
| 15  | Observability & Reliability             | 04, 08                 | OpenTelemetry, correlation, metrics/traces, alerts, backup/restore drill, incident runbook and measured load/recovery targets                                         |
| 16  | Production Deployment & Hardening       | 06, 09, 12, 13, 14, 15 | Authorized staging/production configuration, external secrets/TLS, CI/CD, migrations/rollback, E2E/security/load/restore gates                                        |

The graph lists direct dependencies, including authorization before any execution engine. Transitive prerequisites apply automatically. A later-numbered PR can proceed before an earlier independent one once every prerequisite is verified.

```mermaid
graph TD
  P01[01 Foundation] --> P02[02 Identity and tenants]
  P02 --> P03[03 Mandates]
  P03 --> P04[04 Execution]
  P02 --> P05[05 Ingestion]
  P04 --> P05
  P03 --> P06[06 Connectors]
  P04 --> P06
  P05 --> P06
  P05 --> P07[07 Findings]
  P02 --> P08[08 Evidence]
  P05 --> P08
  P03 --> P09[09 AI gateway]
  P04 --> P09
  P08 --> P09
  P02 --> P10[10 Workflow intelligence]
  P03 --> P10
  P04 --> P11[11 Remediation]
  P07 --> P11
  P08 --> P11
  P07 --> P12[12 Reporting]
  P08 --> P12
  P10 --> P12
  P11 --> P12
  P03 --> P13[13 Commercial]
  P10 --> P13
  P02 --> P14[14 Integrations]
  P04 --> P14
  P08 --> P14
  P04 --> P15[15 Reliability]
  P08 --> P15
  P06 --> P16[16 Deployment]
  P09 --> P16
  P12 --> P16
  P13 --> P16
  P14 --> P16
  P15 --> P16
```

## Review and stacking rules

1. Name the first PR `chore: initialize Bump OS production foundation`; use a dedicated `codex/` branch.
2. A PR is **DRAFT** while required implementation or validation is incomplete, **BLOCKED** when a missing dependency or permission prevents progress, and **READY FOR REVIEW** only after required checks succeed.
3. Open PR 01 before starting dependent implementation. An unverified foundation is not a valid stacked base.
4. Branch dependent work from a verified prerequisite branch and target that branch in GitHub. Record the dependency PR links and exact verified commit in the description. Rebase and rerun affected checks when a base changes; retarget after merge.
5. Use separate worktrees and exclusive file ownership for independent agents. Coordinate shared schemas/contracts before edits. Never create incompatible parallel copies of a shared foundation.
6. Never auto-merge, disable branch protection, silently deploy, or label unverified work production-ready.

Each PR description records delivered behavior, architecture changes, tests actually run and their results, migration steps, risks, limitations, reproduction commands, and next dependencies. Draft PRs identify missing checks explicitly. Session reports include actual PR links, completed features, test evidence, remaining problems, blocking dependencies, and the next priority.

## Current delivery gate

Foundation implementation and validation are in progress. Docker availability, exact supported runtime, install/build/test results and GitHub push/PR permissions must be recorded from execution evidence. Until the PR 01 gate is verified, the next feature priority is PR 02 planning only. PR 03/04 depend on its real security boundaries and cannot be simulated with permissive stubs.
