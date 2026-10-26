User update (2026-10-26): a PR with all fixes and SEO/GEO/AEO pages is now
explicitly authorized. Prepare it on fresh main, preserve Clarity, icons and
link previews, and do not merge automatically. Earlier PR gating below is
historical and superseded by this instruction.

# Handoff

The user approved an implementation of useful bilingual SEO pages and the
AI-readable public-text layer, first on the GPT Site. No GitHub PR is authorized
until the user validates the published Site.

The current implementation adds eight editorial pages in both languages and a
shared registry for all 18 canonical routes including the landing pages. HTML,
markdown, sitemap, llms.txt, llms-full.txt and ai.txt derive from this catalog.
Node and Worker share Accept negotiation, aliases, headers and real 404 behavior.
The Site uses its existing identity and public audience; the Worker is required
for content negotiation and host-aware metadata. Supplied Anatomy sources remain
unchanged. New navigation links lead from the existing Expertises dropdown.

For future GPT publication: run the normal build, npm test and the HTTP smoke
checks, then scripts/prepare-gpt-routing.mjs and tests/gpt-artifact-smoke.mjs
before the source helper packages the output. Native Sites serves matching
static files before the Worker; the GPT-only artifact routes generated text
through its embedded content. Normal Node/Cloudflare builds retain all files.
Verify live response types and canonical origins after publication.

After user validation: prepare a capability branch/PR against fresh merged main
in MarcSaad-Hadidi/Bump-Inc, limited to website/. Do not merge automatically.

Search Console, Bing Webmaster Tools, real lead tracking, named team bios,
case studies, actual contact delivery and the final production domain have not
been configured by this task. Do not claim those are complete or invent data.
