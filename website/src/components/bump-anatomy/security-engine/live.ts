// Animation du coffre-fort. Tout dérive de la position continue (0..8) : reculer rejoue les mêmes
// gestes à l'envers. La porte est reconstruite seulement quand son angle, son volant ou ses pênes bougent.
import { translateAlong, segment, slabOf } from "../kit/iso-kit";
import { windowOf, createLoop, readoutOf, announcerOf } from "../shared/runtime";
import { OPEN, doorPaths } from "./door";
import { createSecurityEngine, statusesAt, STATES, STATE_LABEL, STATUS_LABEL, type Status } from "./model";

type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };
type Drawer = { x0: number; x1: number; xc: number; zb: number; zt: number; lamp: [number, number, number] };
type Data = {
  P: Proj; drawers: Drawer[]; risk: number; linked: number; pull: number; pullSlots: number[];
  car: { park: number; z0: number; half: number }; head: { r: number; h: number; park: number }; boltStroke: number;
};

const LAMP: Record<Status, string> = { eteint: "", actif: "white", conforme: "green", examiner: "amber", correle: "amber", risque: "red", corrige: "green" };
const DESK_TEXT = [
  ["Noyau activé", "Coffre fermé · 6 domaines"],
  ["6 domaines actifs", "Connexions verrouillées"],
  ["Analyse en cours…", "Scanner : domaine 1/6"],
  ["5 conformes · 1 à examiner", "Données & accès : à examiner"],
  ["Corrélation détectée", "Applications × Données & accès"],
  ["Risque : accès trop larges", "app-sync écrit partout (fictif)"],
  ["Plan de correction", "4 actions proposées"],
  ["Données & accès : corrigé", "Vérification réussie"],
  ["Périmètre maîtrisé", "Suivi continu activé"],
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function mount(root: HTMLElement, data: Data): () => void {
  const { P, drawers } = data;
  const stage = root.querySelector(".iso-stage") as HTMLElement;
  const svg = stage.querySelector("svg") as SVGSVGElement;
  const items = svg.querySelector('[data-part="items"]') as SVGGElement;
  const slotNodes = Array.from(items.querySelectorAll<SVGGElement>(":scope > [data-i]"));
  const one = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
  const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const riskNode = one(`[data-drawer="${data.risk}"]`).closest("[data-i]") as SVGGElement;
  const riskDrawer = one<SVGGElement>(`[data-drawer="${data.risk}"]`);
  const introGroups = slotNodes.map((g) => [g, Number(g.dataset.intro)] as const).filter(([, k]) => k >= 0);
  const solidOf = (name: string) => {
    const g = one(`[data-s="${name}"]`);
    return { fill: g.querySelector(".iso-fill")!, top: g.querySelector(".iso-top")!, crease: g.querySelector(".iso-crease")!, bevel: g.querySelector(".iso-bevel")!, edge: g.querySelector(".iso-edge")!, shades: Array.from(g.querySelectorAll(".iso-shade")) };
  };
  type Paths = { fill: string; top: string; crease: string; outline: string; shades: string[]; bevel?: string };
  const setSolid = (s: ReturnType<typeof solidOf>, p: Paths) => {
    s.fill.setAttribute("d", p.fill); s.top.setAttribute("d", p.top); s.crease.setAttribute("d", p.crease);
    s.bevel.setAttribute("d", p.bevel ?? ""); s.edge.setAttribute("d", p.outline);
    s.shades.forEach((el, i) => el.setAttribute("d", p.shades[i] ?? ""));
  };
  const hullOf = (name: string) => { const g = one(`[data-h="${name}"]`); return { fill: g.querySelector(".iso-fill")!, top: g.querySelector(".iso-top")!, edge: g.querySelector(".iso-edge")! }; };
  const setHull = (h: ReturnType<typeof hullOf>, p: { fill: string; cap: string; outline: string }) => { h.fill.setAttribute("d", p.fill); h.top.setAttribute("d", p.cap); h.edge.setAttribute("d", p.outline); };
  const part = <T extends Element>(name: string) => one<T>(`[data-part="${name}"]`);

  const door = {
    slab: solidOf("door-slab"), plate: solidOf("plate"), rod: solidOf("rod2"), bar: solidOf("bar"),
    guides: [0, 1, 2].map((j) => solidOf(`guide-${j}`)), bolts: [0, 1, 2].map((j) => solidOf(`bolt-${j}`)),
    dial: hullOf("dial"), hub: hullOf("hub"), cam: hullOf("cam"),
    inner: one<SVGGElement>('[data-door="inner"]'), outer: one<SVGGElement>('[data-door="outer"]'),
  };
  const scanRod = solidOf("rod");
  const lamps = all<SVGPathElement>("[data-lamp]");
  const statusTexts = all<SVGTextElement>("[data-status]");
  const traces = all<SVGPathElement>("[data-trace]");
  const deskLamps = all<SVGPathElement>("[data-desk-lamp]");
  const planLamps = all<SVGPathElement>("[data-plan]");
  const deskTexts = all<SVGTextElement>("[data-desk]");
  const wires = all<SVGPathElement>("[data-wire]");
  const cards = { alert: one<SVGGElement>('[data-card="alert"]'), ok: one<SVGGElement>('[data-card="ok"]') };
  const say = readoutOf(root);
  const announce = announcerOf(root);

  const engine = createSecurityEngine();
  const { steps } = engine;
  const shown = { door: "", slot: -1, texts: new Map<Element, string>(), intro: 0, introOn: false, clock: 0, touched: false, tourAt: -1, tourStep: 0, note: "", noteUntil: 0 };
  const text = (el: Element, t: string) => { if (shown.texts.get(el) !== t) { el.textContent = t; shown.texts.set(el, t); } };
  const fade = (el: Element, v: number) => ((el as SVGElement).style.opacity = v >= 0.999 ? "" : String(Math.max(0, v)));

  /** État d'un domaine pendant une transition : chaque tiroir bascule à son tour. */
  function statusAt(i: number, p: number): Status {
    const base = Math.min(STATES.length - 1, Math.floor(p));
    const next = Math.min(STATES.length - 1, base + 1);
    return p - base >= 0.18 + i * 0.1 ? statusesAt(next)[i] : statusesAt(base)[i];
  }
  /** Position du scanner (x, z de la tête) : parcours des six tiroirs, puis entre les deux corrélés. */
  const stop = (i: number): [number, number] => [drawers[i].xc, (drawers[i].zb + drawers[i].zt) / 2 - 3];
  const park: [number, number] = [data.car.park, data.head.park];
  const corr: [number, number] = [(drawers[data.linked].lamp[0] + drawers[data.risk].lamp[0]) / 2, 100];
  const mix = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function scannerAt(p: number): [number, number] {
    if (p <= 1) return park;
    if (p < 2) {
      const s = (p - 1) * 7, j = Math.floor(s), t = windowOf(s - j, 0, 0.55);
      const from = j === 0 ? park : stop(Math.min(5, j - 1));
      return mix(from, stop(Math.min(5, j)), t);
    }
    if (p < 3) return stop(5);
    if (p < 4) return mix(stop(5), corr, windowOf(p, 3, 3.35));
    return mix(corr, park, windowOf(p, 4, 4.35));
  }

  function draw(p: number) {
    const s = steps.get();
    // Porte : volant et pênes à l'ouverture et à la fermeture ; reconstruite seulement si elle bouge.
    const theta = OPEN * windowOf(p, 0.3, 0.85) * (1 - windowOf(p, 7.05, 7.6));
    const shoot = data.boltStroke * (p < 1 ? 1 - windowOf(p, 0, 0.28) : windowOf(p, 7.6, 7.85));
    const wheel = (shoot / data.boltStroke) * 2.4;
    const needle = -Math.PI / 2 + 3 * windowOf(p, 0, 0.3) - 3 * windowOf(p, 7.6, 7.95) + 1.2 * (1 - shown.intro);
    const key = [theta, wheel, needle, shoot].map((v) => v.toFixed(4)).join();
    if (key !== shown.door) {
      shown.door = key;
      const d = doorPaths(theta, wheel, needle, shoot, P);
      setSolid(door.slab, d.slab); setSolid(door.plate, d.plate); setSolid(door.rod, d.rod); setSolid(door.bar, d.bar);
      d.guides.forEach((g, j) => setSolid(door.guides[j], g));
      d.bolts.forEach((b, j) => setSolid(door.bolts[j], b ?? { fill: "", top: "", crease: "", outline: "", shades: [] }));
      setHull(door.dial, d.dial); setHull(door.hub, d.hub); setHull(door.cam, d.cam);
      part("seam").setAttribute("d", d.seam); part("core").setAttribute("d", d.bezel); part("dial-face").setAttribute("d", d.face);
      part("ticks").setAttribute("d", d.ticks); part("needle").setAttribute("d", d.needle);
      for (const n of ["spokes", "spokes-edge"]) part(n).setAttribute("d", d.spokes);
      for (const n of ["knobs", "knobs-edge"]) part(n).setAttribute("d", d.knobs);
      part("plate-text").setAttribute("transform", d.plateText);
      door.outer.style.display = d.outer ? "" : "none";
      door.inner.style.display = d.outer ? "none" : "";
    }
    (part("core") as SVGElement).dataset.on = shown.intro < 1 ? "" : p >= 7.6 ? "green" : "white";

    // Tiroirs : voyant, état gravé, piste de corrélation.
    const st = drawers.map((_, i) => statusAt(i, p));
    const blink = Math.sin(shown.clock * 7) > 0;
    st.forEach((x, i) => {
      const on = x === "correle" ? (blink ? "amber" : "white") : LAMP[x];
      lamps[i].dataset.on = on;
      deskLamps[i].dataset.on = on;
      text(statusTexts[i], cap(STATUS_LABEL[x]));
      traces[i].toggleAttribute("data-on", x === "correle");
    });

    // Scanner : chariot sur le rail, sonde qui descend devant chaque tiroir.
    const [hx, hz] = scannerAt(p);
    part("car").setAttribute("transform", translateAlong(P, [hx - data.car.park, 0, 0]));
    part("head").setAttribute("transform", translateAlong(P, [hx - data.car.park, 0, hz - data.head.park]));
    setSolid(scanRod, slabOf({ x: hx - 1, y: 46, w: 2, d: 2, r: 0.3 }, hz + data.head.h, data.car.z0 - hz - data.head.h, P, 2));
    (part("scan-lamp") as SVGElement).dataset.on = p > 1.02 && p < 1.98 ? "green" : p > 3.2 && p < 4.05 ? "amber" : "";
    const link = windowOf(p, 3.3, 3.5) * (1 - windowOf(p, 3.95, 4.05));
    [data.linked, data.risk].forEach((i, j) => {
      wires[j].setAttribute("d", link > 0 ? segment([hx, 49.4, hz + 1], [drawers[i].lamp[0], 45.4, drawers[i].lamp[2]], P) : "");
      fade(wires[j], link);
    });

    // Tiroir à risque : verrou, sortie, échange de la carte d'accès, retour.
    const pull = data.pull * windowOf(p, 4.25, 4.85) * (1 - windowOf(p, 6.55, 6.85));
    riskDrawer.setAttribute("transform", pull ? translateAlong(P, [0, pull, 0]) : "");
    const slot = data.pullSlots[Math.round((pull / data.pull) * (data.pullSlots.length - 1))];
    if (slot !== shown.slot) { items.insertBefore(riskNode, slotNodes[slot] ?? null); shown.slot = slot; }
    part("latch").setAttribute("transform", translateAlong(P, [5 * windowOf(p, 4, 4.25) * (1 - windowOf(p, 6.85, 6.97)), 0, 0]));
    cards.alert.setAttribute("transform", translateAlong(P, [0, 0, 22 * windowOf(p, 6.05, 6.3)]));
    fade(cards.alert, 1 - windowOf(p, 6.15, 6.3));
    cards.ok.setAttribute("transform", translateAlong(P, [0, 0, 22 * (1 - windowOf(p, 6.3, 6.5))]));
    fade(cards.ok, windowOf(p, 6.3, 6.4));

    // Pupitre : deux lignes d'état, plan proposé puis exécuté action par action.
    const idx = Math.min(8, Math.round(p));
    const lines = DESK_TEXT[idx].slice();
    if (idx === 2) lines[1] = `Scanner : domaine ${Math.min(6, Math.max(1, Math.ceil((p - 1) * 7) - 0))}/6`;
    text(deskTexts[0], lines[0]); text(deskTexts[1], lines[1]);
    planLamps.forEach((el, j) => (el.dataset.on = p >= 6.15 + 0.18 * j ? "green" : p >= 5.15 + 0.15 * j ? "amber" : ""));

    // Montage initial : les pièces descendent à leur place, dans l'ordre.
    for (const [g, k] of introGroups) {
      const e = windowOf(shown.intro, k * 0.13, k * 0.13 + 0.35);
      g.setAttribute("transform", e < 1 ? translateAlong(P, [0, 0, 34 * (1 - e)]) : "");
      fade(g, e);
    }

    const note = shown.clock < shown.noteUntil ? shown.note : "";
    say(note || (s.paused ? `${engine.readout()} · pause` : Math.abs(p - s.index) > 0.05 ? `→ ${STATE_LABEL[s.id]}` : engine.readout()));
  }

  const TOUR: [number, () => void][] = [1.9, 4.9, 8.6, 11.4, 14.2, 17.2, 20.2, 23.4].map((t) => [t, () => steps.next()]);
  const loop = createLoop(stage, (dt, clock, calm) => {
    shown.clock = clock;
    const paused = steps.get().paused;
    let intro = false;
    if (!shown.introOn) { shown.introOn = true; shown.intro = calm ? 1 : 0; }
    if (shown.intro < 1) { shown.intro = calm ? 1 : Math.min(1, shown.intro + dt / 2.2); intro = true; }
    if (!paused && shown.tourAt < 0 && !shown.touched && !calm && shown.intro >= 1) shown.tourAt = clock;
    let touring = false;
    if (!paused && !shown.touched && shown.tourAt >= 0) {
      const age = clock - shown.tourAt;
      while (shown.tourStep < TOUR.length && age >= TOUR[shown.tourStep][0]) TOUR[shown.tourStep++][1](), sync();
      touring = shown.tourStep < TOUR.length;
    }
    const moving = steps.tick(dt, calm);
    const p = steps.get().position;
    draw(p);
    const blinking = !calm && drawers.some((_, i) => statusAt(i, p) === "correle");
    return moving || touring || intro || blinking || clock < shown.noteUntil;
  });

  function sync() {
    const s = steps.get();
    root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => b.toggleAttribute("data-current", Number(b.dataset.step) === s.index));
    const pause = root.querySelector("[data-pause]");
    if (pause) { pause.textContent = s.paused ? "Reprendre" : "Pause"; pause.setAttribute("aria-pressed", String(s.paused)); }
    announce(`${STATE_LABEL[s.id]} · ${engine.readout()}`);
    loop.kick();
  }
  const handlers: [Element | null, string, EventListener][] = [];
  const listen = (el: Element | null, type: string, fn: EventListener) => { el?.addEventListener(type, fn); handlers.push([el, type, fn]); };
  const act = (fn: () => void) => () => { shown.touched = true; fn(); sync(); };
  const inspect = (i: number) => { shown.note = engine.inspect(i); shown.noteUntil = shown.clock + 2.6; announce(shown.note); };
  const replay = () => { if (steps.get().index === 0) shown.intro = 0; steps.replay(); };

  root.querySelectorAll("[data-step]").forEach((b) => listen(b, "click", act(() => steps.select(Number((b as HTMLElement).dataset.step)))));
  listen(root.querySelector("[data-next]"), "click", act(() => steps.next()));
  listen(root.querySelector("[data-prev]"), "click", act(() => steps.prev()));
  listen(root.querySelector("[data-pause]"), "click", act(() => steps.pause()));
  listen(root.querySelector("[data-replay]"), "click", act(replay));
  listen(root.querySelector("[data-reset]"), "click", act(() => steps.reset()));
  listen(svg, "click", ((e: Event) => {
    const d = (e.target as Element).closest("[data-drawer]") as HTMLElement | null;
    if (d) act(() => inspect(Number(d.dataset.drawer)))();
  }) as EventListener);
  listen(stage, "keydown", ((e: KeyboardEvent) => {
    const keys: Record<string, () => void> = { ArrowRight: () => steps.next(), ArrowLeft: () => steps.prev(), " ": () => steps.pause(), Home: () => steps.reset(), Enter: () => steps.next() };
    const fn = keys[e.key] ?? (/^[1-9]$/.test(e.key) ? () => steps.select(Number(e.key) - 1) : null);
    if (!fn) return;
    e.preventDefault();
    act(fn)();
  }) as EventListener);

  sync();
  draw(0);
  return () => { loop.destroy(); for (const [el, type, fn] of handlers) el?.removeEventListener(type, fn); };
}

