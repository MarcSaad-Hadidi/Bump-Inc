# Security operations runbook (pre-production)

This is an internal incident-response checklist, not a certification, a legal
compliance claim, or authorization to process real customer data.
Read [SECURITY.md](../SECURITY.md) before security testing or sharing findings.

## Sensitive finding or exposed secret

1. Stop further sharing and report privately to maintainers. Do not paste
   credentials, client data, or proof-of-exploit into public GitHub issues,
   discussions, PRs, artifacts or CI logs.
2. Identify the affected secret, account, service and exposure window using
   approved access. Revoke or rotate the credential at the provider immediately;
   deleting it from source history is **not** revocation.
3. Review provider and repository audit activity for unauthorized access.
   Preserve only necessary evidence in an approved restricted location, never
   in the public repository. Assess applicable reporting duties with qualified
   advisors, including Quebec Law 25 where relevant.
4. Remove the secret from active files, tests and automation; consider history
   remediation with GitHub's official process and coordinate carefully.
   Re-scan affected paths and validate the rotated credentials.
5. Document the incident privately, actions, responsible reviewer, lessons,
   and closure conditions. Restore normal operations only after verification.

## Vulnerable dependency or insecure workflow

1. Review the advisory, affected version, exposure and supported fixes.
2. Prefer an updated, reviewed dependency; do not silently suppress alerts.
3. Run `pnpm check`, dependency audit and all relevant integration/end-to-end
   tests. Review GitHub Actions permission changes and pinned action SHAs.
4. For an urgent exception, record compensating controls, owner, expiry and
   follow-up work. Do not merge on green CI alone if the risk remains open.

## Identity, authorization and customer data

- The foundation is not production-ready. Authentication and tenant-isolation
  guarantees must be verified independently before accepting customer data or
  exposing protected services publicly.
- Use synthetic fixtures and isolated databases in tests. Never upload private
  evidence or user information as CI artifacts.
- Review cross-tenant access tests, authority-to-execute and least-privilege
  controls before introducing any active scan, customer import or automation.
- Protect backups, storage, telemetry and log retention as part of a separately
  approved deployment and privacy assessment.

## Routine maintenance

- Every PR: peer review, affected checks, data/privacy boundary review.
- Weekly: review dependency/security alerts and failed scheduled analyses.
- Monthly: examine stale branches, privileged tokens and untriaged findings.
- Quarterly: review collaborators, organization owners, installed GitHub Apps,
  recovery access, incident procedures and restore evidence.

No production release, external scan or incident notification is performed by
this document.
