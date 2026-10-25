# Bump icons, hover and globe

**Goal:** Finish the user's three latest corrections, publish them, then continue
the other chapters. Previously accepted hero changes stay intact.

**Design:** The search arrow and close button use matching 18px SVGs, centered
inside equal-height controls. Chapter links retain the reference's dotted trail,
with brighter 2.5px dots, an evident reveal and a gentle moving pattern.
Montréal opens a realistic 3D Earth with NASA surface imagery and a burgundy pin.
The camera moves toward the pin and zooms onto Montréal, shrinking the pin as it
approaches so the location remains clear, then shows
the city's coordinates. The final view covers about 42 km across the island;
a detailed, georeferenced Sentinel-2 2016 texture keeps this close view sharp. Replay, Escape, touch and keyboard remain available.

**Implementation:** Reuse the existing React runtime and Motion panel; build the
Three.js renderer as a separate lazy module. Use local NASA Blue Marble imagery.
A software ray-traced surface shares the same camera, atlas, pin mesh
and flight when WebGL is absent; do not replace the animation with an image.

- [x] Inspect the user's three screenshots and recover the exact new scope.
- [x] Replace font icons and correct their dimensions and alignment.
- [x] Override the original 1px dot trail with a readable animated trail.
- [x] Implement the globe, pin and camera approach independently of the hero.
- [x] Check desktop/mobile, WebGL/software rendering, replay and reduced motion.
- [x] Run required build and Sites checks (4/4 passed).
- [ ] Publish this correction first.
- [ ] Begin the remaining chapter adaptation after publication.
