# Bump native Vision chapter — v23

The opening painting remains the retained Three/WebGL DeveloperScene. Its two
native skinned meshes, 34 bones, articulated hand, camera, Theatre timeline,
background, particles and paper compositor are retained. The woman has bronze
skin, chestnut hair, a forest robe and enamel/copper headphones, with 3,095 local
profile/crown vertices refined. A third small skinned mesh adds the real
copper octagonal headphone frame, attached to the head bone.

The 27 alpha-textured architectural sketch meshes are disconnected. A physical
hub replaces them: three future agent cartridges dock onto one central chassis,
with upper/lower rings, actual bus rails, copper links and a supported crown.
Its solid mesh geometry and each assembly transform live inside the GLB. This is
not an SVG, screen-space drawing, photograph, or replacement for the separate
Anatomy content sculpture.

`node scripts/build-bump-vision-model.mjs` rebuilds the model from the retained
`src/bump/chapters/source/developer-1.glb`. The offline tool uses the installed
Three geometry generators and official local Draco/Basis decoders, plus Python
Pillow to encode the seam-registered 2K painted texture as JPEG 94 / 4:4:4. The
runtime does not load this authoring code or a second Three engine.

All assembly channels are part of the existing `Scene` clip (7.5 seconds).
`public/bump/scenes/vision-v2.json` explicitly sets
`asset-1.animations.Scene.loop=false`, so scroll seeks the same native clip in
both directions. No ambient clip, timer, frame loop, scrolling controller, or
per-frame layout work is added. The model remains static when scrolling stops;
manual scroll also gives reduced-motion visitors control of the poses.

DeveloperScene replaces only the first model URL. In portrait viewports it wraps
only that model in a responsive Three group; the original camera and background
remain unmodified. At 390×844 the model scale is 0.2865, making the woman, hand
and mechanism visible together. Desktop scale is unchanged.

`asset-manifest.json` supplies the parent integration mapping. Both new fallback
JPEGs are captures of the actual native Three scene, rendered directly before
HTML or the paper compositor. They are static fallback captures, not evidence of
live 3D in an environment without WebGL.

`model-report.json` inventories the model. `qa-report.json` records actual poses
at 20/50/100 percent and back, native desktop scroll seeking, exact reverse-pose
identity, frozen times while stationary, a 390×844 visual check, no horizontal
overflow and no console errors/warnings. QA used Chromium/SwiftShader; it makes
no claim about frame rate on user hardware. The three named agents remain a
future infrastructure concept and are not offered as available products.


## Vision research connections (2026-10-24)

The connection illustration adapts the public **Integration Beam** component
from affectUI:

- Reference: https://www.affectui.com/illustrations/integration-beam
- Registry source: https://www.affectui.com/r/integration-beam.json
- Retrieved: 2026-10-24

Its measured curved paths, pulse choreography, local flow toggles and responsive
layout are retained. Bump supplies its own logo, semantic icons, French text and
paper palette. The shared settled-arrival gate replaces the standalone observer
so the illustration does not animate during a chapter transition. Reduced motion
also responds to changes while the page is open. All connections are illustrative;
the three proprietary agents remain unavailable research directions.
