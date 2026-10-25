# Bump chapter scenes

These chapters retain the original reference scene components, Theatre camera
states, compressed geometry, skeletons and animation buffers. The reference Site
is not modified. `models.json` maps the retained GLB inputs to Bump outputs.

The five `textures/*-v2.png` files are generated painted UV edits. The browser
asset authoring entry `texture-authoring.mjs` restores the source alpha mask,
keeps untouched Workflow UV strips, resolves the texture orientation against the
original GPU sampler and bakes the Bump UI screens. The prepared textures are
kept as WebP in `textures/conditioned/` so ordinary builds do not need asset
generation. Large intermediate PNGs and decoded inspection atlases are ignored;
the original compressed GLBs and generated painted edits remain source inputs.

`node scripts/patch-bump-chapter-models.mjs` appends the prepared WebP textures and
new branding geometry to the original GLB buffers. The armillary has a raised
brass B fixed to its animated face; the hardware hub uses an extrusion traced
from the supplied Bump symbol. The laptop lids use that exact symbol in their
original UV regions. Meshes, bones and animation channels are not resampled.
`model-report.json` records source buffer hashes and replacement textures.

## Branding and software revision

`branding/texture-authoring.mjs` authors the exact logo placements, system diagram,
monitor dashboard and tablet header. It restores the original alpha and sampler
orientation. `branding/symbol-outline.json` is traced from the supplied transparent
symbol; `branding/geometry.mjs` builds the physical lettering and monitor panel.
Prepared WebPs are committed so ordinary builds need no generation step.

The new Bump software scene keeps the articulated painter and brush but uses a
deep petrol and antique-gold wardrobe and a Montreal-inspired Renaissance
workshop. The built-in image generator produced the new background and painted
wardrobe atlas; their editable PNG sources are `textures/software-atelier-v3.png`
and `textures/software-maker-v3.png`. The background brief was a warm Renaissance
atelier with arched windows, walnut shelves, brass instruments and distant Mount
Royal, leaving its center free of painted people and screens. The atlas edit kept
the existing UV layout, skin, hair and ivory cuffs while recoloring the wardrobe.

The four actual software animation clips share the original scroll progress
curve, with time looping disabled. A new textured quad is parented to the actual
computer and inset within its four inner bezel vertices. The former detached
screen image is removed from the loader. The generated room covers the viewport
through the camera movement and resizing.

Editorial examples share the original paper surface. Only actual interactive
interfaces retain their own borders. Mobile uses a single opaque paper surface
while the painting transition finishes, and a soft dark wash keeps the software
hero copy readable. V3 fallback JPGs are captures of the actual adapted scenes.

The actual runtime scene modules are retained in `runtime/`; the normal Bump UI
build copies them to the runtime asset directory. The different interactive
examples are authored in `Content.js`, sharing the accepted native project dialog.
Future agents remain explicitly described as a future direction, not an available
product. All interactions are local illustrations; there is no email submission.
