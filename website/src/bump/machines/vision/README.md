# VisionKineticSculpture

Copy these seven runtime files to `src/bump/machines/vision/`:

- VisionKineticSculpture.tsx
- VisionAssembly.tsx
- VisionTransformationController.ts
- geometry.ts
- geometry-source.mjs
- depth-keys.json
- vision.css

The normal entry is `import { VisionKineticSculpture } from './VisionKineticSculpture'`. It imports React, gsap, gsap/ScrollTrigger and @gsap/react normally; the retained React bridge belongs in the root build. `geometry.ts` imports the real vendored kit at `../../anatomy/kit/iso-kit`.

Replace only the old VisionDemo object/controls with this component. Keep the existing “Trois pistes pour l’avenir” and “Construire à partir du terrain” service cards, their details and future/non-available labels. The sculpture contains no assertion of a product release. It explicitly preserves the future ambition and current consultation offer. It creates no outside action.

## Props

`<VisionKineticSculpture />` reads the existing native window scroll through ScrollTrigger. It never pins, captures wheel input, uses Observer, writes the scroll position, or introduces a second scrolling container.

`scrollLinked={false}` gives manual controls only. `progress={0..1}` accepts an external progress source, initially selecting manual mode. `onProgress` observes live progress; callers should avoid putting its per-frame value into React state. `className` is optional.

The accessible native range can reach every intermediate pose; arrows/Home/End work natively. Three phase buttons, reset and return-to-scroll are supplied. Reduced motion selects manual mode, makes state choices immediate, and disables automatic follow. Phase text/ARIA updates only on phase changes; there is no per-frame live-region stream.

## Composition

63 physical components (four feet, inset foundation and fasteners, one central bearing/spindle/coupling, three supported satellite spindles). Each physical gear is subdivided into real tooth/body geometry for correct painter order: 115 SVG draw pieces, never 115 decorative parts. Ivory, brass and green each use Anatomy’s four facing tones. No WebGL, bitmap or scene-wide GSAP loop.

A / 0: independently phased heads stand on the plinth, separated and on unequal radial axes.
B / .55: axes and tooth phases approach compatibility while the shoes remain supported.
C / 1: the three 12-tooth gears engage one 16-tooth central coupling and turn at 16:12. The approach angle participates in the tooth phase calculation, preserving clearance before final seating. One pure pose function makes reversals retrace the exact same geometry.

Desktop uses a broad 72-unit-radius plinth, 43° azimuth and 31° elevation. Mobile is recomposed with a 61-unit-radius plinth, closer starting heads, shorter spindles, 20° azimuth and 45° elevation. The two SVGs share one controller, which only updates the visible composition.

## Lifecycle

One paused, labelled GSAP timeline is the progress source. Its positions are written through DOM refs; React does not render per frame. One-shot manual travel pauses outside the viewport and on document visibility changes. Scroll updates are ignored there. IntersectionObserver, matchMedia listeners, document listeners, the timeline, manual tween and ScrollTrigger are all removed on unmount.

All geometry is built once at module load. Tooth phases have 160 precomputed positions per tooth pitch; every point moves at most 0.224 SVG px between adjacent phase samples in either composition. Painter keys are generated from actual posed surfaces, using Anatomy’s overlap ray casting and orderKeys solver, and stored in depth-keys.json.

## Verification artifacts

`build-audit.mjs --full` checks the exact cylinders and tooth polygons at 41 poses per composition (82 posed assemblies), with the normal .25px overlap sampling. This is a dense sample of the pure reversible path, not an analytic proof of every continuous scroll value. The script records no surrogate shapes and has no allow/cover/crowd exclusions.

`audit-final.log` and per-pose `audit-*.json` contain the report. `fixture-*-a/b/c.html` use the same geometry and painter keys. `lines-*.png` are Anatomy line-end captures of all six resting views. `qa-browser-results.json` records native scroll forward/reverse, full manual range and reverse, intermediate poses, phase buttons, Home/arrows/End, reduced motion, offscreen/background pause, no horizontal overflow, clean console and unmount cleanup. The component leaves zero live ScrollTriggers or active animations; GSAP retains its own paused global refresh callback.

The isolated browser fixture uses the local React package for QA; root integration still needs the retained React 18 build bridge and final full-site scroll/layout check. It does not load the site's WebGL background.

The audit runner uses the sibling vendored kit automatically after integration. For a different checkout, set `BUMP_ANATOMY_KIT=/absolute/path/to/anatomy/kit`. Only the runtime seven files above are needed for production; keep `build-audit.mjs`, `render-source.mjs`, CONCEPT.md and README.md if retaining the local verification harness.
