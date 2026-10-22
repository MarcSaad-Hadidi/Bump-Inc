# Bump OS engineering rules

- Read `docs/ARCHITECTURE.md` and `docs/PR_ROADMAP.md` before changing module boundaries.
- One major capability per branch/PR. Document dependencies; stack on a verified common base when required. Never auto-merge or weaken branch protection.
- Foundation must pass its service-backed checks before dependent features begin.
- Keep a modular monolith with separate worker processes. Add packages only when they have a real caller.
- TypeScript strict; validate untrusted inputs using Zod. Never execute user/AI supplied shell commands.
- No real customer data, secrets, audit reports, or confidential assets in this public repository or test fixtures.
- Business endpoints and job execution require tenant membership and engagement authorization when introduced. PR01 exposes only operational health checks.
- PostgreSQL is authoritative; Redis is transport. Migrations are reviewed SQL; do not edit migrations already applied to shared environments.
- Logs must exclude credentials, headers, request bodies, raw URLs and raw downstream errors. Preserve safe correlation IDs.
- Run `pnpm check`, `pnpm test:integration`, `pnpm test:e2e`, dependency audit, and secret scanning as relevant. Record actual results and unavailable checks separately.
- Coordinate file ownership when delegating. Do not let agents edit the same files concurrently.
- No production deployment without explicit infrastructure authorization. An unchecked requirement keeps a PR DRAFT.
