User update (2026-10-26): a PR with all fixes and SEO/GEO/AEO pages is now
explicitly authorized. Prepare it on fresh main, preserve Clarity, icons and
link previews, and do not merge automatically. Earlier PR gating below is
historical and superseded by this instruction.

# SEO release verification

## Content and routing

- 18 canonical routes: two retained landing editions and eight new editorial
  pages in French and English. Their HTML, metadata and markdown share a catalog.
- Each editorial page has a unique title and description, a canonical, reciprocal
  FR/EN alternatives, a markdown alternate, visible main content and related links.
- Organization, WebSite, WebPage, Service, BreadcrumbList and FAQPage data are
  used according to page type. No prices, ratings, certifications or named
  customer outcomes are fabricated. Future agents remain explicitly future.
- HTML and markdown agree on paragraphs, tables and FAQ answers. Markdown is
  served by suffix, negotiation or `/api/md/`, with token count, canonical,
  Content-Location, CORS and noindex headers. Missing/private renderers return 404.
- Missing HTML routes return real 404 responses; static runtime assets are not
  passed through a marketing-page fallback or markdown negotiation.
- Wildcard/missing Accept and equal preferences keep HTML. Negotiated HTML and
  markdown both use Vary: Accept; HEAD and OPTIONS behavior is tested.
- Sitemap contains only canonical HTML URLs. Discovery files are generated and
  exclude runtime pages. Training crawler choices remain unchanged.

## Commands

Publication is gated on these commands, rerun in the source packaging workflow:

```sh
npm run build
npm test
node tests/seo-smoke.mjs
# GPT Sites artifact only, after the ordinary checks:
node scripts/prepare-gpt-routing.mjs
node tests/gpt-artifact-smoke.mjs
```

The website suite contains 158 tests, including renderer coverage, reciprocal
metadata, structured-data facts, HTML/markdown parity, q-value handling, native
Node HTTP responses, the bundled Worker and the retained model/scroll tests.
The source supplied for all Anatomy figures was also compared byte-for-byte
against merged main; no supplied file changed.

Actual curl smoke responses from the real Node server:

