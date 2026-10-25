# Integration Core — integration contract

Copy these source files together into `src/bump/machines/integration/`:

- `IntegrationCore.tsx`
- `IntegrationCoreScene.tsx`
- `geometry.ts`
- `model.ts`
- `order-keys.ts`
- `integration-core.css`

Use `import { IntegrationCore } from './machines/integration/IntegrationCore'` and render `<IntegrationCore playbackRate={1.5} />` after the two existing app demonstrations inside the existing IA paper chapter. The component is a compact companion and does not replace the Kanban, dashboard, phone, headings or current chapter layout. Its caption is “Vos outils. Un fonctionnement commun.”

## Runtime and dependencies

Normal imports of React, `gsap` and `@gsap/react`; React 18 compatible hooks and JSX, with no React 19-only API. The parent supplies its existing React bridge. The official MIT Anatomy kit must be available at `src/bump/anatomy/kit/`: imports use `../../anatomy/kit/iso-kit`, `../../anatomy/kit/react/draw` and `../../anatomy/kit/lathe.mjs`. Keep the upstream kit license with that vendored kit. No new package, observer plugin, scroll owner, WebGL canvas, fixed layer or global CSS theme is introduced.

The scoped `.bic` stylesheet uses the existing Bump beige, ivory, deep green, brass and ink direction, plus IM FELL English and EB Garamond. No font is downloaded by this component. Override the scoped `--bic-*` tokens at the insertion point if the parent requires an exact existing page token. The drawing has its own opaque material ramps; all four Anatomy facing shades are retained.

## Size and responsive behavior

Desktop art uses a 760 × 300 viewBox and occupies a measured 378px total figure height at 900px width. The mobile breakpoint is 640px. Mobile art is a separate 380 × 390, three-back / two-front docking layout, with a measured total height of 506px at a 390 × 844 viewport. Below 360px the playback row separates from five 44px state buttons; the 320 × 568 check measures 424px total height. The component limits itself to `calc(100svh - 120px)` on mobile and keeps native vertical scrolling. There is no surrounding card or new section.

## Mechanism

57 original solids; see `PARTS.md` for the concept, every functional part and its support. Five cartridges move twelve world units into three-piece open-bore adapter collars. The collars align sideways on fixed saddle pads. All five connect together, then six projected indicator needles and five finite bus signals coordinate simultaneously. The conductive pins end on their fixed ports, and none passes through an adapter jaw. No gallery geometry or another Bump mechanism is imported.

All SVG paths, both responsive layouts and 321 frames for each of six tiny indicators are built once at module load. Runtime GSAP writes transforms, opacity and the precomputed indicator paths. The moving painter keys come from Anatomy’s actual ray-cast overlap solver. A small numeric ordering function reorders SVG nodes only when their physical depth order changes; React does not rerender on animation frames. The static scene is memoized.

## Five finite states

| Data state | Meaning | Direct inspection pose |
|---|---|---:|
| `separate` | Independent tools with visible free plugs | 0s |
| `align` | Adapter frames align to the plugs | 2.6s |
| `connect` | All five conductive pins sit in their adapters | 4.2s |
| `sync` | Indicators and five exchanges operate together | 6.7s |
| `unified` | Stable common system | 8.5s |

The timeline is 8.5s at rate 1, about 5.7s at the default 1.5. It is finite. IntersectionObserver starts it on entry, pauses it outside the viewport, and starts a fresh run on reentry unless the reader explicitly paused or selected a state. The document visibility handler pauses background work and resumes an interrupted visible run. The last observer entry is used and every listener, observer and timeline is cleaned up through `useGSAP`.

Reduced motion displays the final static assembly immediately. Native buttons allow the reader to inspect any state directly, play deliberately, pause and replay. The five state buttons and playback controls work by keyboard, mouse and touch; focus is visible and the live region changes only with the five states.

## QA attributes

- `data-integration-stage`: one of the five state IDs above.
- `data-integration-playing`: `true` / `false`.
- `data-integration-layout`: `desktop` / `mobile`.
- `data-integration-reduced`: `true` / `false`.
- `data-bic-part`: the actual physical part ID, on each of 57 SVG groups.

## Isolated verification

`qa/build-fixture.mjs` builds a lightweight local React/GSAP fixture using aliases to the official kit and available dependencies. It does not touch the repository, shared files, build pipeline or publication. `qa/audit.mjs --audit` records exactly the slabs, turned pins and flanges that are drawn. Its ground is the four actual feet, rather than a blanket stand exemption. It checks 253 real cubic-eased insertion frames and 85 depth states per layout, with no collision/coverage/depth allowances. Both layouts end `audit passed` with zero failures; `qa/audit-final.txt` contains the complete report.

Browser verification uses the official Anatomy `drive.mjs`, `capture.mjs` and line-end checker with `/tmp/bump-chromium/chromium`. Desktop and mobile poses, controls, replay, reduced motion and lifecycle checks are recorded under `qa/`. The fixture uses a single SVG and no WebGL context. Final visual QA and browser result summaries are in `qa/RESULTS.md`.
