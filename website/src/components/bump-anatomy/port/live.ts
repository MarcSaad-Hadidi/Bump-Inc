// Animation du port, en boucle tant que la figure est visible ; un geste la suspend 15 s.
// 1 le navire arrive vide par la gauche, les remorqueurs le rejoignent, l'entrepôt s'ouvre ;
// 2 l'ancre descend ; 3 le chenal et le phare s'allument ; 4 six conteneurs en trois couleurs
// passent du quai au pont ; 5 la capitainerie s'allume et le navire repart chargé vers la droite,
// sort du bassin et revient par la gauche au tour suivant.
import { translateAlong, segment, iso, ring } from "../kit/iso-kit";
import { windowOf, createLoop, readoutOf, announcerOf } from "../shared/runtime";
import { createPort, STATES, STATE_LABEL, CARGO } from "./model";

type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };
type V3 = [number, number, number];
type Data = { P: Proj; hawse: V3; waterZ: number; lane: { enter: number; exit: number }; tugs: { at: [number, number]; wait: [number, number] }[]; cargo: V3[]; light: V3; stern: V3 };

const LAST = STATES.length - 1;
const LOAD = STATES.indexOf("besoin");
const DWELL = [5.5, 3.5, 4, 6.5, 6];
/** Départ de chaque conteneur pendant le chargement (s après le début de l'étape 4). */
const loadStart = (j: number) => 0.9 + j * 0.85; // après la fin du passage à l'étape
const LIFT = 26; // hauteur de l'arc du quai au pont

