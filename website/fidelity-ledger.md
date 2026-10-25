# Fidelity ledger

Reference: https://www.shopify.com/editions/winter2026.
Active implementation: localized original public client runtime and page snapshot.

| Surface | Implementation | Verification / difference |
| --- | --- | --- |
| Fonts, chapter copy and layout | Original CSS, components, font files and captured loader data | All 12 chapter opening title boxes, font sizes, line heights and colors matched the source at 1363×936 CSS pixels |
| Animated backgrounds | Original hero and chapter scene modules, models, textures, Theatre timelines and effects | WebGL 2 software rendering now tested with Chromium ANGLE SwiftShader; see design QA |
| Painting-to-content transition | Original shader and torn-edge behavior | Real WebGL screenshots, rather than fallback-only screenshots |
| Sidekick white app cards | Original five interactive cards and Rive overlays | Source controls inspected and captured; local WebGL interaction checks recorded separately |
| Sidekick skills | Original 20 skill controls and prompts | All 20 source states exercised; 18 active and two idle in captured focus states |
| Product demonstrations | Original Rive WebGL2 runtime and media bindings | Local WASM, image assets and three external font blobs localized |
| Secondary windows | Original key popup, local Three.js and assets; cached public beanie preview | Standalone WebGL popup and product modal smoke tests |
| Search | Original UI, local cross-edition public catalog | Backend adapter differs: title/handle matching and ranking; not source full-text equivalence |
| Edition picker and video dialogs | Original components and destinations | Source interactions captured; YouTube remains an external dependency |
| Responsive behavior | Original responsive CSS and portrait assets | Source mobile live comparison remains a separate validation gap |
| Images and preview video | Original media, compressed without resizing | Compression can produce small pixel differences; not byte-identical image/video delivery |
| Bootstrap | Client mount of original captured router/data | Avoids stale snapshot hydration; server route revalidation disabled |

A full public-reference archive contains 85 scroll screenshots, 26 interaction
screenshots and four evidence JSON files. The source cloud browser had no WebGL;
these source captures show its fallback rendering. Software WebGL tests exercise
the replica's actual original scene runtime. No claim of a pixel-perfect live
GPU-to-GPU comparison or physical-device performance is made.
