# Bump — independent animated Site

Project: appgprj_6adadb287830819199cb330f1ff787c2

The accepted Shopify Site remains separate and unchanged. The accepted Bump
hero, its two animated characters and opening sequence are preserved.

## IA correction — 2026-10-23

- Original Bump bronze hand and midnight-blue embroidered sleeve replace all
  displayed stock hand/thumb textures while preserving the articulated rig.
- Commerce artboards are hidden. The phone displays an original Bump request,
  AI preparation, human approval and CRM coordination example. Native finger-tap
  events press controls placed at the measured contact locations. A synchronized
  foreground canvas preserves the thumb over the new screen.
- A new bound 3D book has leather covers, a spine, page blocks, edge lines and
  six attached skinned leaves. Its Scene clip follows the chapter scroll and
  returns to the same bone pose on reverse scrolling; it does not play on a loop.
- The IA hero uses Workflow's separated title/introduction layout. The hand
  caption has dedicated paper space below the image. The shared paper CTA is
  neutral ivory and ink.
- Entry padding is excluded from story progress: desktop and touch-mobile
  checks retain 01 before/at the pin, advance through later stages, and return
  to 01 on reverse. At 390×844 the header stays visible, the phone fits its
  allotted screen area, the caption is separate and there is no horizontal
  overflow. Desktop was checked at 1440×1000 with software WebGL.
- Book and story browser checks report no runtime errors. Phone checks confirm
  the request/review/complete cycle and both controls inside the screen. Physical
  iOS/Safari hardware has not been tested.
- Desktop and portrait scene fallbacks were recaptured from the updated WebGL
  book scene. The production build and all four Sites checks pass.

The six following chapters now use the original scene modules, articulated
models, camera timelines and paper transitions, adapted with Bump portraits,
wardrobe, textures, screens and content. Original compressed geometry, skeletons
and animation data are retained. Source assets and the reproducible texture/model
pipeline are documented in src/bump/chapters/README.md.

Implemented chapters:
- Workflow: two executing graph scenarios, animated data transport, a required
  human approval gate, parallel record/notification actions, inspection and replay.
- AI and software: dossier validation, illustrative AI synthesis and integrations.
- Cybersecurity: three example findings with remediation states.
- Method: audit, analysis, proposal, implementation and maintenance.
- Vision: three future agent directions, explicitly unavailable.
- Bump: the company, its Montreal roots and a project-form invitation.

There are 21 service-detail dialogs. The project form is an interface prototype;
it does not submit messages or claim that a message was sent. No invented client
results or contact details are configured.

The shared navigation, expanding search, project dialog and Montreal globe are
available across chapters. Mobile fixes cover safe areas, header contrast over
paintings and paper, compact controls, touch opening of the globe, viewport
resizing and all five method tabs. Static fallbacks are captures of the actual
adapted WebGL scenes.

The Montreal globe starts moving immediately and completes its camera approach
in 2.8 seconds, retaining the detailed island view and shrinking pin. The user
confirmed the existing hero transition; its scene and timing remain unchanged.

The current revision adds the exact supplied Bump symbol to the laptop lids,
tablet and hardware hub, plus a raised brass B on the animated armillary. The
software brush, hand, canvas and body now follow scroll together, with all four
time loops disabled. A redesigned dashboard is attached inside the actual 3D
monitor. A new Montreal atelier background, navy/gold wardrobe and system diagram
distinguish this scene. Editorial content uses one continuous paper surface.
Updated fallbacks are captures of these actual 3D scenes.

The next visual correction removes the full-width header fill and shadow across
all chapters. Navigation floats directly over the scene or paper, retaining its
surface-based ink/white contrast and existing interactive controls. Each first
paper group now leaves 52svh of breathing room on desktop and 40svh on mobile
(with minimum/maximum bounds). Chapter content and dialogs use the locally served
IM FELL English Regular and genuine Italic, including French glyphs; the accepted
hero/navigation typography is retained. Font provenance and license are in
public/bump/fonts/README.md.

The Workflow folder/orbit example is now replaced with adapted components from
UI TripleD N8N Workflow Block, Render Workflow Visualizer and Canadian AI Sequence
Flow. The diagram occupies the paper surface directly and reflows vertically on
phones. One run starts when the graph becomes visible, suspends outside the view,
and waits for human approval before updating the two final nodes. Playback,
previous/next, keyboard controls, node details, two scenarios and replay are live.
Reduced motion starts with manual playback and no travelling animation.
Source analysis, adaptations and license files are documented in
src/bump/workflow/README.md.

