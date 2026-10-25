// Animation du banc optique. Tout dérive de la position continue (0..3) : la lumière dispersée se
// resserre quand les optiques se posent, devient un faisceau, puis se répartit vers les trois cloches.
// La démonstration tourne en boucle tant que la figure est visible ; un geste la suspend 15 s.
import { translateAlong, segment } from "../kit/iso-kit";
import { windowOf, createLoop, readoutOf, announcerOf, lerpN } from "../shared/runtime";
import { createVision, STATES, STATE_LABEL, PISTES, NEEDS } from "./model";

type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };
type V3 = [number, number, number];
type Data = { P: Proj; beamZ: number; aperture: number; lenses: number[]; slit: number; prismIn: number; prismOut: number; domes: [number, number][]; domeR: number; drop: number; rays: number };

const LAST = STATES.length - 1;
const PISTES_AT = STATES.indexOf("pistes");
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function mount(root: HTMLElement, data: Data): () => void {
  const { P } = data;
  const stage = root.querySelector(".iso-stage") as HTMLElement;
  const svg = stage.querySelector("svg") as SVGSVGElement;
  const one = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
  const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const rays = all<SVGPathElement>(".ray");
  const main = all<SVGPathElement>('[data-beam="main"]');
  const branches = PISTES.map((_, i) => all<SVGPathElement>(`[data-branch="${i}"]`));
  const drops = ["lens0", "lens1", "slit"].map((n) => one<SVGGElement>(`[data-drop="${n}"]`));
  const sourceLamp = one<SVGPathElement>('[data-part="source-lamp"]');
  const needLamps = all<SVGPathElement>("[data-need]");
  const plaqueLamps = all<SVGPathElement>("[data-plaque]");
  const glows = all<SVGPathElement>("[data-glow]");
  const protos = all<SVGGElement>("[data-proto]");
  const stepLamps = all<SVGPathElement>("[data-step-lamp]");
  const say = readoutOf(root);
  const announce = announcerOf(root);

  const vision = createVision();
  const { steps } = vision;
  const Z = data.beamZ;
  const A: V3 = [data.aperture, 0, Z];
  const RAY = Array.from({ length: data.rays }, (_, i) => ({ yaw: (rnd(i) - 0.5) * 2.3, pitch: (rnd(i + 40) - 0.5) * 0.8, len: 70 + rnd(i + 80) * 110, alpha: 0.35 + rnd(i + 120) * 0.5 }));
  const shown = { clock: 0, stepAt: 0, holdUntil: 0, focus: null as number | null, pisteAt: 0 };
  const setPath = (els: SVGPathElement[], d: string, opacity: number) => els.forEach((el) => { el.setAttribute("d", d); el.style.opacity = String(opacity); });

  /** Piste mise en avant : celle qu'on a choisie, sinon une à tour de rôle pendant la phase 4 (la dernière reste jusqu'au retour au début). */
  const focusAt = (p: number) => (p < PISTES_AT - 0.05 ? null : shown.focus ?? Math.min(PISTES.length - 1, Math.max(0, Math.floor((shown.clock - shown.pisteAt) / 2.4))));

  function draw(p: number, running: boolean) {
    const t = shown.clock;
    const align = windowOf(p, 0.1, 0.95);
    const coherent = windowOf(p, 1.05, 1.8);
    const split = windowOf(p, 2.05, 2.6);
    const focus = focusAt(p);

    // Optiques : elles se posent sur leurs cavaliers pendant l'alignement.
    drops.forEach((g, i) => {
      const d = windowOf(p, 0.1 + i * 0.17, 0.5 + i * 0.17);
      g.setAttribute("transform", d < 1 ? translateAlong(P, [0, 0, data.drop * (1 - d)]) : "");
      g.style.opacity = d >= 1 ? "" : String(Math.min(1, d * 1.6));
    });

    // Lumière dispersée → resserrée vers la fente → éteinte quand le faisceau prend le relais.
    RAY.forEach((r, i) => {
      const wob = running ? Math.sin(t * 2 + i) * 0.08 * (1 - align) : 0;
      const yaw = (r.yaw + wob) * (1 - align * 0.985), pitch = r.pitch * (1 - align * 0.985);
      const len = lerpN(r.len, data.slit - data.aperture, align);
      const end: V3 = [A[0] + len * Math.cos(pitch) * Math.cos(yaw), A[1] + len * Math.cos(pitch) * Math.sin(yaw), A[2] + len * Math.sin(pitch)];
      rays[i].setAttribute("d", segment(A, end, P));
      rays[i].style.opacity = String(r.alpha * (1 - coherent));
    });
    const beamEnd = lerpN(data.slit, data.prismIn, coherent);
    setPath(main, coherent > 0.01 ? segment(A, [beamEnd, 0, Z], P) : "", Math.min(1, coherent * 3));

    // Prisme → trois cloches.
    const out: V3 = [data.prismOut, 0, Z];
    data.domes.forEach(([x, y], i) => {
      const dx = x - out[0], dy = y - out[1], n = Math.hypot(dx, dy);
      const surface: V3 = [x - (dx / n) * data.domeR, y - (dy / n) * data.domeR, Z];
      const end: V3 = [lerpN(out[0], surface[0], split), lerpN(out[1], surface[1], split), Z];
      setPath(branches[i], split > 0.01 ? segment(out, end, P) : "", split > 0.01 ? (focus === null || focus === i ? 1 : 0.45) : 0);
      const lit = split > 0.9;
      glows[i].toggleAttribute("data-on", lit && (focus === null || focus === i));
      protos[i].style.opacity = String(0.55 + 0.45 * split * (focus === null || focus === i ? 1 : 0.7));
      protos[i].style.strokeDashoffset = running ? String(-t * 10) : "0";
      protos[i].toggleAttribute("data-on", lit && focus === i);
      plaqueLamps[i].dataset.on = lit ? "amber" : "";
    });

    // Fiches terrain : toutes alimentent la source ; en phase 4, celles qui nourrissent la piste en avant.
    needLamps.forEach((el, i) => {
      el.dataset.on = focus === null ? "white" : (PISTES[focus].needs as readonly number[]).includes(i) ? "white" : "";
    });
    sourceLamp.dataset.on = coherent > 0.5 ? "green" : align > 0.5 ? "white" : "amber";
    const idx = Math.round(p);
    stepLamps.forEach((el, j) => (el.dataset.on = j < idx ? "green" : j === idx ? (j === LAST ? "green" : "amber") : ""));

    const s = steps.get();
    const near = Math.abs(p - s.index) < 0.08;
    say(s.paused ? `${vision.readout(focus)} · pause` : near ? vision.readout(focus) : `→ ${STATE_LABEL[s.id]}`);
  }

  const DWELL = [3, 3.5, 3, 9];
  const loop = createLoop(stage, (dt, clock, calm) => {
    shown.clock = clock;
    const paused = steps.get().paused;
    if (!paused && !calm && clock >= shown.holdUntil && clock - shown.stepAt >= DWELL[steps.get().index]) {
      if (steps.get().index < LAST) steps.next();
      else steps.reset();
      shown.stepAt = clock;
      shown.focus = null;
      if (steps.get().index === PISTES_AT) shown.pisteAt = clock + 1.6; // laisse la répartition se poser avant la première piste
      sync();
    }
    const moving = steps.tick(dt, calm);
    const running = !paused && !calm;
    draw(steps.get().position, running);
    return running || moving;
  });

  function sync() {
    const s = steps.get();
    root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => b.toggleAttribute("data-current", Number(b.dataset.step) === s.index));
    root.querySelectorAll<HTMLButtonElement>("[data-piste]").forEach((b) => b.setAttribute("aria-pressed", String(shown.focus === Number(b.dataset.piste))));
    const pause = root.querySelector("[data-pause]");
    if (pause) { pause.textContent = s.paused ? "Reprendre" : "Pause"; pause.setAttribute("aria-pressed", String(s.paused)); }
    announce(`${STATE_LABEL[s.id]} · ${vision.readout(shown.focus)}`);
    loop.kick();
  }
  const go = (i: number) => { steps.select(Math.max(0, Math.min(LAST, i))); if (steps.get().index !== PISTES_AT) shown.focus = null; };
  const pick = (i: number) => {
    shown.focus = i;
    if (steps.get().index !== PISTES_AT) steps.select(PISTES_AT);
    announce(`${vision.inspect(i)} · ${NEEDS.length} besoins réels à l'origine`);
  };
  const handlers: [EventTarget | null, string, EventListener][] = [];
  const listen = (el: EventTarget | null, type: string, fn: EventListener) => { el?.addEventListener(type, fn); handlers.push([el, type, fn]); };
  const act = (fn: () => void) => () => { shown.holdUntil = shown.clock + 15; shown.stepAt = shown.clock; fn(); sync(); };

  root.querySelectorAll("[data-step]").forEach((b) => listen(b, "click", act(() => go(Number((b as HTMLElement).dataset.step)))));
  root.querySelectorAll("[data-piste]").forEach((b) => listen(b, "click", act(() => pick(Number((b as HTMLElement).dataset.piste)))));
  listen(root.querySelector("[data-next]"), "click", act(() => go(steps.get().index + 1)));
  listen(root.querySelector("[data-prev]"), "click", act(() => go(steps.get().index - 1)));
  listen(root.querySelector("[data-pause]"), "click", act(() => steps.pause()));
  listen(root.querySelector("[data-reset]"), "click", act(() => { shown.focus = null; steps.reset(); }));
  listen(svg, "click", ((e: Event) => {
    const d = (e.target as Element).closest("[data-dome]") as HTMLElement | null;
    if (d) act(() => pick(Number(d.dataset.dome)))();
  }) as EventListener);
  listen(stage, "keydown", ((e: KeyboardEvent) => {
    const keys: Record<string, () => void> = { ArrowRight: () => go(steps.get().index + 1), ArrowLeft: () => go(steps.get().index - 1), " ": () => steps.pause(), Home: () => go(0), w: () => pick(0), d: () => pick(1), c: () => pick(2) };
    const fn = keys[e.key] ?? (/^[1-4]$/.test(e.key) ? () => go(Number(e.key) - 1) : null);
    if (!fn) return;
    e.preventDefault();
    act(fn)();
  }) as EventListener);

  sync();
  draw(0, false);
  return () => { loop.destroy(); for (const [el, type, fn] of handlers) el?.removeEventListener(type, fn); };
}
