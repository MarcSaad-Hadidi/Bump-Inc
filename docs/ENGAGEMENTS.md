# Engagement and authorization API

This PR03 slice adds versioned mandates and authorization decisions on top of [identity](IDENTITY.md). It does not execute a scan or enqueue a job. Acceptance evidence is recorded separately in [engagement validation](ENGAGEMENT_VALIDATION.md).

Apply migration 0002 with the migration credential after installing/building the workspace. The API and worker continue using the non-owner runtime credential. Preserve existing volumes and data. Every route requires a verified session and current organization membership; mutation requests also need the configured `Origin`.

## Draft and approve

`POST /organizations/:organizationId/engagements` accepts a complete first revision:

```json
{
  "objective": "Review the declared laboratory configuration",
  "responsibleUserId": "<current organization member UUID>",
  "scope": {
    "assets": [{ "kind": "hostname", "value": "lab.example.invalid" }],
    "actions": ["configuration.read"],
    "exclusions": []
  },
  "authorizationText": "Synthetic authorization for this laboratory scope only.",
  "sourceReference": "Local synthetic exercise",
  "validFrom": "<ISO timestamp with offset>",
  "validUntil": "<later ISO timestamp with offset>"
}
```

The response includes the engagement `id`, `currentRevision` and `version.authorizationSha256`. The authenticated creator must be an owner/admin; the named responsible user must currently belong to this organization. The authorization text is stored with that immutable version. It is a supported plaintext document, not an uploaded PDF or a remotely downloaded reference.

An owner approves it with `POST /organizations/:organizationId/engagements/:id/approve` and `{ "expectedRevision": 1, "authorizationSha256": "<digest from the version>" }`. Approval confirms the exact document and revision. Merely creating a mandate grants no authority. Hashing does not verify a legal signature or the signer's right to authorize an asset.

## Evaluate and change

The responsible operator calls `POST /organizations/:organizationId/engagements/:id/authorize` with `{ "expectedRevision": 1, "target": { "kind": "hostname", "value": "lab.example.invalid" }, "action": "configuration.read" }`. The response states whether the current state permits the exact action, its revision and evaluation time. Denial reasons are stable codes. This is a preview, not a reusable token: future workers must evaluate again at execution and retry.

Owner/admin users amend with `POST /organizations/:organizationId/engagements/:id/versions`, passing `{ "expectedRevision": 1, "revision": { "...": "the complete replacement revision" } }`. This creates revision 2 and requires fresh owner approval. A stale mutation conflicts instead of overwriting newer work. Historical revisions and approvals remain readable to authorized members.

`GET /organizations/:organizationId/engagements` lists up to 100 mandates. `GET /organizations/:organizationId/engagements/:id` returns the head and latest 50 revisions/approvals. Older history is accessible individually through `GET /organizations/:organizationId/engagements/:id/versions/:revision`, which returns the immutable version and its approval or `null`.

Owner/admin users revoke with `POST /organizations/:organizationId/engagements/:id/revoke`, passing `{ "expectedRevision": 2, "reason": "Authorization withdrawn" }`. Revocation is irreversible; it denies subsequent decisions and prevents further changes. A new engagement is required for new authorization.

## Supported scope and limits

Targets are exact typed hostnames, IP addresses or GitHub `owner/repository` identifiers. The validator canonicalizes supported forms before comparison. It rejects wildcard, pattern and CIDR scope. Host/IP actions are `configuration.read` and `network.scan`; repository actions are `repository.read`, `code.scan`, `dependencies.scan` and `secrets.scan`. These are authorization codes, not implemented connectors or executable commands. Exclusions override allowed assets.

Validity includes the start timestamp and excludes the end timestamp. The actor must still be the responsible member, and the approving owner must still have the required role. An amended, unapproved, expired, revoked, unsupported or inconsistent mandate cannot authorize work. A hostname approval alone is insufficient for future network execution: destination resolution and redirects need their own enforcement in the connector.

The initial approval level is owner and there is one responsible operator per revision. Dynamic workflows, multi-operator delegation, binary evidence storage and active execution are outside this slice. Use synthetic data only until deployment hardening and the relevant operational controls are complete.

Run `pnpm check`, `pnpm test:integration`, `pnpm test:e2e` and the disposable Compose smoke. The smoke creates a real mandate through HTTP, checks draft denial, approves it, checks authorization and verifies denial after revocation. It performs no network scan.
