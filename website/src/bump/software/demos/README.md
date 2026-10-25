# Bump software demonstrations

Only the two `online` content groups use this entry point. The hero/Rive hand,
WebGL scene, navigation and assisted scrolling are not changed. Service handle
anchors are retained for existing navigation and search links.

## Component foundations

- Kanban: https://www.shadcn.io/components/kanban — controlled flat item/column
  anatomy. Its current registry requires an account. The implementation adapts
  the public, MIT-licensed Kibo UI Kanban source (the dnd-kit version):
  https://www.kibo-ui.com/r/kanban.json, https://github.com/shadcnblocks/kibo.
  Scoped styles replace Tailwind; touch activation is delayed, page autoscroll
  is disabled, and an accessible status selector supplements pointer dragging.
- Motion: https://motion.dev/docs/react-layout-animations. Shared layout IDs
  animate the actual card between real column parents; other cards reorganize.
- AnimatedList: https://magicui.design/r/animated-list.json. Adapted to an
  externally controlled item count, so visibility and playback share one clock.
- shadcn Chart: https://ui.shadcn.com/r/styles/new-york/chart.json. Adapted
  ChartContainer/tooltip composition using real Recharts charts and tooltips.
- shadcn Sheet: https://ui.shadcn.com/r/styles/new-york/sheet.json. Adapted Radix
  Dialog primitives, inline, `modal={false}`, with no overlay or scroll lock.
- NumberFlow: https://number-flow.barvian.me — animated, localized KPI numbers.
- Lucide: https://lucide.dev — React icons. Existing supplied Bump symbol reused.

The copied/adapted registry foundations are MIT licensed. Copyright (c) shadcn;
Copyright (c) Magic UI; Copyright (c) Hayden Bleasel / Kibo UI. Permission is
hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions: The above copyright notice and this
permission notice shall be included in all copies or substantial portions of
the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

## Playback and integration

`useScenario` schedules only finite checkpoints. It preserves elapsed time when
the demo leaves the viewport or the document becomes hidden. There is no second
scroll controller. A completed scenario is idle until replayed. Stage buttons
allow inspection of every state. Reduced motion shows the completed, readable
interface without cursor/layout/number transitions, with manual stage selection.
All request and recommendation actions use deterministic local state only.

`useDemoTurn` coordinates the finite clocks when both rows are visible. Kanban
keeps priority, including while manually paused, until it finishes. The dashboard
then runs. Replaying the first pauses the second without resetting its progress.
An offscreen row relinquishes playback so scrolling never traps the next demo;
its own elapsed time is preserved. No second scroll listener/controller is added.

`scripts/build-bump-ui.mjs` builds a separate demo bundle and aliases React and
ReactDOM to the site's retained React 18 runtime, avoiding a second hook runtime.
The main content uses React.lazy/Suspense for this bundle. Demo styling is scoped
under `.bsd-section`; no global tokens or existing chapter styles are replaced.

## V20 automatic playback

The user's latest decision removes all visible player/replay/stage buttons.
Stage labels remain plain text. Both demos run at the shared ×2 rate and repeat
after a short rest, retaining one-at-a-time playback. The Kanban's moving pointer
and drag remain; the dashboard now illustrates period selection, opening the
assistant and submitting its sample recommendations for human review with a
visible measured cursor. Submission remains local fictional UI state. Actual
visitor actions pause the automatic cursor and retain editing/dragging and
30-second idle protection. Reduced motion has no automated cursor or replay.

## V21 complete local journeys

The shared timed rate is now ×1.5. Each scenario restarts on viewport reentry,
except while a real focused text edit must be preserved. Passive pointer hover
does not postpone looping. Both complete measured tours include local sidebar
navigation, notifications, details, report views and closing controls. Click
rings remain at the clicked control rather than travelling to the next one.
The Kanban still finishes before the dashboard starts when both are visible.
All controls manipulate fictional browser-local state only.

Desktop and mobile manual journeys, two complete dashboard/board runs, viewport
reentry, focused-search preservation and reduced motion passed without browser
errors or warnings. The mobile board uses compact background cards while the
illustrated request remains detailed; all four statuses remain available.
