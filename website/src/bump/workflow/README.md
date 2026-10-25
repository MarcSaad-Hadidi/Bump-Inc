# Bump executing workflow

This replaces the former orbiting folder illustration in the Workflow paper
section. Everything runs locally as an explicit illustrative scenario. No live
CRM, email or external automation service is connected.

## Component sources and adaptations

- UI TripleD, N8N Workflow Block: https://ui.tripled.work/components/n8n-workflow-block
  Registry: https://ui.tripled.work/r/n8n-workflow-block-shadcnui.json
  `WorkflowEdge.jsx` adapts `WorkflowConnectionLine`'s cubic connector calculation;
  the nodes retain the icon/type/description/status anatomy. The editor's random
  node insertion and dragging are not part of this presentation.
- Render Workflow Visualizer: https://github.com/render-examples/workflow-visualizer
  `WorkflowNode.jsx`, `WorkflowEdge.jsx` and the player adapt the positioned node,
  active/completed flow, moving packet, selected detail and step controls. The
  config retains its AnimationStep vocabulary (`activeNodes`, `activeEdges`,
  `duration`). Its README declares MIT licensing. Colors, sizing and rendering
  are adapted to Bump's paper and existing React runtime.
- Canadian AI Sequence Flow: https://github.com/canadian-ai/sequence-flow
  Read at commit c65003ace1cf510c29d36d8bf3861bc38a373e28.
  `useWorkflowJourney.js` adapts JourneyPlayer's bounded navigation, play/replay,
  reduced-motion defaults, step narration and timeout cleanup. This directed
  workflow needs neither its Mermaid parser nor a second diagramming runtime.

Licenses for copied/adapted source are included under `public/bump/licenses/`.
The three sources were inspected through their actual source and the two live
component previews. The design intentionally retains Bump's antique typography
and one continuous paper background instead of the sources' editor shells.

## Execution

The first visible entry starts one run (unless reduced motion is requested).
Reception leads to preparation and stops at human validation. Approval launches
the record and notification branches in parallel, then stops at completion.
Controls allow pause/resume, previous/next, node inspection and replay; advancing
cannot bypass approval. Two scenarios demonstrate requests and documents.
Leaving the viewport suspends progress. Every timer and observer is cleaned up.

Edges render finite travelling packets rather than an unrelated looping effect.
The layout measures available width and switches to a vertical graph below
720px, keeping labels and controls at readable sizes without horizontal panning.
The existing scene, models and scroll transition are untouched.
# Workflow command field

Below the executing diagram, `WorkflowCloud.jsx` replaces the four service cards
and their full-screen detail dialogs. It adapts the open field of `/commands`
seen in the retained Shopify reference, using twelve illustrative PME processes.
These are examples of consultation mandates, not a catalogue of ready-made Bump
products or available future AI agents.

The field starts closed. Pointer entry opens an explanation in place; pointer
exit closes it. Keyboard focus opens it, blur/Escape closes it, and touch toggles
it with outside-tap dismissal. Scrolling never opens a command automatically.
An actual-size collision pass preserves generous gaps around the labels and an
expanded explanation. Narrow fields use a spacious vertical arrangement.
Parallax is event-driven and stops outside the view; reduced motion removes it.

Hover also emits a finite, non-interactive burst of painted thumb/clap/armoured-OK,
confetti and flame images from the retained reference assets, copied to
public/bump/emoji. The particles rise, drift and fade, clean themselves up,
replay on re-entry and are omitted for reduced motion.

The reference's `Qi`/`Fi` field behavior is also adapted: pointer movement in
empty space drives a distance-based size/ink lens and parallax, with faint lines
between the three nearest neighbours. It does not select commands. Pointer exit
eases back to the resting composition; touch and reduced motion keep their
static layout. Lens scale is calibrated to Bump's existing oversized typography.

## V19 replay policy

The existing stage timer also pauses in a background document. The shared idle
controller restarts a finished journey after 12 seconds, or waits 30 seconds
after the last interaction. Editing and pointer holds block resets; explicit
Pause remains paused. At the human approval gate, an idle restart returns to
the beginning and never validates on the visitor's behalf. Reduced motion does
not restart automatically, and no second scroll controller is introduced.

## V20 automatic illustrated journey

The newest user instruction supersedes the manual playback/approval gate above.
Player, replay, previous/next and stage controls are removed. A measured cursor
visibly reviews the illustrative request and confirms the sample approval node;
then CRM and notification steps run automatically. This changes only a fictional
local demonstration, never a real approval or external system. The shared ×2
clock and short end rest repeat the journey. Clicking a role still lets the
visitor inspect it, hides the automatic cursor and waits 30 quiet seconds before
restarting. Reduced motion shows a completed, readable journey.
# V21 approval and repeated journeys

Only the approval gate displays a simulated pointer. The route visibly stops,
the pointer approaches after a rest, clicks the real gate location, and the
automatic example continues. Three complete cycles, both examples, manual
approval, hover/focus/touch explanations, offscreen reentry and reduced motion
passed. A passive hover does not pause or impose an editing timeout.
Timed playback now uses the shared ×1.5 rate. Mobile uses a compact vertical
graph with all five nodes and a shorter illustrative caption.

