# Passive Loi 25 audit prototype

This branch adds the requested contracts, reviewed SQL migration, passive worker analyzers,
local API and French operator/client pages on the verified foundation documented in
`PR_ROADMAP.md`. It does not implement the roadmap's identity, tenant, mandate or publication
modules. Those prerequisites still block customer use and production exposure.

## Run locally

Use the pinned Node/pnpm versions, run `pnpm install --frozen-lockfile`, then
`pnpm dev` and open
<http://127.0.0.1:3000/loi-25>. The API and web must communicate over loopback. The existing
container profile binds the API to all container interfaces and intentionally cannot enable
these prototype routes.

No custom feature flag, DATABASE_URL, REDIS_URL or API_INTERNAL_URL is required in development.
The API defaults to port 3001, the web proxy to `http://127.0.0.1:3001`, and database/Redis
connections to the local example endpoints. Production still rejects missing secure
configuration; migrations still require an explicit DATABASE_URL.

In development, the API runs the existing passive scanner directly, without depending on
Redis or a separately running worker. PostgreSQL stores the report if its schema is ready.
To enable persistence, start the local services and run `pnpm db:migrate` before API startup.
Otherwise the memory fallback works immediately, including on a fresh database without migrations.
`pnpm dev` starts API, web and the optional queue worker together. API/worker use the installed
`tsx watch` mode, which excludes dependency directories and avoids restart storms caused by
OneDrive changes to `node_modules`.

Outside development, with PostgreSQL available, POST creates a PENDING audit and dispatches a `loi25` job on the
existing BullMQ probe queue. The worker loads the audit by ID, marks RUNNING, performs the
scan and atomically saves the report/findings as COMPLETED or FAILED. Only an audit ID and
job lifecycle metadata enter Redis; report evidence remains in PostgreSQL. Completed jobs
do not re-run. One scan per API process is accepted at a time. Job retries are disabled for
this prototype; a subsequent audit creates a new report.

If PostgreSQL or its audit tables are unavailable when the local audit service is first selected, a clearly
labelled in-process adapter runs the same worker scanner without Redis. It holds at most
100 reports, expires them after 24 hours and loses them on process restart. The storage
choice remains fixed until API restart. A failure after selecting PostgreSQL does not
silently move persisted data into memory. Restart the API to reselect storage after changing
database availability. PostgreSQL reads/edits do not require Redis; the queued non-development
path requires Redis and a running worker for new audits.

## Routes and review

- `POST /api/audits/loi25`: strict `{ companyName, domain }`; normalizes HTTPS/HTTP origins
  or bare domains, refuses credentials, paths, queries, custom ports, IP literals and local names.
- `GET /api/audits/:id`: returns the full report or 404.
- `PATCH /api/audits/:id/findings/:findingId`: accepts only `humanVerified`, integer
  `estimatedFixCad` (0–10,000,000) and nonempty `remediationPitchFr` (maximum 5,000 characters).
  The update is scoped to the given audit; false and zero are preserved.

All business API routes deny production, non-loopback bindings/clients, untrusted Host
headers and browser-origin requests. The Next.js same-origin proxy enforces loopback Host,
same-origin browser requests, a path allowlist, a 16 KiB body cap and an internal loopback API.
It does not forward cookies, Origin or authorization headers. There is no public sharing
endpoint. UUIDs are identifiers, not authorization. Keep the application internal until real
tenant membership and engagement checks replace this development restriction.

The console preserves the audit ID in its URL so reloads can restore a stored report.
Each finding has an explicit save action for verification, price and proposal text.
The client report includes only verified findings by default. `?preview=1` includes all
findings with an internal-preview warning. Proposal totals use only displayed, non-CONFORME
findings. The score remains an automated whole-scan index and is labelled accordingly.
Print starts the three report sections on separate pages; large finding lists can continue
across additional pages. Technical evidence expands on screen and prints when expanded.

## Scanner scope and interpretation

