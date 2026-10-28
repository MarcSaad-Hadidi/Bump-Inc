# AEOTester report

Generated 2026-10-27 by the [AEOTester](https://aeotester.com/?utm_source=plugin&utm_medium=report) plugin, rubric v1.2.0.

| | |
|---|---|
| Live site | https://bump-renaissance-7562d3.plumtuna4.chatgpt.site |
| Audited | 18 page(s): every page found |

> Fetched live from https://bump-renaissance-7562d3.plumtuna4.chatgpt.site with the user agent "Mozilla/5.0 (compatible; AEOTester-Audit/0.2; +https://github.com/shapito27/aeotester-site-audit)".

## Summary

**Score: 121 / 127 (95%) - Ready for AI**

6 points do not apply to this site and are left out of the total (max 133).

| Category | Score |
|---|---:|
| AI crawler access | 18 / 18 |
| Crawlability and indexing | 18 / 18 |
| Structured data | 19 / 20 |
| Meta and social tags | 21.4 / 22 |
| Content structure and quality | 31.6 / 36 |
| Agent readiness | 13 / 13 (6 pts n/a) |

## Issues by points lost

### WARN Author Signals - 2.6 / 5 (-2.4)

`content.author` | assisted

Missing: expertise credentials, author bio/profile. Found: Author: "Bump" (schema)

- No expertise signals (credentials, job title, years of experience) near the author or in the page text - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en:28`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en/expertise:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:22` and 13 more
- No author bio section or link to an author/about page - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/integration-ia:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/developpement-logiciel:22` and 3 more
- Fewer than 3 trust signals; missing: /about, /contact, /privacy, /terms, <address> - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/integration-ia:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/developpement-logiciel:22` and 3 more
- Fewer than 3 trust signals; missing: /contact, /privacy, /terms, <address> - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en/expertise:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en/services/workflow-automation:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en/services/ai-integration:22`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en/services/custom-software-development:22` and 5 more
- Pages losing points: 18 of 18

Fix: Add credentials (certifications, degrees, years of experience) to establish expertise. Add an author bio section with background and qualifications

### WARN Content Freshness - 3 / 5 (-2)

`content.freshness` | assisted

Found modified date only

- Missing publish date (article:published_time or JSON-LD datePublished) - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/en/expertise:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:21` and 13 more
- Pages losing points: 18 of 18

Fix: Add the missing publish date as a meta tag (article:published_time) or in JSON-LD (datePublished).

## Advice (no points)

Worth knowing, but not scored: these can be deliberate choices.

### Content Signals

`ai-access.content-signals`

- robots.txt controls AI crawler access but declares no Content-Signal - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/robots.txt:13`

Suggestion: Add a line such as "Content-Signal: search=yes, ai-input=yes, ai-train=no" to robots.txt to state how AI may use your content (the yes/no values are your policy choice). See https://contentsignals.org/

## All checks

| Check | Status | Score | Fix |
|---|---|---:|---|
| AI Bot Crawlability | PASS | 12 / 12 | auto-fix |
| llms.txt Detection | PASS | 6 / 6 | auto-fix |
| Content Signals | ADVICE | not scored | auto-fix |
| Indexability | PASS | 8 / 8 | auto-fix |
| Sitemap Detection | PASS | 5 / 5 | auto-fix |
| SSL / HTTPS | PASS | 2 / 2 | assisted |
| HTTP Behavior | PASS | 3 / 3 | assisted |
| Structured Data | PASS | 14 / 15 | auto-fix |
| Schema Validation | PASS | 5 / 5 | auto-fix |
| Meta Title | PASS | 4.6 / 5 | auto-fix |
| Meta Description | PASS | 4.8 / 5 | auto-fix |
| Open Graph | PASS | 3 / 3 | auto-fix |
| Twitter Cards | PASS | 3 / 3 | auto-fix |
| Language Tags | PASS | 3 / 3 | auto-fix |
| Mobile Friendly | PASS | 3 / 3 | auto-fix |
| Semantic Headings | PASS | 8 / 8 | auto-fix |
| Content Quality | PASS | 5 / 5 | assisted |
| Content Freshness | WARN | 3 / 5 | assisted |
| Author Signals | WARN | 2.6 / 5 | assisted |
| Image Alt Text | PASS | 5 / 5 | assisted |
| Internal Linking | PASS | 4 / 4 | assisted |
| Accessibility | PASS | 4 / 4 | auto-fix |
| Server-Rendered Content | PASS | 6 / 6 | assisted |
| Markdown for Agents | PASS | 3 / 3 | assisted |
| Agent-Usable Controls | PASS | 4 / 4 | assisted |
| Agent Protocol Discovery | N/A | - | assisted |

## Notes

- Scores come from the live site as a crawler sees it: the HTML the server sends, before any JavaScript runs. Checks marked "inconclusive" could not be read (blocked, rate limited or timed out) and were not scored down.
- To fix issues, open the site's code in your coding agent (Claude Code, Codex) and run the AEOTester fix skill (`/aeotester:fix` in Claude Code) there. It shows a diff and asks before writing anything.

---

Check a live URL: https://aeotester.com/?utm_source=plugin&utm_medium=report
