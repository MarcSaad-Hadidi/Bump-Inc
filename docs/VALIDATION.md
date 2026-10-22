# Foundation validation evidence

Status: **DRAFT** until real-service, browser and Compose CI checks pass. Recorded on 2026-10-22; no production-readiness claim.

| Gate                                         | Result                         | Evidence                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supported toolchain                          | Passed locally                 | Node 24.22.1, pnpm 10.34.7; Node archive checked against official SHA-256                                                                                                              |
| Frozen install                               | Passed locally                 | `pnpm install --frozen-lockfile`                                                                                                                                                       |
| Lint, strict typecheck, unit tests           | Passed locally: 33 unit tests  | `pnpm lint`, `pnpm typecheck`, `pnpm test`; regression checks cover malformed configuration, TLS parameters, safe logging, request validation, queue validation and readiness failures |
| Builds                                       | Passed in combined pnpm check  | Contracts, database, observability, API, worker and Next standalone builds                                                                                                             |
| Production package contents                  | Passed locally                 | `pnpm --filter @bump/api deploy --legacy --prod`; verified compiled entry point, compiled migrator and reviewed SQL are included                                                       |
| PostgreSQL migrations and worker integration | Pending CI                     | `pnpm test:integration` requires dedicated `_test` database and Redis database 1                                                                                                       |
| Browser diagnostics                          | Pending CI                     | `pnpm test:e2e` starts compiled apps on ports 3100/3101 with real dependencies                                                                                                         |
| Dependency audit                             | High/critical gate passed      | Zero high/critical; one moderate development-tool advisory assessed below                                                                                                              |
| Secret detection                             | Passed staged scan; CI pending | Gitleaks 8.30.1 staged scan: no leaks, 192 KB scanned with redaction                                                                                                                   |
| Full-stack startup                           | Pending CI                     | Local Docker unavailable; CI builds and starts all Compose services and runs HTTP assertions                                                                                           |

The host's default Node 25 is not used for these supported-toolchain checks. Windows sandbox restrictions initially blocked Next/pnpm symlink creation; approved execution outside the sandbox completed standalone packaging. Generated local tools, dependencies and runtime output are ignored by Git.

## Assessed dependency advisory

`pnpm audit --audit-level=high` passes. The complete audit reports one moderate advisory, [GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99), in esbuild 0.18.20 through `drizzle-kit -> @esbuild-kit/esm-loader -> @esbuild-kit/core-utils`. The vulnerable behavior is esbuild's development HTTP server; this project uses Drizzle Kit only to generate migrations and does not run that server. Drizzle Kit is a development dependency, excluded from the API/worker production packages. No advisory suppression or unverified major-version override is applied. Reassess when Drizzle Kit changes or if a development server is introduced.

## Remaining scope limits

Production deployment, customer data, external security scans, backup restoration, load targets, tenant isolation and legal compliance have not been validated. PR02 must implement identity/tenant access before domain endpoints are added. API throttling is per-process and must be replaced with shared enforcement before horizontal public deployment. Redis and PostgreSQL Compose credentials/network settings are for local development only.
