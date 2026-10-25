# Atelier Bump — Figure Anatomy

Started 2026-10-24 05:10 UTC. Size: Figure, 80 purposeful solids plus fasteners and instrument markings. SVG, no WebGL.

The object is a precision transfer bench: one green project cassette travels on two guide rails while a three-tool gantry inspects it, sorts its components, plots a plan on its ivory insert, installs its protective frame, and calibrates the finished assembly.

The green perimeter, brass datum pin and ivory insert identify the same project throughout all five states. There are no five separate machines. The parked frame is a real part, held by a supply fixture at the far end of the bench until implantation.

## Five physical states

| Stage | Mechanical action | Continuity |
| --- | --- | --- |
| Audit | The measuring probe descends onto the cassette; the analogue gauge records the inspected range. | Cassette arrives at the left rail position, with its three working cartridges visible. |
| Analyse | Three cartridges separate along the cassette's guide strips; the feed wheel turns; the central datum remains fixed. | Same cassette moves one station right; its contents remain supported. |
| Proposition | The Y slide and the X carriage move the pen through the plan on the ivory insert. | Guide strips and planned assembly footprints occupy the same insert that carries the finished parts. |
| Implantation | The three cartridges seat; the parked frame lifts, travels above the work and lowers onto locating pins; hold-downs close. | Project perimeter and datum remain visible through the installed open frame. |
| Maintenance | A calibration key engages the finished cassette, makes one small adjustment, and both instruments settle. | Finished cassette stays complete; the process ends in a held, serviceable state. |

## Assemblies and supports

1–8. Four adjustable feet, each with a circular pad and a narrower stem.
9. Bevelled cast bedplate.
10–11. Two underside stiffening ribs.
12. Front precision ruler strip with rooted ticks.
13. Riveted engraved maker's plate.
14–15. Two continuous guide rails.
16–19. Four rail end stops, bolted to the bedplate.
20. Feed gearbox at the rail end.
21. Knurled feed wheel with a rooted index.
22–23. Gantry post mounting shoes.
24–25. Two gantry uprights.
26. X guide beam.
27–28. Two carriage end stops.
29. Travelling X carriage.
30–31. Two beam bushings.
32. Cross-slide arm / Y rail.
33. Y pen slide block.
34. Probe housing.
35. Probe cap / gland.
36. Single measurement rod.
37. Probe contact pad.
38. Plotting pen barrel.
39. Pen nib.
40. Assembly / adjustment driver housing.
41. Driver shaft.
42. Driver collar.
43–46. Four project pallet bearing blocks.
47. Green project cassette perimeter.
48. Ivory work insert.
49–50. Two cassette locating cleats.
51–53. Three cartridge guide strips.
54–55. Two moving hold-downs.
56–61. Three working cartridges, each with its own lid.
62. Gauge pedestal.
63. Gauge neck.
64. Bevelled gauge body.
65. Knurled gauge crown.
66. Maintenance support foot.
67. Maintenance upright.
68. Calibration collar.
69. Calibration arm.
70. Calibration handwheel.
71–73. Open protective frame: back bridge and two side panels.
74. Supply fixture tray.
75–76. Two supply tray supports.
77. Project brass datum pin.
78. Driver torque cap.
79. Thin technical plotting sheet, supported on the cartridge guides.
80. Maintenance adjustment key, connecting the service arm to the assembled frame.

Fasteners are recessed screw rings, centre dots and slotted heads on supported top faces. All scale marks are rooted on a strip or bezel; vents, insets and plan footprints are closed paths. Four-tone faces come from Anatomy `slabOf`, `cylinder` and `extrude`, not CSS perspective or gradients.

## Motion and depth contract

Every static path is generated once. GSAP animates a pure numerical pose; the component writes only group transforms, the gauge pointer in its affine face plane, and the plotting stroke length. Items carry real world centres and move with their own assembly. A stable per-frame depth sort appends nodes only when the order changes. The frame takes a lift–transfer–lower route before seating, and the reverse timeline performs the inverse route.

The component owns no wheel or touch interception. `onController` supplies the root gesture owner with `goTo`, `getStage`, `getBusy`, `finish` and `setActive`. Busy input returns `false`. Direct controls and keyboard use the same finite master timeline.

## Verification scope

The standalone fixture checks all five resting poses, transitions, reverse travel, keyboard, compact geometry, reduced motion, document visibility and offscreen suspension. Geometry metadata records the actual slab/cylinder shapes used, including each moving assembly. Anatomy audit/line results and any limitations are recorded in README after running them; no placeholder shapes or suppressed failures are acceptable.
