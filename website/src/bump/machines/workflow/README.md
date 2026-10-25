# Bump Automation System — Figure

Original object: a precision sluice instrument. One identifiable green request capsule travels through an open, supported channel, is physically diverted into preparation, waits against a brass human-approval blade, then joins the connected CRM outlet. Its moving parts explain circulation, preparation, authorization and transfer. This is a fictional local demonstration: no network requests or real decisions.

## Parts planned before geometry

- Chassis: four leveling feet, routed ivory bedplate, inset mounting seam, four fastening heads.
- Reception: recessed receiving floor, back and front guide cheeks, stamp pedestal, registering plunger, signal collar.
- Qualification: diverter floor, two cheek walls, valve spindle, translating guide tongue, brass actuator cap.
- Preparation: recessed chamber floor, two chamber cheeks, three supported instrument stems, three measuring heads, header collar.
- Approval: inspection floor, two channel cheeks, two fixed guide posts, upper yoke, moving brass blade, two guide shoes, warning lamp base and lens. The blade crosses the route until a visitor explicitly validates.
- Transmission: transfer floor, two guide cheeks, paired connector housings, locking collar, brass release slider.
- Result: receiving cassette floor, two cassette walls, end stop, completed record marker.
- Circulation: five supported channel runs, each with its floor and two guide walls; no decorative pipes or floating connectors.
- Subject: capsule body, attached brass identity band and ivory identity stud. The same three parts remain together throughout.

Target: 70–80 purposeful solids, true Anatomy four-tone extrusion, no gallery geometry. Layouts are separate world-space compositions: wide serpentine desktop; portrait zigzag mobile. All static geometry is precomputed once; live motion writes SVG transforms through refs.

## Runtime contract

Export `WorkflowMachine` from `WorkflowMachine.tsx`, copy this directory into `src/bump/machines/workflow`. Kit imports resolve to `../../anatomy/kit/iso-kit` after integration. Dependencies: React, `gsap`, `@gsap/react`; default `playbackRate=1.5`. Import the provided CSS through the component.

The root keeps `bump-workflow-execution` for the site's existing single assisted-scroll stop. It does not intercept wheel or add a spacer. Root exposes `data-workflow-machine-stage="0…5"`, `data-playing`, `data-waiting`. Exact controls: `Lancer`, `Pause`, `Rejouer`, `Valider la proposition`.

The finite GSAP timeline stops indefinitely at phase 04. Only the validation button opens the blade. Pause/resume/replay, offscreen suspension, keyboard/touch module inspection and reduced-motion still states share this controller.

## Final construction

76 solids in each layout, using the official Anatomy `slabOf`, `extrude`, `cylinder`, and `rodOut` helpers. Preparation probes use one full rod with a stationary gland clip, not stacked rod copies. The same band and identity stud remain attached to the moving request capsule. The approval blade physically spans the inlet; it lifts before the capsule advances and closes only after the request reaches the result cassette.

Both layouts use measured painter keys. `.bwm/audit-motion.mjs` casts the real shapes with official `A.overlapsOf` at the actual capsule and mechanism offsets, then solves `key(front) − key(back) ≥ gap + depthOffset(back) − depthOffset(front)` across the observed pairs. No false proxy shapes or decorative audit records are used. Runtime re-sorts only when the real world-depth order changes.

Mobile uses a separate world-space zigzag and a flex viewport envelope of `100svh − 114px`, leaving the site's header clearance. It keeps narration, playback and the human approval button visible; module inspection is a small local overlay. No wheel listener, scroll pin, scroll spacer or second navigation manager is added.

## Verification

The `.bwm` directory contains the isolated React 18 fixture, build scripts, official Anatomy audit/line-check reports and screenshots; these helpers never edited or built the application repository. Run `build-fixture.mjs`, `audit.mjs`, `audit-motion.mjs`, `build-react.mjs`, and `qa.mjs` from that directory in the current environment. Fixture aliases use the actual installed Anatomy sources and parent runtime dependencies.

Final evidence: 76 solids per layout; both official rest audits passed with zero failures; 210 clearance samples, 210 depth poses and 16 support poses passed with zero problems. Official line-end checks returned zero in ready, waiting, opening, completed and mobile views.

Checks include actual start/pause/resume, offscreen suspension, an indefinitely closed approval gate, explicit approval, completion/replay, 390×844 and 320×740 viewport fit, keyboard module inspection, reduced-motion states, line ends and console errors. The motion audit samples the capsule path and mechanism extremes; it is not a claim of a symbolic continuous collision proof. Shipping theme is Bump's light paper palette; a separate dark artwork was not requested.
