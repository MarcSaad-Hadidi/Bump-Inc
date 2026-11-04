# Identity and organization API

PR02 is stacked on the verified foundation PR. Use only synthetic local data until the tenant acceptance checks in `IDENTITY_VALIDATION.md` pass and deployment hardening is complete.

## Fresh local environment

Copy the updated `.env.example` and `.env.test.example` to their ignored local counterparts, review credentials, run `pnpm install --frozen-lockfile`, `pnpm infra:up`, `pnpm build:packages`, `pnpm db:migrate`, then `pnpm dev`. Mailpit is at `http://127.0.0.1:8025`. Its SMTP port 1025 and web UI are loopback only. The local example explicitly enables signup; set `AUTH_ALLOW_SIGNUP=false` to disable it.

The application uses `bump_app`, a non-owner login. Only migrations use the separate `MIGRATION_DATABASE_URL`. Do not put the migration credential into API or worker runtime configuration. The database migration creates identity tables, tenant settings, append-only administrative events, grants and RLS policies. Role creation is a separate operator task.

## Upgrade an existing foundation volume

Keep the volume. Add `APP_DATABASE_PASSWORD`, `MIGRATION_DATABASE_URL` and the identity/SMTP variables from the new examples to your `.env`; change `DATABASE_URL` to the application login. Restart the PostgreSQL container to receive the updated configuration and mounts:

```powershell
docker compose up -d --wait postgres
docker compose exec -T postgres sh /docker-entrypoint-initdb.d/20-runtime.sh
pnpm build:packages
pnpm db:migrate
```

Run role creation once per cluster. If roles already exist, inspect their privileges rather than rerunning or resetting credentials blindly. Apply migrations separately to `bump_test` before testing, using the test migration URL. CI provisions a fresh cluster itself.

## API flow

All mutation requests need `Content-Type: application/json` and `Origin` exactly equal to `AUTH_BASE_URL` (local default `http://127.0.0.1:3001`). Preserve the session cookies returned at sign-in. Never put them in logs, committed files or URLs.
1. `POST /api/auth/sign-up/email` with `{ "name": "Local tester", "email": "tester@example.invalid", "password": "a-local-test-password" }`. Signup requires the explicit local flag; password length is 12–128.
2. Open the verification link in Mailpit. Unverified accounts cannot sign in.
3. `POST /api/auth/sign-in/email` with the same email/password; preserve all Set-Cookie headers.
4. `POST /organizations` with `{ "name": "Synthetic client", "slug": "synthetic-client", "locale": "fr" }` creates an organization, owner membership, settings and audit event atomically.
5. Use the returned organization ID in the routes below. A guessed organization ID never replaces membership authorization.
6. `POST /api/auth/sign-out` revokes the current session. Resetting a password also revokes sessions.

| Route                                         | Behavior                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /me`                                     | Verified current user                                                                                                    |
| `GET /organizations`                          | Only current user's organizations                                                                                        |
| `GET /organizations/:id`                      | Organization and current member role                                                                                     |
| `PATCH /organizations/:id`                    | Owner/admin updates name                                                                                                 |
| `GET /organizations/:id/members`              | Scoped member list (maximum 100)                                                                                         |
| `GET /organizations/:id/settings`             | Scoped locale settings                                                                                                   |
| `PATCH /organizations/:id/settings`           | Owner/admin changes locale `en`/`fr`                                                                                     |
| `GET /organizations/:id/audit`                | Owner/admin sees latest 50 administrative events                                                                         |
| `POST /organizations/:id/invitations`         | Owner/admin invites a verified-email identity, role `admin`/`member`; `resend: true` retries pending invitation delivery |
| `GET /invitations/:id`                        | Intended verified recipient reads invitation                                                                             |
| `POST /invitations/:id/accept`                | Intended verified recipient accepts unexpired invitation                                                                 |
| `PATCH /organizations/:id/members/:memberId`  | Authorized change to `admin`/`member`; owner changes are refused                                                         |
| `DELETE /organizations/:id/members/:memberId` | Authorized removal; owner removal is refused                                                                             |

The invitation recipient can enroll locally, verify their own email, sign in and accept the invitation. Acceptance also requires the inviter to remain an owner or administrator. Reissuing an invitation cancels the previous pending invitation and creates a fresh grant from the current administrator. SMTP acceptance is not proof of delivery to an external inbox. Delivery failure leaves the invitation pending and returns an explicit failure response so an administrator can resend it. Raw `/api/auth/organization/*` mutations are blocked so administrative audit cannot be bypassed.

## Verification and remaining scope

Run `pnpm check`, `pnpm test:integration`, and `pnpm test:e2e`. A disposable full-stack check uses `docker compose --profile app up --build -d --wait` followed by `node scripts/compose-smoke.mjs`; the smoke creates a synthetic account and organization and verifies real SMTP delivery to Mailpit, email verification, login, settings and logout. Do not use this smoke with real customer data.

Production signup and initial account provisioning, owner transfer, organization/account deletion, MFA, pagination beyond bounded initial lists and external email-provider operations are not delivered. No deployed service or legal compliance is claimed. Read [ADR 0002](adr/0002-identity-and-tenant-isolation.md) for trust boundaries.
