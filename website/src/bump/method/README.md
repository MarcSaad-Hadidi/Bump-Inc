# Notre méthode — native painting (v21)

The original skinned consultant, articulated hand, pencil, monitor geometry and
camera remain. One synchronized body/hand/pencil performance starts every 3.8
seconds of visible time. The native clip plays at the shared rate (currently ×1.5)
and rests for the rest of that interval. The component owns only those three
native actions, using `asset.scene.userData.bumpAnimation` from the shared GLTF
loader; the canvas and camera remain controlled by the existing assisted scroll.
Offscreen/background time does not advance the gesture. Re-entering the painting
starts both demonstrations again from Audit and the first gesture; background-tab
pause resumes its current state. Reduced motion rests.

`MethodSurfaces.js` draws the same five project stages onto the actual monitor
and board meshes: Audit → Analyse → Proposition → Implantation → Maintenance.
The monitor is 800×512 physical pixels and the board 512×512, each drawn in the
same authored logical coordinates. Static type, rows and borders are cached once
per stage. Only progress bars and the monitor pointer repaint on updates, capped
at 10 Hz of wall time independent of playback rate. Linear texture filtering and
no mipmaps avoid rebuilding mip chains on every upload. IntersectionObserver
caches painting visibility; the render loop performs no DOM layout measurements.
Reduced motion paints one readable completed state.

Compared with the previous ×2 scene, the recurring texture pixel budget is one
quarter per upload and the cap drops from 25 to 10 uploads per surface per second:
26.9 MB/s of base RGBA pixels instead of 268.7 MB/s, before the removed mipmap work.
Static text calls stop after the five stage layers have been cached. Native mixer
evaluation also stops during each rest instead of updating the skeleton at every
frame. Portrait projection only recomputes when the effective FOV changes.

The consultant has warm olive/tan skin and chestnut hair, with aubergine velvet
and warm linen clothing. `appearance.js` grades the exact original KTX2 paint in
the shader; UVs, silhouette, skeleton and animation data stay intact.
`scripts/build-bump-method-model.mjs` emits `method-consultant-v21.glb` and gives
only the articulated hand a cloned paint material, so its matching skin grade
does not recolor the desk, board, pencil or other props. No atlas is regenerated.
