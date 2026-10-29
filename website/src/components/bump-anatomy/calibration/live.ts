// Animation du laboratoire. Tout dérive de la position continue (0..4). La démonstration tourne en
// boucle (audit → maintenance, puis retour à l'audit) tant que la figure est visible ; un geste de la
// personne la suspend 15 s. Le bras, le contrepoids et la cloche suivent la position.
import { translateAlong, segment, slabOf, extrude, cylinder, ring, iso, pathOf } from "../kit/iso-kit";
import { windowOf, createLoop, readoutOf, announcerOf, lerpN } from "../shared/runtime";
import { createLab, STATES, STATE_LABEL, SETTINGS, BEST, MEASURED, type SettingId } from "./model";

type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };
type V3 = [number, number, number];
type Data = {
  P: Proj; rotor: { c: [number, number]; disc: number; mass: number; top: number }; bell: { r: number; z0: number; z1: number; lift: number };
  column: [number, number]; boom: { z0: number; z1: number; half: number }; park: { phi: number; len: number; z: number };
  cw: { rest: [number, number]; r: number; h: number; z: number }; knobs: number[]; knobZ: number; face: number;
  meter: { x: number; z: number; r: number }; screen: { x0: number; x1: number; z0: number; z1: number };
  printer: { x: number; y: number; top: number }; logs: number;
};

const SPIN = 2.6; // rad/s
const LAST = STATES.length - 1;
const PROPOSITION = STATES.indexOf("proposition");