The scanner reads public DNS and performs GET requests only. It sends no consent cookies,
executes no JavaScript, submits no forms, follows no script URLs and performs no exploitation.
It uses certificate validation, DNS address pinning, public-address filtering on every
redirect, at most three redirects per request, a 1 MiB response limit, a 32 KiB header limit,
2.5 second socket timeouts and one 12 second collection deadline. It fetches HTTPS and HTTP
homepages, up to two same-origin privacy links and one contact link, deduplicated. Redirects
are revalidated and HTTPS downgrades are refused. DNS failures/timeouts remain unknown;
NXDOMAIN/no-data records are recorded as absent. An unavailable/non-HTML HTTPS homepage
produces FAILED with an explicitly non-interpretable score of zero, preserving DNS evidence.

HTML checks are deterministic, bounded static heuristics. Malformed markup, entity-encoded
text, client-rendered content and information on unvisited pages can be missed. A tracker
script does not prove execution before consent; a detected CMP does not prove blocking.
Initial tracking-cookie names are recorded without cookie values. A chatbot does not prove
exclusively automated decision-making. Provider names do not establish a transfer outside
Quebec or a hosting location. DKIM is explicitly untested without an operator-supplied
selector. SPF checks inspect the published termination, not recursive SPF authorization.
Security headers are technical signals, not individually mandated legal requirements.

Legal references use the [official Quebec private-sector privacy law](https://www.legisquebec.gouv.qc.ca/fr/document/lc/p-39.1).
Article 12.1 applies to decisions based exclusively on automated processing of personal
information, not all chat widgets. Findings use conditional language and require human review;
no score, badge, price or expert checkbox constitutes a compliance certification or legal opinion.

Scoring starts at 100 and subtracts 20/10/5 for CRITIQUE/ELEVE/MOYEN findings, with a floor
of zero. Unknown checks use MOYEN; favorable checks use CONFORME and zero price. Grades are
A ≥90, B ≥80, C ≥65, D ≥50, F <50. IDs are random; scoring for the same checks is deterministic.

## Validation

Run `pnpm check`, `pnpm test:integration`, `pnpm test:e2e` and `pnpm audit:dependencies`.
Integration/browser tests use only the dedicated `_test` database and Redis database 1.
Synthetic HTTP/DNS observations make queue tests reproducible; the API dispatch test uses
the actual API, Redis transport, worker scanner and PostgreSQL repository. Browser tests
verify persisted operator edits, verified-only reports, proposal totals and print rendering.
The generated PDF/screenshot under `.artifacts` contain synthetic data and are ignored by Git.

Local evidence recorded on 2026-10-23 with Node 24.22.1 and pnpm 10.34.7:

| Gate                    | Result                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`            | Lint, strict typecheck, 62 unit tests and all workspace builds pass                                                                  |
| `pnpm test:integration` | 8 tests pass against PostgreSQL 17 / Redis 7, including API → queue → scanner → database                                             |
| `pnpm test:e2e`         | 2 Chromium tests pass against compiled applications and the dedicated test database                                                  |
| Printable report        | Synthetic three-page PDF rendered with Poppler and visually reviewed                                                                 |
| Passive network smoke   | IANA example.com scan completed with 16 findings in approximately 0.2 seconds; this is a sample measurement, not a latency guarantee |
| Dependency audit        | High/critical threshold passes; the existing moderate esbuild tooling advisory remains assessed in `VALIDATION.md`                   |
| Source secret scan      | Gitleaks 8.24.3 reports no leaks in a snapshot of tracked and non-ignored source files                                               |

Development regression checks cover absent runtime variables, unreachable PostgreSQL,
missing audit tables, and Redis unavailable with working PostgreSQL. A real browser scan
completed with PostgreSQL and Redis stopped, returning HTTP 200 and a retrievable memory report.
A second proxy request persisted its completed report with Redis still stopped.
The initial local 503 was correlated with Node watch restarts after dependency-file updates;
the development scripts now use tsx watch's dependency-directory exclusions.

The API dispatch integration test caught and fixed a Redis command timeout applied to blocking
event delivery. Health/queue commands retain bounded timeouts; the independent blocking event
connection uses the driver's normal blocking behavior and the job wait has its own deadline.

This remains a local development prototype pending review of the new migration, tenant and
mandate authorization, evidence retention/access policies and controlled client publication.
No production deployment or public report publication is included.
