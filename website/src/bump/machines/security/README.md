# Security Engine — Bump

## Concept (written before geometry)

**Size: Figure, 78 purposeful solids.** One compact inspection safe with six physically attached technical bays. A shield-shaped core mechanically correlates the bays; its face-mounted inspection instrument checks each channel. The exposed permission gate is reseated, its hatch closes and the linked identity gate engages. This is an explanatory, fictitious scenario, never an audit or an executable correction.

The six bays sit flush on one beveled chassis and meet its core through short, solid bus bridges. Applications has processors on a PCB; Infrastructure has server cartridges and a cooling instrument; Users has role keys and an identity lock; Networks has physical sockets and channels; Data & access has a real shallow compartment, a sliding hatch and a lock; External services has removable plugs in their docks. No assembly arms, workshop rails, orbiting UI cards, gradients or WebGL.

## Parts and purpose

The geometry manifest is the source of truth for the exact rendered count. This is the construction plan:

- Chassis: four isolating feet, one beveled base, six solid bus bridges, six seating plinths (17).
- Shield core: pedestal, shield shell, brass rim, ivory face, inspection socket, bezel, sensor lens, correlation dial (8; running total 25).
- Applications: PCB, two processor packages, four connector contacts (7; 32).
- Infrastructure: two server cartridges, two lids, cooling housing, impeller bearing, cooling cap (7; 39).
- Users: identity plate, two role keys, lock socket, gate, two gate supports (7; 46).
- Networks: three socket housings and three inset ports (6; 52).
- Data & access: compartment floor, two side walls, rear wall, sliding hatch, permission gate, locking bolt (7; 59).
- External services: two docks, two plug bodies, two contact tongues, retaining knob (7; 66).
- Six indicator bezels and their six indicator lenses (12; 78).

Each physical face receives the genuine Anatomy kit's four side tones, lighter top, crease and bevel. Screws, closed vents, seams, etched traces and rooted instrument ticks are attached details, not substitute solids.

## World, attachments and permitted movement

World coordinates use x/y on the chassis and z up. The chassis top is z=0; every bay begins there. The main core pedestal occupies x=-37…37, y=-34…38. The six bus bridges terminate at both their bay plinth and that pedestal. All six plinths and bridges also rest on the chassis. The data compartment uses separate floor/wall/hatch solids so the opening is genuine.

Moving mechanisms are limited to a short supported hatch stroke, a supported permission selector and identity gate, the face-mounted inspection needle, the external plug's captive contact tongue and the visible indicator/circuit state. Nothing swings across another module. The initial core insertion is a short vertical settling movement; the rest of the machine retains a coherent assembled silhouette throughout.

Desktop and mobile use different fitted cameras and composition. Mobile keeps native controls and module names outside the SVG at readable sizes.

## Integration contract

Copy these source files to `src/bump/machines/security/`. The final geometry import is `../../anatomy/kit/iso-kit`; vendor the official MIT Anatomy kit at `src/bump/anatomy/kit/`. `SecurityEngine` imports React normally, GSAP and `@gsap/react`. It accepts `playbackRate` (default **1.5**), `className`, and `onStageChange` (zero-based 0…8). The parent keeps its `id="security-system"` wrapper. No wheel/touch scroll interception is installed.

The component owns one finite timeline, observer/background pause, fresh-entry restart, pause/play/replay, direct phase navigation, module inspection, keyboard and reduced-motion manual navigation. The focusable root has `data-bump-local-keys="true"` so the existing global capture handler can yield arrow/space keys to this local scene. `data-security-engine-stage` is one-based 1…9 and `data-security-engine-playing` is `true`/`false` for QA.

## Nine explicit states

1. Initialisation: chassis/core/connectors settle into place.
2. Activation des domaines: six physical modules activate in sequence.
3. Analyse en cours: the inspection instrument moves and short signals travel through the six bus channels.
4. Résultats partiels: five verified indicators, Data & access remains orange.
5. Corrélation: Applications and Data & access channels activate together.
6. Détection: the permission gate shifts and a red fictitious anomaly appears: “Accès trop large sur un serveur”.
7. Recommandation: the hatch exposes the diagnostic area; four corrective actions appear in order.
8. Correction illustrative: the permission gate reseats, the hatch closes, the identity gate closes; orange becomes green.
9. Protection renforcée: the complete machine rests, with “Périmètre maîtrisé” and “Suivi continu activé”.

## Verification and limits