export function mount(root: HTMLElement, data: Data): () => void {
  const { P } = data;
  const stage = root.querySelector(".iso-stage") as HTMLElement;
  const svg = stage.querySelector("svg") as SVGSVGElement;
  const one = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
  const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const part = <T extends Element>(name: string) => one<T>(`[data-part="${name}"]`);
  const solidOf = (name: string) => {
    const g = one(`[data-s="${name}"]`);
    return { fill: g.querySelector(".iso-fill")!, top: g.querySelector(".iso-top")!, crease: g.querySelector(".iso-crease")!, edge: g.querySelector(".iso-edge")!, shades: Array.from(g.querySelectorAll(".iso-shade")) };
  };
  type Paths = { fill: string; top: string; crease: string; outline: string; shades: string[] };
  const setSolid = (s: ReturnType<typeof solidOf>, p: Paths) => {
    s.fill.setAttribute("d", p.fill); s.top.setAttribute("d", p.top); s.crease.setAttribute("d", p.crease); s.edge.setAttribute("d", p.outline);
    s.shades.forEach((el, i) => el.setAttribute("d", p.shades[i] ?? ""));
  };
  const solids = { mass: solidOf("mass"), cw: solidOf("cw"), boom: solidOf("boom"), probe: solidOf("probe"), tip: solidOf("tip"), paper: solidOf("paper") };
  const cwGroup = solids.cw.fill.closest("[data-i]") as SVGGElement;
  const knobMarks = all<SVGPathElement>("[data-knob-mark]");
  const knobLamps = all<SVGPathElement>("[data-knob-lamp]");
  const stepLamps = all<SVGPathElement>("[data-step-lamp]");
  const logs = all<SVGTextElement>("[data-log]");
  const say = readoutOf(root);
  const announce = announcerOf(root);

  const lab = createLab();
  const { steps } = lab;
  const [rx, ry] = data.rotor.c;
  const [cx, cy] = data.column;
  const shown = { p: 0, theta: 0.6, clock: 0, mt: 0, manual: null as SettingId | null, stepAt: 0, holdUntil: 0 };

  /** Vitesse du rotor : ralentit pendant l'analyse, s'arrête pour l'intervention, repart ensuite. */
  const speedAt = (p: number) => lerpN(lerpN(lerpN(1, 0.35, windowOf(p, 0.2, 0.5)), 0, windowOf(p, 1.85, 2)), 1, windowOf(p, 2.8, 3.05));
  /** Réglage essayé pendant la proposition : A, B puis C, ou celui que la personne a choisi. */
  const trialAt = (p: number): SettingId | null => {
    if (shown.manual && steps.get().index === PROPOSITION) return shown.manual;
    if (p < 1.05 || p >= 2) return null;
    return p < 1.35 ? "A" : p < 1.65 ? "B" : "C";
  };
  const mix = (a: V3, b: V3, t: number): V3 => [lerpN(a[0], b[0], t), lerpN(a[1], b[1], t), lerpN(a[2], b[2], t)];
  /** Pointe de la sonde le long du parcours ; renvoie aussi si elle porte le contrepoids. */
  function tipAt(p: number, target: [number, number]): { tip: V3; carry: boolean } {
    const park: V3 = [cx + data.park.len * Math.cos(data.park.phi), cy + data.park.len * Math.sin(data.park.phi), data.park.z];
    const hover: V3 = [rx + 14, ry - 8, 46];
    const above = (x: number, y: number, z: number): V3 => [x, y, z];
    const keys: [number, V3][] = [
      [0.45, park], [0.75, hover], [1.6, hover], [1.9, park], [2.0, park],
      [2.2, above(...data.cw.rest, 26)], [2.27, above(...data.cw.rest, data.cw.z + data.cw.h)], [2.38, above(...data.cw.rest, 26)],
      [2.58, above(...target, 46)], [2.66, above(...target, data.rotor.top + data.cw.h)], [2.76, above(...target, 46)], [2.95, park],
    ];
    let tip = park;
    if (p > keys[0][0]) {
      tip = keys[keys.length - 1][1];
      for (let i = 1; i < keys.length; i++) if (p < keys[i][0]) { tip = mix(keys[i - 1][1], keys[i][1], windowOf(p, keys[i - 1][0], keys[i][0])); break; }
    }
    return { tip, carry: p >= 2.27 && p < 2.66 };
  }

  function draw(p: number, dt: number, running: boolean) {
    if (running) shown.theta += dt * SPIN * speedAt(p);
    shown.mt = p >= 3.5 ? shown.mt + (running ? dt : 0) : 0;
    const th = shown.theta;
    const attached = p >= 2.66;
    const phase = (shown.mt % 9) / 9;
    const drift = p >= 3.5 ? windowOf(phase, 0.2, 0.5) * (1 - windowOf(phase, 0.62, 0.72)) : 0;
    const correcting = p >= 3.5 && phase > 0.5 && phase < 0.68;
    const trial = trialAt(p);
    const vib = trial ? SETTINGS.find((s) => s.id === trial)!.vibration : attached ? SETTINGS.find((s) => s.id === BEST)!.vibration + drift * 0.8 : MEASURED;
    const spin = speedAt(p);

    // Rotor : rayons, masse mal placée, tremblement tant qu'il est déséquilibré.
    const wob = (attached ? drift * 0.5 : 1) * spin;
    const jitter = running && wob > 0.01 ? `translate(${(Math.sin(shown.clock * 31) * 1.3 * wob).toFixed(2)} ${(Math.cos(shown.clock * 27) * 0.9 * wob).toFixed(2)})` : "";
    part("rotor").setAttribute("transform", jitter);
    part("spokes").setAttribute("d", Array.from({ length: 6 }, (_, j) => { const a = th + (j * Math.PI) / 3; return segment([rx + 5 * Math.cos(a), ry + 5 * Math.sin(a), data.rotor.top], [rx + (data.rotor.disc - 3) * Math.cos(a), ry + (data.rotor.disc - 3) * Math.sin(a), data.rotor.top], P); }).join(""));
    const mass: [number, number] = [rx + data.rotor.mass * Math.cos(th), ry + data.rotor.mass * Math.sin(th)];
    setSolid(solids.mass, cylinder(mass[0], mass[1], data.cw.r, data.rotor.top, data.cw.h, P, 20));
    const spotted = windowOf(p, 0.7, 0.85) * (1 - windowOf(p, 2.5, 2.7));
    part("mass-lamp").setAttribute("d", spotted > 0.01 ? ring(mass[0], mass[1], data.cw.r + 2.2, data.rotor.top + 0.2, P, 24) : "");
    (part("mass-lamp") as SVGElement).style.stroke = p > 0.85 ? "#c4543a" : "#cf7a25";

    // Bras de sonde : analyse au-dessus du rotor, puis transport du contrepoids.
    const target: [number, number] = [rx + data.rotor.mass * Math.cos(th + Math.PI), ry + data.rotor.mass * Math.sin(th + Math.PI)];
    const { tip, carry } = tipAt(p, target);
    const phi = Math.atan2(tip[1] - cy, tip[0] - cx), len = Math.hypot(tip[0] - cx, tip[1] - cy);
    const c = Math.cos(phi), s = Math.sin(phi), h = data.boom.half;
    setSolid(solids.boom, extrude([[-4, -h], [len, -h], [len, h], [-4, h]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]), data.boom.z0, data.boom.z1 - data.boom.z0, P));
    setSolid(solids.probe, slabOf({ x: tip[0] - 1, y: tip[1] - 1, w: 2, d: 2, r: 0.3 }, tip[2] + 3, data.boom.z0 - tip[2] - 3, P, 2));
    setSolid(solids.tip, cylinder(tip[0], tip[1], 2.4, tip[2], 3, P, 16));
    const laser = windowOf(p, 0.72, 0.8) * (1 - windowOf(p, 1.55, 1.6));
    part("laser").setAttribute("d", laser > 0.01 ? segment(tip, [mass[0], mass[1], data.rotor.top + data.cw.h], P) : "");

    // Contrepoids : sur son plateau, porté par la sonde, puis posé à l'opposé de la masse.
    const cwAt: V3 = carry ? [tip[0], tip[1], tip[2] - data.cw.h] : attached ? [...target, data.rotor.top] : [...data.cw.rest, data.cw.z];
    setSolid(solids.cw, cylinder(cwAt[0], cwAt[1], data.cw.r, cwAt[2], data.cw.h, P, 20));
    cwGroup.setAttribute("transform", attached ? jitter : "");

    // Cloche : levée pendant l'analyse et l'intervention.
    const lift = data.bell.lift * windowOf(p, 0.15, 0.45) * (1 - windowOf(p, 2.85, 3));
    for (const layer of ["bell-back", "bell-front"]) part(layer).setAttribute("transform", lift > 0.01 ? translateAlong(P, [0, 0, lift]) : "");

    // Baie : oscilloscope, vibromètre, molettes.
    const { x0, x1, z0, z1 } = data.screen;
    const mid = (z0 + z1) / 2, amp = Math.min(1, vib / 3.4);
    const wave = Array.from({ length: 49 }, (_, i) => {
      const u = i / 48;
      const sig = Math.sin(u * Math.PI * 4 - shown.clock * 5) * 0.35 * (0.3 + spin * 0.7);
      const noise = (Math.sin(u * 41 + shown.clock * 13) * 0.6 + Math.sin(u * 97 - shown.clock * 7) * 0.4) * amp * 0.6;
      return iso([lerpN(x0 + 3, x1 - 3, u), data.face + 1.1, mid + (sig + noise) * (z1 - z0) * 0.42], P) as [number, number];
    });
    part("wave").setAttribute("d", pathOf(wave));
    (part("wave") as SVGElement).style.stroke = vib <= 1 ? "#7fe0a6" : vib <= 1.5 ? "#f3c08a" : "#f08a6a";
    const na = -1.05 + Math.min(1, vib / 4) * 2.1;
    const { x: mx, z: mz, r: mr } = data.meter;
    part("meter-needle").setAttribute("d", segment([mx, data.face + 1.3, mz], [mx + (mr - 1.5) * Math.sin(na), data.face + 1.3, mz + (mr - 1.5) * Math.cos(na)], P));
    SETTINGS.forEach((st, j) => {
      const chosen = p >= 1.85 && st.id === BEST;
      const turned = trial === st.id || chosen;
      const a = (turned ? 0.7 : -0.7) + (correcting && st.id === BEST ? Math.sin(shown.clock * 9) * 0.5 : 0);
      const x = data.knobs[j];
      knobMarks[j].setAttribute("d", segment([x + 1.2 * Math.sin(a), data.face + 4.05, data.knobZ + 1.2 * Math.cos(a)], [x + 5 * Math.sin(a), data.face + 4.05, data.knobZ + 5 * Math.cos(a)], P));
      knobLamps[j].dataset.on = trial === st.id ? (st.id === BEST ? "green" : "amber") : chosen ? (correcting ? "amber" : "green") : "";
    });

    // Journal et panneau d'étapes.
    const count = p < 2.9 ? 0 : p < 3.5 ? 1 : Math.min(data.logs, 1 + Math.floor(shown.mt / 3));
    setSolid(solids.paper, slabOf({ x: data.printer.x + 10, y: data.printer.y + 6, w: 30, d: 0.6 + count * 5, r: 0.3 }, data.printer.top, 0.4, P, 2));
    logs.forEach((el, i) => (el.style.opacity = i < count ? "" : "0"));
    const idx = Math.round(p);
    stepLamps.forEach((el, j) => (el.dataset.on = j < idx ? "green" : j === idx ? (j === LAST ? "green" : "amber") : ""));

    const st = steps.get();
    const near = Math.abs(p - st.index) < 0.08;
    const text = trial ? `essai ${trial} · ${vib.toFixed(1).replace(".", ",")} mm/s prévu${trial === BEST ? " · retenu" : ""}` : lab.readout();
    say(st.paused ? `${text} · pause` : near ? (correcting ? "dérive détectée · réglage C ajusté" : text) : `→ ${STATE_LABEL[st.id]}`);
  }

  /** Temps passé sur chaque étape avant la suivante ; la maintenance dure plus pour montrer un ajustement. */
  const DWELL = [4.2, 4.8, 5, 5, 11];
  const loop = createLoop(stage, (dt, clock, calm) => {
    shown.clock = clock;
    const paused = steps.get().paused;
    if (!paused && !calm && clock >= shown.holdUntil && clock - shown.stepAt >= DWELL[steps.get().index]) {
      if (steps.get().index < LAST) steps.next();
      else { steps.reset(); shown.mt = 0; }
      shown.stepAt = clock;
      sync();
    }
    const moving = steps.tick(dt, calm);
    shown.p = steps.get().position;
    const running = !paused && !calm;
    draw(shown.p, dt, running);
    return running || moving;
  });

  function sync() {
    const s = steps.get();
    if (s.index !== PROPOSITION) shown.manual = null;
    root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => b.toggleAttribute("data-current", Number(b.dataset.step) === s.index));
    const pause = root.querySelector("[data-pause]");
    if (pause) { pause.textContent = s.paused ? "Reprendre" : "Pause"; pause.setAttribute("aria-pressed", String(s.paused)); }
    announce(`${STATE_LABEL[s.id]} · ${lab.readout()}`);
    loop.kick();
  }
  const go = (i: number) => steps.select(Math.max(0, Math.min(LAST, i)));
  const handlers: [EventTarget | null, string, EventListener][] = [];
  const listen = (el: EventTarget | null, type: string, fn: EventListener, opts?: AddEventListenerOptions) => { el?.addEventListener(type, fn, opts); handlers.push([el, type, fn]); };
  const act = (fn: () => void) => () => { shown.holdUntil = shown.clock + 15; shown.stepAt = shown.clock; fn(); sync(); };
  const trialClick = (id: SettingId) => {
    if (!lab.tryTrial(id)) { announce("Les réglages s'essaient à l'étape 03 · Proposition"); return; }
    shown.manual = id;
    announce(lab.readout());
  };

  root.querySelectorAll("[data-step]").forEach((b) => listen(b, "click", act(() => go(Number((b as HTMLElement).dataset.step)))));
  listen(root.querySelector("[data-next]"), "click", act(() => go(steps.get().index + 1)));
  listen(root.querySelector("[data-prev]"), "click", act(() => go(steps.get().index - 1)));
  listen(root.querySelector("[data-pause]"), "click", act(() => steps.pause()));
  listen(root.querySelector("[data-reset]"), "click", act(() => { shown.manual = null; shown.mt = 0; steps.reset(); }));
  listen(svg, "click", ((e: Event) => {
    const k = (e.target as Element).closest("[data-knob]") as HTMLElement | null;
    if (k) act(() => trialClick(k.dataset.knob as SettingId))();
  }) as EventListener);
  listen(stage, "keydown", ((e: KeyboardEvent) => {
    const keys: Record<string, () => void> = { ArrowRight: () => go(steps.get().index + 1), ArrowLeft: () => go(steps.get().index - 1), " ": () => steps.pause(), Home: () => go(0), a: () => trialClick("A"), b: () => trialClick("B"), c: () => trialClick("C") };
    const fn = keys[e.key] ?? (/^[1-5]$/.test(e.key) ? () => go(Number(e.key) - 1) : null);
    if (!fn) return;
    e.preventDefault();
    act(fn)();
  }) as EventListener);

  sync();
  draw(0, 0, false);
  return () => { loop.destroy(); for (const [el, type, fn] of handlers) el?.removeEventListener(type, fn); };
}
