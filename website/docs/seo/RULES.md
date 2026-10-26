User update (2026-10-26): a PR with all fixes and SEO/GEO/AEO pages is now
explicitly authorized. Prepare it on fresh main, preserve Clarity, icons and
link previews, and do not merge automatically. Earlier PR gating below is
historical and superseded by this instruction.

# Editorial and discovery rules

- A page serves a distinct customer question or service intent. Check existing
  coverage first; avoid duplicate city pages and thin keyword permutations.
- Give a clear answer early, then explain scope, deliverables, tradeoffs and
  relevant examples. Write for the people evaluating an engagement.
- Use only supplied or independently verified business facts. Identify examples
  as illustrative; do not turn demonstration data into customer results.
- Preserve Bump’s beige palette, editorial typography, logo and landing journey.
- Store each language edition in the page catalog. HTML and markdown render from
  the same sections, tables and FAQs. Registering a page updates discovery too.
- Keep titles/descriptions specific, canonicals correct and hreflang reciprocal.
  Include only canonical public HTML pages in the XML sitemap.
- Structured data must describe visible facts. No invented ratings, prices,
  certifications or author credentials. FAQ markup makes no rich-result promise.
- Keep runtime assets crawlable so search systems can render the landing page.
  Private/authenticated/draft routes are never registered for markdown.
- Search crawler access and training crawler preferences are separate decisions.
  This release preserves existing training choices. ai.txt is informational and
  grants no additional rights to retained art, models, audio or third-party code.
- Measure search and business outcomes with real data after deployment. A fixed
  publishing quota, authority-score threshold or universal 90-day editing lock
  is not an editorial requirement here. Fix factual and technical errors promptly.
- No external directory submissions, backlink exchanges, profile changes or
  outreach are authorized by this implementation task.
- Review surface: existing GPT Site. GitHub PR only after the user validates it.

Primary references reviewed for this release:

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- https://developers.openai.com/api/docs/bots
- https://schema.org/Service
- https://llmstxt.org/
- https://www.rfc-editor.org/rfc/rfc9110.html#section-12.5.1

The user-supplied ScrollLaunch prompt guided the markdown interface. Its
third-party checker score is not a measure of ranking, citations or leads.