`qa/audit.mjs` builds from the actual geometry manifest and records the same solids into Anatomy `kit/audit.mjs`; it never substitutes stand-in shapes. `qa/fixture.mjs` builds an isolated light-theme page for full-resolution, mobile, reduced-motion and line-end checks. Both tools have been executed successfully; the results below record the final verification. Only the Bump light/beige palette is a requested shipping theme; no invented dark-theme asset is supplied.


## Final verification

Official Anatomy provenance: [`wheresryan22/anatomy`](https://github.com/wheresryan22/anatomy), commit `1482e8469b0a9e0d8cc18ea2740a01423d29ae80`. The source directly imports the genuine kit; `slabOf`, `extrude`, `cylinder`, `fitProjection`, `ringSeam`, `sideSeam`, `planOutline`, `radialTicks`, `topMatrix` and the kit SVG renderer generate the artwork. The official audit and line tools were used. No substitute geometry or ignored audit exceptions are supplied.

- **78 actual rendered solids in each camera.** All are recorded with the same plans, rings, radii, heights and motion vectors used for drawing.
- **409 distinct mechanism poses per camera**, sampled from the exact shared GSAP cue constants at 60 fps. The hatch moves by `[0,-9,0]`, the visible front permission selector by `[0,4,0]`, the supported identity gate by `[0,0,1.2]`, and the introductory core insertion by `[0,0,8]`.
- **Anatomy audit: zero failures** for desktop and mobile, including support, sunk pairs, exact-shape coverage, true painter order, translated clearances and intermediate motion poses. See `qa/audit.txt` and `qa/audit-run.log`; measured order is committed to `security-order.ts`.
- **Anatomy line ends: zero** in all nine resting states in both fitted cameras (`110` checked ends on `95` lines per pose). See `qa/nine-states.log` and `qa/mobile-lines.log`.
- **Four sizes checked:** 1440×900, 1280×720, 390×844 and 320×740. Every phase and all six selected-module panels fit above the controls; section, footer and legal text remain inside one viewport; no horizontal overflow. The mobile scene uses a different fitted camera, three-column/two-row module controls and compact phase-specific content, with no internal scroll area. See `qa/browser-check.json`.
- **Live controls checked:** pause freezes the inspection instrument; play, replay, native previous/next, root keyboard navigation, module inspection, visibility guard, offscreen pause, fresh-entry restart, correction launch and stable finite completion all pass. The full automatic run visits 1→2→3→4→5→6→7→8→9 and stops, at the shared 1.5× rate (`qa/full-journey.json`).
- **Reduced motion checked:** no automatic playback; native previous/next and all nine directly selected states remain readable.
- **Visual review:** final desktop, 390 and 320 PNGs were opened and inspected. Each of the seven core/module regions was also opened at 4× (`qa/detail-*-4x.png`), including the front permission selector exposed by the actual sliding hatch. The six bay attachments, closed vents, seam endpoints, corner fasteners, bevels, shallow compartment and face-mounted dial were reviewed.
- **Console clean:** no React key warnings, hook errors or GSAP exceptions in the final isolated fixture.

The fixture intentionally includes the retained `security-demos.css` and `.main-wrapper/.bsc-root` context. Scene flex rules are scoped with `.bse .bse-scene` so `.bsc-root svg { flex:none }` cannot collapse them. Native control font sizes are explicit and the base button reset uses `:where(button)` so it cannot override those sizes.

## Source copy list

Only these six files are needed in `src/bump/machines/security/`:

1. `SecurityEngine.tsx`
2. `geometry.ts`
3. `model.ts`
4. `security-order.ts`
5. `security-engine.css`
6. `README.md`

The `qa/` directory is reproducible verification tooling and intermediate evidence, not an application dependency. It uses the session's isolated GSAP installation and Chromium binary, and supports `BUMP_REPO`, `ANATOMY_KIT` and `CHROME_PATH` overrides where applicable.

## Explicit limits

This deliverable replaces only the central security overview. It does not edit the security painting, people/globe, the four security app demonstrations, the global navigation, or assisted scroll. It does not run an audit, call an API or change a computer configuration. No simulated cursor is necessary. No dark-theme version, WebGL layer or permanent loop is included. The browser fixture shares one React 19 runtime; the parent must retain its existing single-React-18 bridge when integrating into the live Bump runtime. Background visibility handling is covered by its visibility-change guard; the production browser handoff remains part of the parent's integration check.