Workflow revision checks pass on desktop 1600×1000 and mobile 390×844, including
320/430/768px layout checks. Packets move during playback and remain stationary
when paused. Approval cannot be bypassed; both downstream actions execute in
parallel and finish; replay resets the state. Both scenarios, keyboard control,
node details and reduced motion pass without missing assets, runtime errors or
horizontal overflow. The original 3D scenes and their camera/scroll state are
unchanged; the desktop workflow was also inspected over the actual WebGL paper.

Scoped revision validation: desktop 1440×900 and touch mobile 390×844 render the
changed chapters without missing assets or runtime errors. The software props
stay still without scrolling and change position on scroll, on both devices.
Mobile header, copy contrast, transparent outer examples and paper layout are
visually checked. The broader viewport and interaction checks below refer to the
preceding six-chapter release; those controls are unchanged in this revision.

Validation completed on 2026-10-23:
- Production build and all four required Sites checks pass; git diff check clean.
- Actual Chromium WebGL rendering passes across all six animated chapters and
  their paper transitions, with changing skinning data and no console errors,
  missing assets or horizontal overflow.
- Chromium mobile emulation passes at widths 320, 360, 390, 430, 768 and 844px,
  including touch input, landscape, short viewports and search resizing.
- Navigation, search, project-form UI, Montreal camera animation, chapter
  examples and all 21 service dialogs pass. Reduced-motion behavior also passes.
- Mobile WebGL scenes and final header contrast are visually inspected.
- Physical iOS/Safari testing has not been performed. The managed cloud browser
  uses scene fallbacks because it does not expose WebGL.

Build UI with scripts/build-bump-ui.mjs. Adapted chapter models are generated by
scripts/patch-bump-chapter-models.mjs. Keep this Site's independent project ID.

## Current revision — command field, header and opening

The four Workflow service cards and their modal details are replaced by an open
field of twelve Bump `/commands`, following the reference's floating Skills
interaction. Each command explains a concrete PME process directly in the page.
All commands start closed. Desktop hover opens and pointer exit closes; keyboard
focus/blur/Escape and touch toggle/outside tap are implemented. There is no
automatic selection or persistent desktop card after hover ends. Measured label
bounds and wider gaps prevent collisions, including around an expanded command.
Narrow layouts arrange the same commands vertically. The executing graph above
is retained, as are the other five chapters.

The shared header now starts 12px from the viewport edge. The compact editorial
title and sidebar use the same left edge on wide screens, with a clear vertical
gap under the header. Navigation remains transparent.

An early startup script prevents previous scroll restoration from skipping the
black opening on refresh. Reload clears the previous chapter hash, starts at the
hero, shows the original Bump lettering with a loading indicator, then runs the
existing 3D camera approach. Deliberate incoming chapter links still work.

Current cloud checks pass at 1887, 1366, 1024, 768, 430, 390 and 320px. They cover
hover entry/exit, stable open states, no overlap/clipping, touch dismissal,
keyboard focus/Escape, reduced motion, aligned visible headers, zero horizontal
overflow, and no open service dialogs or missing assets/runtime errors. Physical
Safari/iOS hardware has not been tested. Build and all four Sites checks pass.

The black loading → camera → full hero sequence also passes at 1600×1000 with
actual Chromium WebGL/SwiftShader, both on first load and after refreshing from
4500px of scroll with a previous chapter hash. Real WebGL draw calls continue
during the original approach; the final canvas fills the viewport without black
borders. The original Shopify checkout remains clean.

Painted emoji bursts from the retained reference are now emitted on command
entry. Seven small particles rise, drift and fade, clean up after a finite run
and replay on re-entry. They have no pointer hit area and never retain an open
explanation. Tests at 1600, 390 and 320px verify movement, loaded images, replay,
cleanup, hover/touch closing and zero overflow; reduced motion omits the burst.
The final production build and four Sites checks pass after this addition.

## Compact accepted cloud

At the user’s request, the accepted command field is moderately shorter: desktop
height is now 620–740px (72svh) and narrow layouts are 1180px. Intro and outer
vertical margins are reduced. Text sizes, all twelve commands, hover closing,
touch and keyboard behavior, and emoji bursts are retained. The shorter vertical
layout reserves space above/below an expanded item before resolving collisions.
Geometry checks for every command pass at 320, 390, 430, 768, 1024, 1366 and
1887px, with no overlap, clipping or horizontal overflow. Normal-motion emoji
replay and hover/touch dismissal also pass at 320, 390 and 1600px.

The source’s cursor response is restored in empty parts of the compact cloud:
nearby words change scale/ink, the field follows the cursor with eased parallax,
and faint nearest-neighbour connections move with it. Moving out returns to the
resting composition. This motion never selects a command; actual hover still
opens/closes the in-place explanation. Normal desktop checks at 1887/1366px
verify changing size and opacity, moving connections, no overlaps during or after
motion, no clipping/overflow, and correct hover exit. Touch and reduced-motion
checks also pass with the lens disabled and the accepted controls intact.
