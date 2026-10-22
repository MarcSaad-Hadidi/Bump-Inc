# Security policy

Bump OS is pre-release internal development software. PR 02's identity and tenant controls passed their real-service acceptance checks and are **READY FOR REVIEW**. It is not approved for public hosting or customer data. The diagnostic page and health endpoints remain unauthenticated; production hardening and operational assurance are separate gates.

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

## Verified PR 02 controls

Better Auth manages passwords, verified email, reset and database sessions. Cookie caching is disabled; organization operations recheck authoritative membership. Cookie-authenticated mutations require the exact configured Origin, and forwarded client-IP headers cannot override the socket identity. Raw organization-plugin HTTP routes are blocked so they cannot bypass Bump's transactional authorization and administrative audit.

Tenant settings and administrative events use forced PostgreSQL row security plus transaction-local user/organization context. Runtime logins cannot own these tables, bypass RLS, or modify/delete audit rows. Better Auth's shared identity tables remain within the trusted authentication subsystem; RLS does not protect against a compromised runtime process impersonating another user or a privileged migration credential. Administrative history is not the tamper-evident evidence system planned for PR 08.

Invitation acceptance requires its verified recipient, a valid expiry and the inviter's current owner/admin membership. Inviter demotion or removal denies acceptance; reissue creates a fresh grant under the current actor. SMTP messages are validated and bounded, with production TLS and certificate verification. Mail errors are sanitized; local Mailpit does not relay messages externally. Production signup and initial account provisioning remain unavailable pending an approved onboarding procedure.

See [identity validation](docs/IDENTITY_VALIDATION.md) for actual acceptance evidence. MFA, owner transfer, organization/account deletion and production mail-provider operations are outside this slice.

## Remaining controls

PR 03 adds versioned mandate authorization and is pending its own [acceptance checks](docs/ENGAGEMENT_VALIDATION.md). Approval binds an immutable revision and plaintext document digest; it does not verify a legal signature. Scope uses exact targets/actions with exclusions, current membership and responsible-operator checks. The preview launches no job or scan. PR 04 must call the same authorization service again before execution and retry; future network connectors must validate actual resolved destinations and redirects.

PR 05/08 protect binary evidence, redaction and retention. PR 09 restricts model/tool permissions and requires sensitive-action approval. PR 15/16 add recovery drills, operations and authorized deployment hardening.

OWASP ASVS 5.0 and applicable Quebec Law 25 obligations inform future acceptance criteria. This foundation claims no certification, legal compliance, tested recovery objective or production security guarantee. Threat modeling, control-to-test mapping and qualified legal review remain required before relevant production use.
