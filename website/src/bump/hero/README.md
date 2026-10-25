# Bump hero — character-only revision

Only the first page is in this revision's design-review scope. Other Bump
chapters retain revision 1; the accepted Shopify Site is a separate checkout.

## Real 3D assets

`public/bump/models/hero-characters-v2.glb` contains two textured articulated
characters: 170 bones and eight skinned meshes. It adapts the retained source
hero rig, substitutes fictional painted portraits, grades the wardrobe, removes
all commercial and added props. Only the two characters remain. The landscape
is a separate image plane, without painted people or accessories.

The original five-second Scene animation is retained for the scroll timeline;
BumpAmbient adds a twelve-second floating loop. The same scene uses the retained
camera, transitions, shaders and particles. The front leg is tucked away from
the central navigation by a bone offset applied to both rest pose and clip.

## Authoring inputs

- `approved-mockup.png`: initial visual target; latest user feedback removes
  its accessories (the mock is never the interactive scene).
- `source-rig.glb`: retained original articulated geometry and animation.
- `source-body-atlas.png`: exact source UV atlas to preserve painted folds.
- `heads-bump.png`: newly generated fictional portrait atlas.
- `model-authoring.mjs`: Three.js browser asset-authoring entry point, using the
  GLTF loader/exporter and the local source Draco/Basis decoders.
- `model-inspection.json`: exported structure, clip and character-only inventory.

The authoring entry expects `/source.glb`, `/edit/Hero_fg.png`,
`/edit/heads-bump-generated.png` and `/decoders/`; these map to the above inputs
and `public/runtime/decoders`. Its output is `window.__assetResult`, containing
the exported binary as base64. It is an offline authoring tool, not shipped JS.

## Runtime and fallback

`Bump3DStyle.js` adapts the painted materials while retaining source transition
shaders. `BumpHero.css` matches the compact central menu and approved header.
The hero's Theatre state is `public/bump/scenes/hero.json`.

Browsers with WebGL render the actual GLB. Browsers without it display a capture
of that rendered scene as a fallback, with the same live HTML controls. The
fallback is not evidence of 3D support; actual WebGL2 testing is recorded in the
hero QA report. Software rendering validates correctness, not hardware speed.

Wardrobe classification uses connected UV islands rather than assigning each
triangle independently, which prevents white shards across jacket folds.

The character-only revision also restores a black animated title phase before
starting the original camera timeline. Readiness gates use actual model loading,
so the source entry cannot run unseen behind loading. Landscape coverage follows
the camera frustum; resizing preserves the Theatre FOV. Header controls now use
a compact disclosure and inline search. The supplied symbol uses its original
PNG alpha mask and a reduced-motion-aware wave in the brand.
