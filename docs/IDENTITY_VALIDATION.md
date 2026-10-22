# Identity validation evidence

Status: **DRAFT**. This PR depends on verified foundation PR #1 and does not merge or deploy it.

Local validation passed on Node 24.22.1 / pnpm 10.34.7: frozen install, `pnpm check` (lint, full strict typecheck, 63 unit tests, all workspace builds) and the dependency audit high/critical threshold. The existing moderate esbuild development-tool advisory remains assessed in [foundation validation](VALIDATION.md); no high or critical advisory was reported.

Real-service PostgreSQL/Redis integration, the Chromium diagnostic check, SMTP Compose smoke and secret scanning remain release gates. They will be recorded with the exact CI commit before the PR is marked ready. A configured test or policy is not evidence that it passed. Docker is unavailable on the local Windows host, so CI supplies the isolated real services.

Known operational limit: production public signup is disabled, and initial production account provisioning needs a separately approved operator procedure. No real email has been sent, no customer data imported and no production infrastructure deployed.
