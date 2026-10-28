# Bump character transition — 2026-10-26

The report concerns the native company painting (B2BScene), not the boat or
Company Flow illustration. The user reports severe stalls during its entrance.

## Findings and scope

- The actual company GLB has 20,804 positions, 25,044 triangles, 12 mesh
  primitives and nine materials. The native scroll clip retains 357 tracks and
  four skins. There is no evidence here of an exceptionally large character mesh.
- CompanyRoomFit previously searched the scene camera and backdrop mesh and
  recomputed its world bounds and four frustum rays on every frame, including
  inactive scenes and the fully covered paper state. Its new path uses the
  existing scene budget and caches the exact view/layout fit. Changes to the
  camera pose, projection, viewport, authored scale or backdrop position/size
  invalidate that cache. The accepted camera, room coverage and rigs remain.
- The company has its own custom painted-material shader variants. Previously
  their preparation was left to the first visible draw. One cancellable idle
  task now initializes unique textures and invokes compileAsync for the actual
  scene. There is no synchronous compile fallback in the animation callback.
  Normal drawing remains available if a context is lost or precompilation fails.

## Measured CPU result

A Node microbenchmark executed the original CompanyRoomFit callback from commit
69fb396 (VM with real Three.js classes and a stable plane/camera) and the new
fitter for 10,000 stable frames after 200 warmup frames:

| Backdrop fitting only | Time |
| --- | ---: |
| Previous callback | 59.55 ms |
| Cached fitter | 6.79 ms |

That is 8.77x less CPU time for this isolated operation. Its old cost is only
about 0.006 ms per frame in this fixture, so this result alone cannot explain
or prove resolution of the reported 2 FPS. The first-draw shader/texture stall
remains a GPU-side hypothesis addressed by the deferred resource preparation.

The regression test verifies one bounds computation for 1,001 stable frames,
refits on changing view/layout, exact restoration after a native layout write,
cancellable deferred uploads, one upload per shared texture, no synchronous
compilation, and failure handling. Existing real-rig tests prove deterministic,
reversible poses for all four native skins.

## Verification limits

The cloud browser reports WebGL disabled and displays the retained fallback.
Its screenshots validate composition and text, not native shader costs or GPU
FPS. A real WebGL-capable device must confirm the first and repeat entrances
from Vision to Bump, and reverse navigation; no FPS gain is claimed for that
unmeasured path. This report does not substitute fallback FPS for native data.
