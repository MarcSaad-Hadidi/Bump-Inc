# IA & Logiciels — Bump

The Bump atelier retains the depth meshes and camera path. Its room texture,
`assets/atelier-room-v17.png`, replaces the brown library with petrol-green
cabinetry, brass instruments, ivory plans, ochre plaster and walnut. The separate
background through the frame is also original (`assets/atelier-background-v17.png`
and the prepared `software-atelier-background-v17.webp`). Both were authored
with built-in Imagegen; the atlas brief preserved the woman's pose, silhouettes,
UV island registration and upside-down source orientation while changing only
the room. The background brief specified an unoccupied Renaissance engineering
atelier in the same palette, a tall leaded window, open central perspective,
painted opaque edges and no people, UI, lettering or floating objects. These
textures remain attached to the existing real scene; the camera and book are
not baked into a screenshot. AgenticScene fits the background to the native
camera frustum, including portrait viewports.

The book is an original
bound Bump model, built by `node scripts/build-bump-book.mjs`: leather covers,
a rounded spine, brass rules, paper blocks, fine page edges and six attached
skinned leaves with 19 bones each. The chapter's reversible scroll timeline
controls its single Scene animation. Secondary flying artifacts remain hidden.
V17 puts the cover lettering on its outer face and gives each leaf independent
front/back print coordinates. PNG UV orientation and reverse-face mirroring are
corrected in the mesh, so the book stays readable through its scroll animation.

The hand retains the articulated Rive rig and tap events. Its appearance is
unique: bronze skin and a midnight-blue embroidered sleeve, with matching thumb
textures and the original alpha boundaries. Commerce artboards are hidden.
SoftwareHand.jsx renders an original request/analysis/human-approval/CRM UI inside
the physical screen. Native tap events press its controls and advance the UI.
A synchronized foreground canvas preserves the bronze thumb over the new screen.
Only the lower sleeve dissolves into the chapter paper; the physical phone and
finger animation retain their sharp silhouettes and original registration.
Nothing is sent or charged: this is an illustrative software interface.
The story counter starts only after its stage reaches the sticky top. Entry
padding is excluded, and reverse scrolling returns to the first stage.

The hand story is inside the continuous paper surface. Every scene uses the
accepted Workflow torn-paper effect and retains paper until the original native
transition to the next scene. Notre méthode is restored after Cybersécurité,
using the former software painter/pencil model and its scroll-controlled rig.

The immutable reference checkout is never edited.

V19 advances only the IA overlay's desktop/mobile paper keyframes, keeping the
camera, hand, book and assisted scroll intact. The first editorial heading now
enters on paper. Both software demonstrations use the shared idle replay policy:
12 seconds of completed-state reading time, extended to 30 seconds after actual
interaction. Editing or dragging prevents reset; manual Pause remains paused.
The existing shared turn queue also governs automatic restarts, so Kanban and
dashboard do not run simultaneously when both are visible. Reduced motion never
automatically replays.
