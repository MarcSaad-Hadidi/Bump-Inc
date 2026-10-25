# Bump — Anatomy figures

Five original React/SVG mechanisms use the official Anatomy kit and GSAP. They share the retained site's React 18 runtime through `scripts/build-bump-ui.mjs`; no additional React root, WebGL scene, or page-scroll engine is introduced.

| Figure | Entry | Integration |
| --- | --- | --- |
| Workflow Machine | `workflow/WorkflowMachine.tsx` | Replaces the first workflow execution demo; cloud retained. |
| Method Workshop | `method/MethodWorkshopSection.tsx` | Five configurations at the same page position; native pencil painting retained. |
| Security Engine | `security/SecurityEngine.tsx` | Replaces the central orbit; four software security demonstrations retained. |
| Vision Sculpture | `vision/VisionKineticSculpture.tsx` | Native reversible scroll; future service cards retained. |
| Integration Core | `integration/IntegrationCore.tsx` | Compact band after the existing two software demos; phone retained. |

The latest interaction requirement supersedes the earlier standalone control examples: automatic demonstrations loop without transport buttons. Workflow pauses visibly, then the illustrated cursor clicks its real approval button. Security's cursor appears only for its correction action. Real interactions postpone automatic intervention for 30 seconds. Offscreen/background work suspends; reduced motion remains static and readable.

Method is operated by the existing assisted-scroll owner. Its GSAP Observer only reads gestures explicitly handed over by that owner; it never writes page position. Geometry transitions run at the shared ×1.5 clock rate. Vision follows native scroll and has no scroll capture.

`DeferredMachine.jsx` reserves space and imports figures near the viewport. CSS is concatenated into the existing `BumpUI.css`; the kit's enclosing plate padding/shadow is overridden for the continuous chapter paper.

## Provenance and checks

Official kit: <https://github.com/wheresryan22/anatomy>, commit `1482e8469b0a9e0d8cc18ea2740a01423d29ae80`. MIT license and kit source are in `../anatomy/`. Figure geometry, materials, mechanisms and copy are original to this implementation.

The standalone figure checks cover real solid geometry, line endings, sampled intermediate poses, responsive compositions, visibility cleanup and reduced motion. Sampling does not establish an analytic proof for every continuous pose. Integration checks additionally cover the retained React bridge, assisted-scroll handoff, full-page layout and automatic cursor actions.

The company remains a technology consultancy. Future AI systems are explicitly presented as future/non-available. All demonstrations use deterministic fictional data and perform no real CRM, AI or cybersecurity operation.
