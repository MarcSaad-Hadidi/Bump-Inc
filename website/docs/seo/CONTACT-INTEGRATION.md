# Contact email consolidation — 2026-10-27

The latest PR34, including its deferred form mount, is incorporated into PR33. The public website keeps one Worker entrypoint
for HTML, Markdown discovery and `/api/contact`. The existing transparent form,
FR/EN presentation and main landing choreography are preserved.

## Verified

- `bumpconsultation.ca` is the active primary domain.
- `contact@bumpconsultation.ca` is the public address; Cloudflare Email Routing
  is ready and the configured destination is verified.
- The existing managed Turnstile widget is scoped to the primary domain.
- 222 tests pass. Contact coverage includes validation, payload size, origin,
  hostname/action verification, quotas, honeypot, provider failure, confirmed
  acceptance, duplicate-submit prevention, challenge reset and FR/EN fields. A navigation harness verifies no initial form mount, opening,
  retained closing state and reopening.
- Normal build and HTTP SEO smoke pass. The Docker runtime isolation test
  includes the public contact configuration imported by the SEO catalog.
- Browser QA confirms the accepted glass form, public email, stable expertise
  values and translated notices. No application console error was observed;
  extension metadata errors belong to the cloud browser extension.

## Production activation still pending

The existing production Worker had no `TURNSTILE_SECRET` binding at inspection.
Automatic approval review rejected writing the existing widget secret to that
Worker because explicit authorization for the production credential change was
missing. No secret was written, rotated, exposed or committed. Obtain that
specific authorization before binding it; keep this PR draft until the required
production setup is complete. The email and quota bindings are declared in
`wrangler.jsonc` for the normal deployment, not silently provisioned here.

Non-primary preview hosts show the verified direct-email link, disable submit
and do not load an invalid-domain challenge. They never claim a message was
sent. Automated tests mock verification and delivery; no actual test message
has been sent. After the authorized primary-domain deployment, an authorized
person must check a real submission and receipt before calling mail delivery
verified end to end. This consolidation does not merge into `main`.
