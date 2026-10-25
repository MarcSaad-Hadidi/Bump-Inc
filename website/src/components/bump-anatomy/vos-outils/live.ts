// Animation du train d'engrenages. Chaque engrenage est reconstruit à chaque image avec extrude
// du kit (sa silhouette change en tournant) ; les poses dérivent de la position continue (0..5),
// donc reculer rejoue les mêmes mouvements. Les outils engrenés suivent exactement le moyeu.
import { extrude, translateAlong, circleRing } from "../kit/iso-kit";
import { clampN, windowOf, createLoop, readoutOf, announcerOf } from "../shared/runtime";
import { gearRing, patchRing, meshed, radialRect, pitchRadius } from "./gear";
import { createToolkit, TOOLS, BROKEN, STATE_LABEL } from "./model";

type Pt = [number, number];
type Data = {
  P: { origin: [number, number]; scale: number; azimuth: number; elevation: number };
  n: { hub: number; adapter: number; tool: number };
  phi: number[];
  dAdapter: number;
  dTool: number;
  out: number;
  z: { g0: number; gh: number; crank: number; pulse: number };
  lift: { patch: number; adapter: number; ring: number };
  broken: number[];
};

const HUB_SPEED = 0.55; // rad/s
const TAU = Math.PI * 2;
const shortest = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function mount(root: HTMLElement, data: Data): () => void {
  const { P, n, phi } = data;
  const stage = root.querySelector(".iso-stage") as HTMLElement;
  const svg = stage.querySelector("svg") as SVGSVGElement;
  const q = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const solids = Object.fromEntries(q<SVGGElement>("[data-gear]").map((g) => [g.dataset.gear!, {
    fill: g.querySelector(".iso-fill")!, top: g.querySelector(".iso-top")!, crease: g.querySelector(".iso-crease")!, edge: g.querySelector(".iso-edge")!,
    shades: Array.from(g.querySelectorAll(".iso-shade")),
  }]));
  const moves = TOOLS.map((_, i) => q<SVGGElement>(`[data-move="${i}"]`));
  const adapters = TOOLS.map((_, i) => svg.querySelector(`[data-adapter="${i}"]`) as SVGGElement);
  const adapterCaps = TOOLS.map((_, i) => svg.querySelector(`[data-adapter-cap="${i}"]`) as SVGGElement);
  const lamps = TOOLS.map((_, i) => svg.querySelector(`[data-lamp="${i}"]`) as SVGPathElement);
  const versions = TOOLS.map((_, i) => svg.querySelector(`[data-version="${i}"]`) as SVGTextElement);
  const pulses = TOOLS.map((_, i) => svg.querySelector(`[data-pulse="${i}"]`) as SVGGElement);
  const patch = svg.querySelector('[data-part="patch"]') as SVGGElement;
  const rings = q<SVGGElement>('[data-part="ring"]');
  const say = readoutOf(root);
  const announce = announcerOf(root);

  const kit = createToolkit();
  const { steps } = kit;
  const Rh = pitchRadius(n.hub), Ra = pitchRadius(n.adapter), Rt = pitchRadius(n.tool);
  const centre = (r: number, i: number): Pt => [Math.cos(phi[i]) * r, Math.sin(phi[i]) * r];
  const shown = {
    hub: 0, clock: 0, syncClock: 0, touched: false, tourAt: -1, tourStep: 0,
    own: TOOLS.map(() => 0), removed: TOOLS.map(() => 0), versions: TOOLS.map(() => ""),
  };

  function setSolid(name: string, ring: Pt[], z: number, h: number, convex = false) {
    const s = solids[name];
    const p = extrude(ring, z, h, P, { convex });
    s.fill.setAttribute("d", p.fill);
    s.top.setAttribute("d", p.top);
    s.crease.setAttribute("d", p.crease);
    s.edge.setAttribute("d", p.outline);
    s.shades.forEach((el, k) => el.setAttribute("d", p.shades[k] ?? ""));
  }
  const show = (el: Element, v: number) => ((el as SVGGElement).style.opacity = v >= 0.999 ? "" : String(clampN(v)));

  function draw(dt: number, running: boolean, calm: boolean) {
    const s = steps.get();
    const p = s.position;
    if (running) shown.hub += dt * HUB_SPEED;
    const repaired = windowOf(p, 0.15, 0.85);
    const slide = windowOf(p, 2.05, 2.8);
    const lock = windowOf(p, 2.6, 2.95);
    const syncing = windowOf(p, 3, 3.4);
    shown.syncClock = p >= 3.5 ? shown.syncClock + (running ? dt : 0) : 0;

    // Moyeu et manivelle : une seule source de rotation.
    const th = shown.hub;
    setSolid("hub", gearRing(n.hub, 0, 0, th), data.z.g0, data.z.gh);
    setSolid("crank-arm", radialRect(th, -3, 13.5, 1.8), data.z.crank, 1.4, true);
    setSolid("crank-knob", circleRing(12 * Math.cos(th), 12 * Math.sin(th), 2.2, 20), data.z.crank + 1.4, 4.4, true);

    const vs = kit.versions(shown.syncClock * 0.5);
    TOOLS.forEach((tool, i) => {
      // Adaptateur : descend à l'étape 2, remonte si on le retire.
      const target = kit.state.removed.has(i) ? 1 : 0;
      shown.removed[i] = calm ? target : shown.removed[i] + (target - shown.removed[i]) * (1 - Math.exp(-dt / 0.22));
      const present = windowOf(p, 1.05 + 0.08 * i, 1.7 + 0.08 * i) * (1 - shown.removed[i]);
      const [ax, ay] = centre(data.dAdapter, i);
      const ta = meshed(Rh, th, Ra, n.adapter, phi[i]);
      const up = data.lift.adapter * (1 - present);
      setSolid(`adapter-${i}`, gearRing(n.adapter, ax, ay, ta), data.z.g0 + up, data.z.gh);
      adapterCaps[i].setAttribute("transform", up ? translateAlong(P, [0, 0, up]) : "");
      show(adapters[i], present * 4);

      // Outil : recule avant la connexion, tourne à son rythme tant qu'il n'est pas mené.
      const back = data.out * (1 - slide);
      const [cx, cy] = centre(data.dTool + back, i);
      const offset = back ? translateAlong(P, [Math.cos(phi[i]) * back, Math.sin(phi[i]) * back, 0]) : "";
      moves[i].forEach((g) => g.setAttribute("transform", offset));
      const drive = lock * clampN((present - 0.85) / 0.15);
      const mesh = meshed(Ra, ta, Rt, n.tool, phi[i]);
      const ownSpeed = i === BROKEN && repaired < 1 ? 0 : tool.own * TAU;
      if (running) shown.own[i] += dt * ownSpeed;
      let angle = drive >= 0.999 ? mesh : shown.own[i] + shortest(mesh - shown.own[i]) * drive;
      if (drive >= 0.999) shown.own[i] = mesh;
      if (i === BROKEN && repaired < 1 && running) angle += Math.sin(shown.clock * 31) * 0.014 * (1 - repaired);
      const fixed = repaired >= 0.98;
      setSolid(`tool-${i}`, gearRing(n.tool, cx, cy, angle, i === BROKEN && !fixed ? data.broken : [], i === BROKEN && fixed ? data.broken : []), data.z.g0, data.z.gh);
      if (i === BROKEN) {
        setSolid("patch", patchRing(n.tool, cx, cy, angle, data.broken), data.z.g0 + data.lift.patch * (1 - repaired), data.z.gh);
        show(patch, repaired * 5);
      }
      lamps[i].dataset.on = i === BROKEN && repaired < 1 ? "red" : drive > 0.9 ? "green" : "amber";

      // Fiche client : chaque outil garde sa version tant qu'il n'est pas synchronisé.
      const label = `fiche v${vs[i]}`;
      if (label !== shown.versions[i]) versions[i].textContent = shown.versions[i] = label;
      const f = calm ? 1 : (shown.syncClock * 0.5) % 1;
      const r = (data.dTool + back) * f;
      pulses[i].setAttribute("transform", translateAlong(P, [Math.cos(phi[i]) * r, Math.sin(phi[i]) * r, 0]));
      show(pulses[i], drive > 0.9 && kit.synced().includes(i) ? syncing * (calm ? 1 : Math.min(1, f * 8, (1 - f) * 8)) : 0);
    });

    // Cerclage : une seule structure autour de l'ensemble.
    const ring = windowOf(p, 4.05, 4.85);
    rings.forEach((g) => { g.setAttribute("transform", ring < 1 ? translateAlong(P, [0, 0, data.lift.ring * (1 - ring)]) : ""); show(g, ring * 4); });

    say(s.paused ? `${kit.readout()} · pause` : Math.abs(p - s.index) > 0.05 ? `→ ${STATE_LABEL[s.id]}` : kit.readout());
  }

  const TOUR: [number, () => void][] = [[2.2, () => steps.next()], [5.2, () => steps.next()], [8.2, () => steps.next()], [11.4, () => steps.next()], [15.4, () => steps.next()]];
  const loop = createLoop(stage, (dt, clock, calm) => {
    shown.clock = clock;
    const paused = steps.get().paused;
    if (!paused && shown.tourAt < 0 && !shown.touched && !calm) shown.tourAt = clock;
    let touring = false;
    if (!paused && !shown.touched && shown.tourAt >= 0) {
      const age = clock - shown.tourAt;
      while (shown.tourStep < TOUR.length && age >= TOUR[shown.tourStep][0]) TOUR[shown.tourStep++][1](), sync();
      touring = shown.tourStep < TOUR.length;
    }
    const moving = steps.tick(dt, calm);
    const running = !paused && !calm;
    draw(dt, running, calm);
    // Les engrenages tournent tant que la figure est visible et non en pause ; en mouvement réduit, tout s'arrête.
    return running || moving || touring || shown.removed.some((v, i) => Math.abs(v - (kit.state.removed.has(i) ? 1 : 0)) > 1e-3);
  });

  function sync() {
    const s = steps.get();
    root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => b.toggleAttribute("data-current", Number(b.dataset.step) === s.index));
    root.querySelectorAll<HTMLButtonElement>("[data-adapter-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(!kit.state.removed.has(Number(b.dataset.adapterToggle)))));
    const pause = root.querySelector("[data-pause]");
    if (pause) { pause.textContent = s.paused ? "Reprendre" : "Pause"; pause.setAttribute("aria-pressed", String(s.paused)); }
    announce(`${STATE_LABEL[s.id]} · ${kit.readout()}`);
    loop.kick();
  }
  const toggle = (i: number) => {
    if (!kit.toggleAdapter(i)) { announce("Les adaptateurs arrivent à l'étape 2 : avancez d'abord."); return; }
    announce(kit.state.removed.has(i) ? `Adaptateur ${TOOLS[i].label} retiré : l'outil décroche` : `Adaptateur ${TOOLS[i].label} remis`);
  };
  const handlers: [Element | null, string, EventListener][] = [];
  const listen = (el: Element | null, type: string, fn: EventListener) => { el?.addEventListener(type, fn); handlers.push([el, type, fn]); };
  const act = (fn: () => void) => () => { shown.touched = true; fn(); sync(); };

  root.querySelectorAll("[data-step]").forEach((b) => listen(b, "click", act(() => steps.select(Number((b as HTMLElement).dataset.step)))));
  root.querySelectorAll("[data-adapter-toggle]").forEach((b) => listen(b, "click", act(() => toggle(Number((b as HTMLElement).dataset.adapterToggle)))));
  listen(root.querySelector("[data-next]"), "click", act(() => steps.next()));
  listen(root.querySelector("[data-prev]"), "click", act(() => steps.prev()));
  listen(root.querySelector("[data-pause]"), "click", act(() => steps.pause()));
  listen(root.querySelector("[data-replay]"), "click", act(() => steps.replay()));
  listen(root.querySelector("[data-reset]"), "click", act(() => kit.reset()));
  listen(svg, "click", ((e: Event) => {
    const hit = (e.target as Element).closest("[data-adapter],[data-tool]") as HTMLElement | null;
    if (hit) act(() => toggle(Number(hit.dataset.adapter ?? hit.dataset.tool)))();
  }) as EventListener);
  listen(stage, "keydown", ((e: KeyboardEvent) => {
    const keys: Record<string, () => void> = { ArrowRight: () => steps.next(), ArrowLeft: () => steps.prev(), " ": () => steps.pause(), Home: () => kit.reset(), Enter: () => steps.next() };
    const fn = keys[e.key] ?? (/^[1-5]$/.test(e.key) ? () => toggle(Number(e.key) - 1) : null);
    if (!fn) return;
    e.preventDefault();
    act(fn)();
  }) as EventListener);

  sync();
  draw(0, false, true);
  return () => { loop.destroy(); for (const [el, type, fn] of handlers) el?.removeEventListener(type, fn); };
}
