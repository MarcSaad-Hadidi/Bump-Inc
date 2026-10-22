# Security policy

The foundation is pre-release internal development software. It lacks authentication and tenant isolation and is not approved for public hosting or customer data. Production hardening and operational assurance are separate gates.

## Reporting vulnerabilities

Use **Report a vulnerability** in the repository's GitHub Security tab when private vulnerability reporting is enabled. Provide the affected revision, reproduction, impact and a minimal synthetic example privately. Never publish secrets, client data, credentials or exploit details in public issues, pull requests or logs.

If private reporting is unavailable, contact a maintainer through an existing verified private channel to request a secure route. Do not assume that a private endpoint or dedicated security email exists. No response-time commitment is published yet.

## Development controls

- Keep environment files and credentials out of version control. Example configuration is local-only. Rotate exposed credentials; deleting a committed secret does not revoke it.
- Use synthetic test data and isolated test environments. Treat migrations, retention, imports and exports as sensitive operations.
- Validate boundary inputs and configuration. Exclude credentials, authorization headers, cookies and raw sensitive payloads from logs. Return generic server errors.
- Keep diagnostic endpoints and the web page internal. Bind local services to loopback and do not forward ports publicly.
- Forbid arbitrary command execution, AI-generated shell execution, unauthorized scanning and automatic production remediation. Security tests require an explicit mandate and approved scope.
- Scan dependencies and secrets in CI. Resolve or assess findings with evidence and recheck dependency changes.

## Planned controls

PR 02 adds proven authentication, secure sessions, tenant authorization and cross-tenant tests. PR 03/04 enforce mandates before execution. PR 05/08 protect evidence, redaction and retention. PR 09 restricts model/tool permissions and requires sensitive-action approval. PR 15/16 add recovery drills, operations and authorized deployment hardening.

OWASP ASVS 5.0 and applicable Quebec Law 25 obligations inform future acceptance criteria. This foundation claims no certification, legal compliance, tested recovery objective or production security guarantee. Threat modeling, control-to-test mapping and qualified legal review remain required before relevant production use.
