# AEOTester report

Generated 2026-10-27 by the [AEOTester](https://aeotester.com/?utm_source=plugin&utm_medium=report) plugin, rubric v1.2.0.

| | |
|---|---|
| Live site | https://bump-renaissance-7562d3.plumtuna4.chatgpt.site |
| Audited | 7 page(s): a sample, one page per template, from 9 URLs found |

> Sampled 7 page(s), one per template (homepage, top-level pages, and a listing plus an item from each section), from 9 URLs found. Use --pages N to change the sample size or --all to audit every page.

> Fetched live from https://bump-renaissance-7562d3.plumtuna4.chatgpt.site with the user agent "Mozilla/5.0 (compatible; AEOTester-Audit/0.2; +https://github.com/shapito27/aeotester-site-audit)".

<details><summary>Pages in the sample</summary>

| Page | Stands in for |
|---|---|
| https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/ | homepage |
| https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus | section item /services/ |
| https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises | static page |
| https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/approche | static page |
| https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/a-propos | static page |
| https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/faq | static page |
| https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/integration-ia | section item /services/ |

</details>

## Summary

**Score: 114 / 127 (90%) - Ready for AI**

6 points do not apply to this site and are left out of the total (max 133).

| Category | Score |
|---|---:|
| AI crawler access | 18 / 18 |
| Crawlability and indexing | 18 / 18 |
| Structured data | 18.1 / 20 |
| Meta and social tags | 21.5 / 22 |
| Content structure and quality | 26.4 / 36 |
| Agent readiness | 12.4 / 13 (6 pts n/a) |

## Issues by points lost

### FAIL Author Signals - 0.1 / 5 (-4.9)

`content.author` | assisted

Missing: author attribution, expertise credentials, author bio/profile

- No author attribution (JSON-LD author, meta name="author" or byline) - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:1`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:1`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:1`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/approche:1`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/a-propos:1` and 2 more
- No expertise signals (credentials, job title, years of experience) near the author or in the page text - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/approche:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/a-propos:21` and 2 more
- No author bio section or link to an author/about page - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/approche:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/faq:21` and 1 more
- Fewer than 3 trust signals; missing: /about, /contact, /privacy, /terms, <address> - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/approche:21`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/faq:21` and 1 more
- Fewer than 3 trust signals; missing: /contact, /privacy, /terms, <address> - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/a-propos:21`
- Pages losing points: 7 of 7

Fix: Add author attribution: a JSON-LD Person as the Article author, or <meta name="author">. Add credentials (certifications, degrees, years of experience) to establish expertise

### WARN Content Freshness - 3 / 5 (-2)

`content.freshness` | assisted

Found modified date only

- Missing publish date (article:published_time or JSON-LD datePublished) - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:20`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/services/automatisation-processus:20`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/expertises:20`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/approche:20`, `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/a-propos:20` and 2 more
- Pages losing points: 7 of 7

Fix: Add the missing publish date as a meta tag (article:published_time) or in JSON-LD (datePublished).

### WARN Server-Rendered Content - 5.4 / 6 (-0.6)

`agent-readiness.server-rendered` | assisted, inconclusive, predicted from config

0 words in the server HTML - some content may depend on JavaScript

- HTML has almost no text and loads scripts: content may be rendered by JavaScript - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:21`
- No <h1> in the server HTML (if JavaScript adds one, agents never see it) - `https://bump-renaissance-7562d3.plumtuna4.chatgpt.site/:21`
- Pages losing points: 1 of 7

Fix: Serve the main content, <h1> and <title> in the HTML using SSR, static generation or prerendering; most AI crawlers and agents do not run JavaScript. Verify live with curl -s <url>.

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
| Structured Data | PASS | 13.1 / 15 | auto-fix |
| Schema Validation | PASS | 5 / 5 | auto-fix |
| Meta Title | PASS | 4.9 / 5 | auto-fix |
| Meta Description | PASS | 4.6 / 5 | auto-fix |
| Open Graph | PASS | 3 / 3 | auto-fix |
| Twitter Cards | PASS | 3 / 3 | auto-fix |
| Language Tags | PASS | 3 / 3 | auto-fix |
| Mobile Friendly | PASS | 3 / 3 | auto-fix |
| Semantic Headings | PASS | 6.9 / 8 | auto-fix |
| Content Quality | PASS | 4.4 / 5 | assisted |
| Content Freshness | WARN | 3 / 5 | assisted |
| Author Signals | FAIL | 0.1 / 5 | assisted |
| Image Alt Text | PASS | 5 / 5 | assisted |
| Internal Linking | PASS | 3.6 / 4 | assisted |
| Accessibility | PASS | 3.4 / 4 | auto-fix |
| Server-Rendered Content | WARN | 5.4 / 6 | assisted |
| Markdown for Agents | PASS | 3 / 3 | assisted |
| Agent-Usable Controls | PASS | 4 / 4 | assisted |
| Agent Protocol Discovery | N/A | - | assisted |

## Notes

- Scores come from the live site as a crawler sees it: the HTML the server sends, before any JavaScript runs. Checks marked "inconclusive" could not be read (blocked, rate limited or timed out) and were not scored down.
- To fix issues, open the site's code in your coding agent (Claude Code, Codex) and run the AEOTester fix skill (`/aeotester:fix` in Claude Code) there. It shows a diff and asks before writing anything.

---

Check a live URL: https://aeotester.com/?utm_source=plugin&utm_medium=report