| Request | Status | Type / key behavior |
| --- | --- | --- |
| `/services/integration-ia.md` | 200 | text/markdown; noindex; canonical Content-Location |
| `/services/integration-ia`, Accept markdown preferred | 200 | text/markdown; Vary: Accept |
| `/services/integration-ia`, no preference | 200 | text/html; Vary: Accept |
| `/`, Accept */* | 200 | text/html |
| `/does-not-exist.md` | 404 | text/markdown; noindex |
| `/api/md/admin` | 404 | No private content |
| `/api/md/_catalog` | 200 | 18 public routes |

llms-full was approximately 89 kB with request-origin URLs in that smoke run.
The smoke script prints the actual current size and headers; it asserts no
external ranking or AI-citation results.

## Browser checks

- Desktop: Expertises and service composition, typography, table navigation,
  FAQ filtering and expansion, bilingual links, and the existing project dialog.
- The retained runtime originally replaced home metadata during hydration. The
  lightweight metadata synchronizer now restores the same generated records;
  the actual loaded browser showed the correct title, canonical, five language
  alternatives and one JSON-LD graph. Menu links reach the new editorial pages.
- Narrow layout checks used real browser iframes at 320, 390 and 768 pixels.
  The workflow at the narrowest width had a 305px content viewport and 305px
  scroll width. Other checked service/about/method/FAQ layouts had no horizontal
  overflow at the 390px fixture size. An English AI page was also inspected.
- The no-script edition was tested in a sandboxed iframe. Its six chapter
  introductions and editorial links remain readable; its own fallback removes
  the otherwise persistent black opening veil only when scripts are disabled.
- New-page content does not depend on animation. CSS respects reduced motion.
  No autoplay, additional scroll engine, media sequence or new UI dependency
  was introduced on the editorial pages.

These checks do not constitute physical iPhone/Brave sensor or native WebGL QA.
The accepted 3D geometry, camera, global scroll and animation sources were not
changed by this feature. Browser-extension metadata errors were observed in the
cloud browser; they originate from its extension, not the new page scripts.

## Deliberately not done

- No GitHub PR before the user validates the GPT Site. No automatic merge.
- No Search Console/Bing verification, analytics, lead backend, paid placements,
  invented search volumes or rankings. These require real owner data or setup.
- No MCP discovery file: the site runs no MCP server. No ScrollLaunch badges or
  third-party promotional links were added to the public pages.
- New pages do not imply currently available proprietary AI products.

## Native GPT Sites routing correction

The initial live check exposed native static-file precedence: a matching HTML
file was served before the Worker, leaving origin markers and forcing trailing
slashes. The GPT packaging step now removes only generated content paths from
its client artifact. Those exact texts are embedded in the small Worker bundle,
which handles them without requiring an ASSETS binding. Normal Node/Cloudflare
build output keeps the complete client tree. Additional tests cover every route
with no binding and ensure packaging retains media. The final live check must
verify HTML and markdown types, origin resolution and a real unknown-route 404.

## Native landing startup correction

The user reported the retained 500 screen on iPhone. The WebGL compositor's
actual texture resolver reproduced `TypeError: Invalid URL` with the portable
root-relative background asset list. It now resolves that URL against the
current page, before the English build copies it. Both shipped FR/EN resolvers
pass with the real portable data and with absolute/query-bearing URLs; the
selected texture exists in the artifact. All 160 tests and the Node HTTP smoke
pass. Legacy Editions retry URLs redirect to the corresponding Bump homepage.
No geometry, cameras, animation or scroll code was changed. Narrow and desktop
browser checks cover the opening, both languages and editorial navigation;
this cloud browser's WebGL-disabled fallback cannot prove physical iPhone 3D.

## Viewport and folder-scroll follow-up

Reviewed the six chapters through the existing assisted stops at 1366x650 and
390x844. At 1877x861, all six imported model hosts fit their controls, figure
and caption inside the available height; the 1920x1080 software pair fits as
one composition. Short desktop windows use separate software stops; content
that still needs reading continues through the same assisted controller. The
correction demo was rechecked with its annotation ending at y604 in a 650px
viewport. Painting typography respects the actual arrival offset/header space.
The search panel now uses a 9% clear tint with blur, with scene/paper ink.
The folder wheel gate re-arms sooner after a genuinely new gesture, while
in-flight input and continuous momentum remain blocked. A regression test
covers forward/backward progression and momentum rejection. All 162 tests and
the HTTP smoke pass. Supplied geometry and native animation sources are intact.
These are browser layout/simulated-input checks, not physical-device or native
WebGL performance measurements.

## PR validation on current main — 2026-10-26

- Reconciled with main ca917a17466807fca97cb99e542cf96be41eb931. Preserved Clarity opt-in, menu-based preferences, CSP, Bump icons and character link previews.
- `npm run build`: passed. `npm test`: 181 passed, zero failures/skips.
- `node tests/seo-smoke.mjs`: passed for HTML, Accept Markdown, discovery, canonical origin and private-path rejection.
- `npm audit --audit-level=high`: zero vulnerabilities.
- GPT-only routing and compiled Worker smoke passed, including exact public FR/EN shared-module bytes without ASSETS, HEAD, 405 and unknown-module 404. This addresses the missing hashed chunks found in the earlier Site deployment.
- Prior all-chapter viewport and folder gesture measurements above remain applicable; models and global scene geometry are unchanged. The merged landing and editorial links were rechecked in the browser.
- Docker is unavailable in this executor. The existing GitHub public-site job builds and runs the container; CI, secret scanning and platform service-backed checks must finish before merge. No automatic merge.

## PR review corrections — 2026-10-26

- CodeQL alerts 8/9/10 shared one development-only boundary: mutable option text flowed to iframe.src during initial load, selection changes and JS-mode reloads. No remote input populating those options was established.
- Navigation now selects only frozen authored route literals by a validated numeric index. Unknown selections use the homepage; option text is never interpreted as a URL.
- The focused regression failed before the patch and passed after it for javascript/data/external/protocol-relative/backslash/control-character/markup values. All 11 pages, both sandbox toggles and assisted keys remain functional.
- A read-only independent investigation and candidate review found no surviving concrete bypass or regression. No application scene or production security control was weakened.
- Restored /__mobile-review alongside /__seo-review. Real HTTP tests cover GET/HEAD in development, no-store headers, production 404 and rejected writes for both tools. These fixtures are not published.
- Full npm test: 184 passed, zero failures/skips. HTTP smoke passed. New GitHub checks and CodeQL run on the corrective commit before completion.

## Introductory copy, explanatory UI and company preparation — 2026-10-26

- The user clarified that SEO figures must be beautiful explanatory UI/diagrams, not unrelated generated photos. All 16 editorial pages now use semantic HTML stage cards, drawn connectors, sources and localized explanations. Workflow/AI explicitly show human approval. No generated photo is referenced by the build.
- Rewrote all six painting subtitles in FR/EN; removed authored line breaks, neutralized inherited drop-cap/spacing styles, and aligned their actual arrival windows without changing native chapter heights.
- Browser layout measurements for all six introductions: at 1366x650, lower edges 620–622px; at 1877x861, 831–833px; at 390x844, all lower edges 766px. Six English mobile introductions measured the same 766px lower edge. No br elements remain.
- Diagram checks at 390px and 320px showed no overflowing diagram descendants, including AI approval and the security sources. The SEO page uses normal document scrolling and does not clip taller diagrams.
- Company rendering preserves rigs and animation curves, gates hidden backdrop work, caches stable fitting, and defers texture/program preparation. Seven focused company tests passed, including all four actual skins. See docs/performance/company-transition.md for the measured CPU comparison and explicit native WebGL limitation.
- Latest complete npm test: 187 passed, zero failures/skips; HTTP smoke and npm audit passed (zero vulnerabilities). Final-head GitHub and Codex validation follows before completion.

## Direct expertise menus and animated diagrams — 2026-10-26

- The SEO header uses a native details/summary dropdown with all four canonical
  service links and the expertise overview. It works without JavaScript. The
  landing's existing motion panel exposes those same direct links first and
  retains all six chapter jumps, FAQ and existing analytics preferences.
- Shared FR/EN navigation entries are checked against the canonical catalog for
  every editorial page. At 320px the panel is inside x12–293, with all five links
  visible and no internal horizontal overflow; English was also checked.
- Existing semantic diagram copy remains visible. Sources/connectors and three
  stages animate in a 12s loop with soft color transitions. Hover or focus holds
  the same stage; leaving resumes its remaining time. Hidden documents and
  offscreen diagrams stop the timer. Re-entry replays from the sources. Reduced
  motion presents the completed, legible diagram without a running timer.
- Browser: confirmed real phase changes (recommendation → human validation →
  three completed nodes), focus/hover pause and resume, dropdown Escape and a
  direct landing-to-service navigation. No images/video simulate the diagram.
- Three additional regression tests cover ordered replay, suspension/resume,
  reduced motion and all localized header targets. Full suite: 190 passed.

## Shared glass navigation and redesigned project form — 2026-10-26

- The search, landing expertise dropdown, its open trigger, editorial expertise
  dropdown and project form use the same source-controlled glass recipe:
  rgba(255,255,255,.09), blur(12px), saturation 150%, a fine translucent border
  and a soft inner highlight. A solid fallback covers browsers without blur.
- The form now has an editorial introduction beside the fields on desktop,
  with aligned name/email and company/expertise rows and a full-width message.
  Mobile stacks the existing fields. No endpoint, email or CRM was added.
- Native required/email validation, select options, draft values, successful
  preparation feedback, modal focus, Escape and animated close are preserved.
  The close icon is drawn SVG. Scene ink is ivory; paper ink is dark.
- Browser checked: scene/menu alpha and blur, dark ink on paper, empty-form
  validation, valid demonstration submission and focus returning to its opener.
  English copy is translated. At 1366×650 the 960×549 form stays inside the
  viewport. At 320px its inner panel is x12–308 with zero horizontal overflow;
  390px was also checked. Tall mobile forms scroll internally and the submit
  action remains reachable within the viewport. These are responsive Chrome
  checks; no physical Safari test is claimed.

## Header project button — 2026-10-26

The landing's project CTA now uses the existing 9% translucent glass and 12px
blur. Its pill radius, dimensions, responsive label and native form-opening
behavior remain. Browser checks confirmed the actual computed alpha/filter,
ivory scene ink, a 30px desktop radius and the English mobile action fully
inside a 390px viewport. Both desktop FR and mobile EN open the project dialog.
The existing 190 tests and HTTP smoke pass; no geometry or scroll code changed.