export function mount(root: HTMLElement, data: Data): () => void {
  const { P } = data;
  const stage = root.querySelector(".iso-stage") as HTMLElement;
  const svg = stage.querySelector("svg") as SVGSVGElement;
  const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const one = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
  const shipParts = all<SVGGElement>("[data-ship]");
  const cargoParts = data.cargo.map((_, j) => one<SVGGElement>(`[data-cargo="${j}"]`));
  const tugParts = data.tugs.map((_, i) => all<SVGGElement>(`[data-tug="${i}"]`));
  const shell = one<SVGGElement>("[data-shell]");
  const route = one<SVGGElement>('[data-part="route"]');
  const lantern = one<SVGPathElement>('[data-part="lantern"]');
  const beam = one<SVGPathElement>('[data-part="beam"]');
  const buoys = all<SVGPathElement>("[data-buoy]");
  const wins = all<SVGPathElement>("[data-win]");
  const tableLamp = one<SVGPathElement>('[data-part="table-lamp"]');
  const moor = one<SVGGElement>('[data-part="moor"]');
  const chain = one<SVGPathElement>("[data-chain]");
  const anchorGlyph = one<SVGGElement>("[data-anchor]");
  const swirl = one<SVGPathElement>("[data-swirl]");
  const plaqueLamps = all<SVGPathElement>("[data-plaque-lamp]");
  const wake = all<SVGPathElement>("[data-wake]");
  const stepLamps = all<SVGPathElement>("[data-step-lamp]");
  const say = readoutOf(root);
  const announce = announcerOf(root);

  const port = createPort();
  const { steps } = port;
  const shown = { clock: 0, stepAt: 0, holdUntil: 0, focus: null as number | null, returning: false };
  const move = (els: Element[], by: V3) => { const t = by[0] || by[1] || by[2] ? translateAlong(P, by) : ""; els.forEach((el) => (t ? el.setAttribute("transform", t) : el.removeAttribute("transform"))); };
  const fade = (el: Element | null, o: number) => { if (el) (el as SVGElement).style.opacity = String(Math.round(o * 1000) / 1000); };

  function draw(running: boolean) {
    const s = steps.get();
    const i = s.index;
    const since = shown.clock - shown.stepAt;
    const t = shown.clock;
    const settled = !running; // sans mouvement : chaque étape dans son état final
    const auto = running && shown.clock >= shown.holdUntil; // la boucle enchaînera seule

    // Navire : entre par la gauche (étape 1), repart par la droite (étape 5).
    const arrive = i > 0 || settled ? 1 : windowOf(since, 0, 3.4);
    const depart = i === LAST ? (settled ? 0.3 : windowOf(since, 1, DWELL[LAST] - 0.1) ** 1.6) : 0;
    const shipX = data.lane.enter * (1 - arrive) + data.lane.exit * depart;
    move(shipParts, [shipX, 0, 0]);
    fade(moor, i === 0 ? windowOf(arrive, 0.97, 1) : i === LAST ? 1 - (settled ? 1 : windowOf(since, 0, 0.8)) : 1);
    const sailing = (i === 0 && arrive < 0.99) || depart > 0.01;
    wake.forEach((el, k) => {
      const [sx, sy, sz] = data.stern;
      const side = k ? 1 : -1;
      el.setAttribute("d", sailing ? segment([sx + shipX, sy + side * 12, sz], [sx + shipX - 46, sy + side * 22, sz], P) : "");
      fade(el, sailing ? 0.9 : 0);
    });

    // Remorqueurs : attendent au large, rejoignent le navire à son arrivée, s'écartent au départ.
    const meet = i === 0 ? (settled ? 1 : windowOf(since, 1.4, 3.6)) : i === LAST ? 1 - (settled ? 1 : windowOf(since, 0.2, 1.6)) : 1;
    data.tugs.forEach((tug, k) => move(tugParts[k], [(tug.wait[0] - tug.at[0]) * (1 - meet), (tug.wait[1] - tug.at[1]) * (1 - meet), 0]));

    // Entrepôt de la PME : la coque s'efface une fois le navire à quai.
    fade(shell, 1 - 0.9 * (i === 0 ? (settled ? 1 : windowOf(since, 3.2, 4.3)) : 0));

    // Ancre : descend à l'étape 2, reste au fond, remonte au départ.
    const drop = i === 1 ? (settled ? 1 : windowOf(since, 0.3, 1.8)) : i === 2 || i === 3 ? 1 : i === LAST ? 1 - (settled ? 1 : windowOf(since, 0, 0.9)) : 0;
    const [hx, hy, hz] = data.hawse;
    const az = hz - (hz - data.waterZ - 2) * drop;
    const [ax, ay] = iso([hx + shipX, hy, az], P);
    anchorGlyph.setAttribute("transform", `translate(${ax.toFixed(1)} ${ay.toFixed(1)})`);
    chain.setAttribute("d", drop > 0.02 ? segment([hx + shipX, hy, hz], [hx + shipX, hy, az], P) : "");
    swirl.setAttribute("d", drop > 0.9 ? ring(hx + shipX, hy + 3, 4 + 3 * Math.sin(t * 2) ** 2, data.waterZ, P, 24) : "");
    plaqueLamps.forEach((el) => (el.dataset.on = i >= 1 ? "white" : ""));

    // Chenal, bouées et phare : l'horizon s'ouvre à l'étape 3.
    const reach = i >= 2 ? (i === 2 && !settled ? windowOf(since, 0.2, 1.4) : 1) : 0;
    fade(route, reach);
    lantern.dataset.on = reach > 0.5 ? "white" : "";
    buoys.forEach((el, k) => (el.dataset.on = reach > 0.5 && (settled || Math.sin(t * 3 + k * 1.7) > -0.2) ? (k % 2 ? "green" : "red") : ""));
    if (reach > 0.5 && running) {
      const a = Math.PI / 2 + 0.25 + Math.sin(t * 0.9) * 0.45; // balaie le chenal devant le phare
      const [lx, ly, lz] = data.light;
      beam.setAttribute("d", segment([lx + 6 * Math.cos(a), ly + 6 * Math.sin(a), lz], [lx + 95 * Math.cos(a), ly + 95 * Math.sin(a), data.waterZ + 6], P));
      fade(beam, 0.55 * reach);
    } else fade(beam, 0);

    // Chargement : chaque conteneur monte du quai, passe au-dessus de l'eau et se pose à bord.
    let moving: number | null = null;
    data.cargo.forEach(([qx, qy, qz], j) => {
      const l = i < LOAD ? 0 : i > LOAD || settled ? 1 : windowOf(since, loadStart(j), loadStart(j) + 0.9);
      if (l > 0 && l < 1) moving = CARGO[j];
      const lift = Math.sin(Math.PI * l) * LIFT;
      cargoParts[j].setAttribute("transform", translateAlong(P, [qx * (1 - l) + (l >= 1 ? shipX : 0), qy * (1 - l), qz * (1 - l) + lift]));
      const appear = i === 0 && shown.returning && !settled ? windowOf(since, 3.2, 4) : 1;
      const picked = shown.focus === null || shown.focus === CARGO[j] ? 1 : 0.35;
      fade(cargoParts[j], appear * picked);
    });
    const focus = shown.focus ?? (i === LOAD && auto ? moving : null);

    // Capitainerie : on allume, la conversation commence.
    const talk = i === LAST ? (settled ? 1 : windowOf(since, 0, 1.2)) : 0;
    wins.forEach((el, k) => (el.dataset.on = talk > (k % 5) / 6 ? "white" : ""));
    tableLamp.dataset.on = talk > 0.5 ? "amber" : "";

    stepLamps.forEach((el, j) => (el.dataset.on = j < i ? "green" : j === i ? "amber" : ""));
    const near = Math.abs(s.position - i) < 0.3; // le texte suit l'étape sans attendre la fin du glissement
    say(s.paused ? `${port.readout(focus)} · pause` : near ? port.readout(focus) : `→ ${STATE_LABEL[s.id]}`);
  }

  const loop = createLoop(stage, (dt, clock, calm) => {
    shown.clock = clock;
    const paused = steps.get().paused;
    if (!paused && !calm && clock >= shown.holdUntil && clock - shown.stepAt >= DWELL[steps.get().index]) {
      const wasLast = steps.get().index === LAST;
      if (wasLast) steps.reset();
      else steps.next();
      shown.returning = wasLast;
      shown.stepAt = clock;
      shown.focus = null;
      sync();
    }
    const moving = steps.tick(dt, calm);
    const running = !paused && !calm;
    draw(running);
    return running || moving;
  });

  function sync() {
    const s = steps.get();
    root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => b.toggleAttribute("data-current", Number(b.dataset.step) === s.index));
    root.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach((b) => b.setAttribute("aria-pressed", String(shown.focus === Number(b.dataset.pick))));
    const pause = root.querySelector("[data-pause]");
    if (pause) { pause.textContent = s.paused ? "Reprendre" : "Pause"; pause.setAttribute("aria-pressed", String(s.paused)); }
    announce(`${STATE_LABEL[s.id]} · ${port.readout(shown.focus)}`);
    loop.kick();
  }
  const go = (i: number) => { steps.select(Math.max(0, Math.min(LAST, i))); shown.returning = false; shown.focus = null; };
  const pick = (i: number) => { shown.focus = shown.focus === i ? null : i; if (steps.get().index !== LOAD) steps.select(LOAD); };
  const handlers: [EventTarget | null, string, EventListener][] = [];
  const listen = (el: EventTarget | null, type: string, fn: EventListener) => { el?.addEventListener(type, fn); handlers.push([el, type, fn]); };
  // Un geste suspend la boucle 15 s ; l'étape choisie est montrée dans son état final.
  const act = (fn: () => void) => () => { shown.holdUntil = shown.clock + 15; shown.stepAt = shown.clock - 10; fn(); sync(); };

  root.querySelectorAll("[data-step]").forEach((b) => listen(b, "click", act(() => go(Number((b as HTMLElement).dataset.step)))));
  root.querySelectorAll("[data-pick]").forEach((b) => listen(b, "click", act(() => pick(Number((b as HTMLElement).dataset.pick)))));
  listen(root.querySelector("[data-next]"), "click", act(() => go(steps.get().index + 1)));
  listen(root.querySelector("[data-prev]"), "click", act(() => go(steps.get().index - 1)));
  listen(root.querySelector("[data-pause]"), "click", act(() => steps.pause()));
  listen(root.querySelector("[data-reset]"), "click", act(() => go(0)));
  listen(svg, "click", ((e: Event) => {
    const c = (e.target as Element).closest("[data-need]") as HTMLElement | null;
    if (c) act(() => pick(Number(c.dataset.need)))();
  }) as EventListener);
  listen(stage, "keydown", ((e: KeyboardEvent) => {
    const keys: Record<string, () => void> = { ArrowRight: () => go(steps.get().index + 1), ArrowLeft: () => go(steps.get().index - 1), " ": () => steps.pause(), Home: () => go(0), a: () => pick(0), l: () => pick(1), c: () => pick(2) };
    const fn = keys[e.key] ?? (/^[1-5]$/.test(e.key) ? () => go(Number(e.key) - 1) : null);
    if (!fn) return;
    e.preventDefault();
    act(fn)();
  }) as EventListener);

  sync();
  draw(false);
  return () => { loop.destroy(); for (const [el, type, fn] of handlers) el?.removeEventListener(type, fn); };
}
