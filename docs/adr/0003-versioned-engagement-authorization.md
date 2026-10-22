# ADR 0003: versioned engagement authorization

Date: 2026-10-22. Status: implementation in progress for PR03.

## Decision

Keep mandates in PostgreSQL as a tenant-owned engagement, immutable revisions and immutable approvals. An engagement names a responsible operator; each revision captures objectives, declared assets, allowed actions, exclusions, validity dates and the authorization document. Changing any of these creates a new revision requiring fresh approval. An owner explicitly approves the exact revision. Owner/admin users may draft, amend and revoke mandates.

The first supported authorization document is bounded plaintext stored with its revision and a server-computed SHA-256 digest. A source reference is descriptive text and is never fetched. Approval is an authenticated human attestation; a digest establishes content identity, not the legal authority of its author or a verified digital signature. Binary documents and general evidence storage belong to the later evidence work.

## Decision boundary

The domain service checks the current tenant membership, the responsible operator, current revision, explicit approval and the approver's current authority. It validates the document digest and supported scope, uses server time, applies `validFrom <= now < validUntil`, and lets exclusions override inclusions. Missing, stale or unsupported state denies authorization.

Scope uses exact typed hostname, IP or GitHub repository targets and a fixed action vocabulary. No regular expressions, wildcards, CIDR ranges, arbitrary commands or model-selected tools are accepted. A hostname declaration does not establish the safety of its resolved address: a future network connector must also constrain DNS results, redirects, actual destinations and runtime behavior.

Authorization returns a decision about a specific revision, not a bearer credential or a durable execution permit. The API provides a real authorization preview; it launches no scanner or job. Future workers must call the same service again at execution and retry, reloading the originating actor and current mandate state.

## Consistency and database controls

Use the existing membership-bound tenant transaction helper, forced RLS and same-organization foreign keys. Lock the engagement while changing revisions, approving, revoking or evaluating it. Mutation requests name the revision they observed; a stale revision conflicts rather than silently replacing another administrator's work. Administrative events commit in the same transaction as the mutation.

Use a transaction advisory lock for engagement operations, followed by a plain scoped read. PostgreSQL applies UPDATE policies to `SELECT FOR SHARE/UPDATE`; such a row lock would hide a mandate from a responsible member or hide a revoked mandate. Keeping the narrow UPDATE policy protects irreversible revocation without denying legitimate reads. See [PostgreSQL 17 policy semantics](https://www.postgresql.org/docs/17/sql-createpolicy.html).

Runtime roles cannot update/delete immutable revisions or approvals. Revocation is irreversible in this slice; new authorization requires a new engagement. Histories retain old revisions and their approvals without making them current. Database owners remain trusted operators, as documented in ADR 0002.

## Acceptance

Required checks include direct SQL tenant denial, immutable history privileges, API role/operator checks, exact scope matching and exclusions, expiry boundaries, stale approvals, concurrent amendment/approval, revocation and rollback on audit failure. Record executed evidence in `ENGAGEMENT_VALIDATION.md`; configured tests are not proof of success.

Dynamic approval workflows, multiple simultaneous operators, binary uploads, network execution and queued work are outside this slice. The initial approval level is owner; no generic workflow language is introduced.
