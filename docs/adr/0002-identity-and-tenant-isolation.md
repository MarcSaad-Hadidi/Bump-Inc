# ADR 0002: library-backed identity and database tenant isolation

Date: 2026-10-22. Status: implemented for PR02; acceptance checks recorded separately.

## Context and decision

Use Better Auth 1.7.12 with its official Drizzle adapter and organization plugin. The library owns password hashing, email verification, resets, invitations and database sessions. Bump exposes an explicit auth endpoint allowlist and wraps organization mutations so membership authorization and an administrative audit event commit in the same PostgreSQL transaction. Raw organization plugin HTTP routes are unavailable.

Normal identity operations use the adapter's transactions. Wrapped organization operations bind a fresh auth instance to the existing Drizzle transaction with adapter transactions disabled. A forced audit failure must roll back the library mutation; this is a release gate, not an assumed property. The actor comes from the authenticated session, never a member-update hook's target user.

Sessions are checked against the database, without cookie caching. Every organization request checks current membership; a client-provided tenant ID or session's active organization never grants access by itself. Cookie-authenticated mutations require the exact configured Origin. Request origin is built from trusted configuration, not Host headers. Forwarded IP headers are replaced before passing the request to the auth library.

## PostgreSQL boundary

`MIGRATION_DATABASE_URL` belongs only to the migration operator. `DATABASE_URL` belongs to a non-owner application login inheriting the `bump_runtime` role. Startup refuses superuser, BYPASSRLS, role-administration and tenant-table owner capabilities. Runtime credentials are not sufficient to migrate the schema.

Shared identity/session/organization metadata is a trusted authentication subsystem. Its API access is controlled by Better Auth and Bump membership checks. Tenant-owned organization settings and administrative events additionally use PostgreSQL ENABLE/FORCE ROW LEVEL SECURITY. Policies require both the tenant context and current user's authoritative membership. Writes also check role; audit rows require the actor to match the user context.

The tenant helper locks the current membership row and uses parameterized, transaction-local `set_config`. It never leaves a session setting on a shared connection. Audit UPDATE, DELETE and TRUNCATE are unavailable to runtime roles. Database owners can still administer data: this is application append-only history, not the tamper-evident evidence system planned for PR08.

## Email and operational limits

Nodemailer sends bounded plaintext messages through explicit SMTP fields with certificate verification. Production requires TLS and external credentials. Verification/reset messages are delivered by the library callbacks. Invitation delivery happens after transaction commit; a failed SMTP delivery returns failure while preserving a pending invitation that can be resent.

Local Compose includes Mailpit bound to loopback; no relay or external mail delivery is configured. Local signup is explicit. Public production signup remains disabled; initial production account provisioning needs an approved operator onboarding procedure before deployment. The current UI remains a diagnostic page; identity functions are exercised through API integration and Compose smoke tests.

Accepting an invitation locks the invitation and checks that its inviter still has owner/admin membership. Removing or demoting the inviter revokes pending grants. Reissue creates a fresh invitation from the current administrator instead of preserving the old inviter. Concurrent acceptance can create only one membership and one audit event.

Owner transfer, organization deletion, account deletion, dynamic roles, teams, social login, MFA and production mail-provider setup are deliberately outside this slice. These are not simulated as completed features. Existing local volumes require the documented role bootstrap; never delete them to upgrade.

## Primary references

- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Organization plugin](https://better-auth.com/docs/plugins/organization)
- [Sessions](https://better-auth.com/docs/concepts/session-management)
- [PostgreSQL row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
- [Nodemailer SMTP transport](https://nodemailer.com/smtp)
- [Mailpit API](https://mailpit.axllent.org/docs/api-v1/)
