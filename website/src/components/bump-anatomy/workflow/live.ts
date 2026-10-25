// Planche de flux : les billes parcourent les tubes selon la position continue (0..5) ;
// une carte s'allume quand la demande l'atteint. Reculer rejoue les mêmes trajets.
import { translateAlong } from "../kit/iso-kit";
import { windowOf, createLoop, readoutOf, announcerOf } from "../shared/runtime";
import { createWorkflow, CARDS, KIND_LABEL, STATE_LABEL, STATES, type Kind } from "./model";

type Data = { P: { origin: [number, number]; scale: number; azimuth: number; elevation: number }; paths: Record<string, [number, number, number][]> };

/** Quelle trajectoire avance dans quelle transition, et quelles cartes elle allume en arrivant. */
const LEGS: { into: number; paths: string[]; reach: string[]; routes: string[] }[] = [
  { into: 1, paths: ["p0"], reach: ["task"], routes: ["r0"] },
  { into: 2, paths: ["p1a", "p1b", "p1c"], reach: ["a", "b", "c"], routes: ["r1", "r2a", "r2b", "r2c"] },
  { into: 3, paths: ["p2a", "p2b", "p2c"], reach: ["human"], routes: ["r3a", "r3b", "r3c", "r4"] },
  { into: 4, paths: ["p3"], reach: ["out"], routes: ["r5"] },
];

export function mount(root: HTMLElement, data: Data): () => void {
  const P = data.P;
  const stage = root.querySelector(".iso-stage") as HTMLElement;
  const svg = stage.querySelector("svg") as SVGSVGElement;
  const items = svg.querySelector('[data-part="items"]') as SVGGElement;
  const slots = Array.from(items.querySelectorAll<SVGGElement>(":scope > [data-i]"));
  const beads = Object.fromEntries(Array.from(svg.querySelectorAll<SVGGElement>("[data-bead]")).map((g) => [g.dataset.bead!, g]));
  const cards = Object.fromEntries(Array.from(svg.querySelectorAll<SVGGElement>("[data-card]")).map((g) => [g.dataset.card!, g.querySelector(".iso-solid") as SVGGElement]));
  const lamps = Object.fromEntries(Array.from(svg.querySelectorAll<SVGPathElement>("[data-lamp]")).map((g) => [g.dataset.lamp!, g]));
  const routeEls = Array.from(svg.querySelectorAll<SVGGElement>("[data-route]"));
  const check = svg.querySelector('[data-part="check"]') as SVGPathElement;
  const btn = { ok: svg.querySelector('[data-btn="ok"]') as SVGGElement, no: svg.querySelector('[data-btn="no"]') as SVGGElement };
  const say = readoutOf(root);
  const announce = announcerOf(root);
  const kindSelect = root.querySelector("[data-kind]") as HTMLSelectElement;

  const flow = createWorkflow((kindSelect?.value as Kind) ?? "devis");
  const { steps } = flow;
  const anim = { clock: 0, pressOk: -9, pressNo: -9, touched: false, tourAt: -1, tourStep: 0, slot: {} as Record<string, number> };

  function setTexts() {
    const t = CARDS[flow.state.kind]; // textes : model.ts est la seule source
    svg.querySelectorAll<SVGTextElement>("[data-t]").forEach((el) => { const [id, line] = el.dataset.t!.split("-"); el.textContent = t[id][Number(line)]; });
  }

  function draw() {
    const p = steps.get().position;
    const reached = new Set<string>(["client"]);
    const energized = new Set<string>();
    for (const leg of LEGS) {
      const u = windowOf(p - (leg.into - 1), 0.08, 0.88);
      for (const name of leg.paths) {
        const pts = data.paths[name];
        const g = beads[name];
        const moving = u > 0 && u < 1;
        g.style.display = moving ? "" : "none";
        if (!moving) continue;
        const [x, y, slot] = pts[Math.round(u * (pts.length - 1))];
        g.setAttribute("transform", `translate(${x} ${y})`);
        if (slot !== anim.slot[name]) { items.insertBefore(g, slots[slot] ?? null); anim.slot[name] = slot; }
      }
      if (u > 0.02) leg.routes.forEach((r) => energized.add(r));
      if (u >= 1) leg.reach.forEach((c) => reached.add(c));
    }
    routeEls.forEach((g) => g.toggleAttribute("data-on", energized.has(g.dataset.route!)));
    const index = steps.get().index;
    for (const [id, solid] of Object.entries(cards)) {
      solid.toggleAttribute("data-lit", reached.has(id));
      const waiting = id === "human" && reached.has("human") && index === 3 && flow.state.decision !== "accept";
      lamps[id].dataset.on = waiting ? "amber" : reached.has(id) ? "green" : "";
    }
    if (anim.clock - anim.pressNo < 1.2) lamps.human.dataset.on = "red";
    check.style.opacity = String(windowOf(p - 4, 0.3, 1));
    const press = (at: number) => { const age = anim.clock - at; return age < 0.12 ? age / 0.12 : age < 0.35 ? 1 : Math.max(0, 1 - (age - 0.35) / 0.2); };
    btn.ok.setAttribute("transform", translateAlong(P, [0, 0, -1.2 * press(anim.pressOk)]));
    btn.no.setAttribute("transform", translateAlong(P, [0, 0, -1.2 * press(anim.pressNo)]));
    const s = steps.get();
    say(s.paused ? `${flow.readout()} · pause` : Math.abs(p - s.index) > 0.05 ? `${KIND_LABEL[flow.state.kind]} · → ${STATE_LABEL[STATES[s.index]]}` : flow.readout());
    return Math.abs(p - s.index) > 0 || anim.clock - Math.max(anim.pressOk, anim.pressNo) < 1.3;
  }

  const TOUR: [number, () => void][] = [[0.8, () => steps.next()], [3.2, () => steps.next()], [5.8, () => steps.next()], [8.8, () => accept()], [11.4, () => steps.next()]];
  const loop = createLoop(stage, (dt, clock, calm) => {
    anim.clock = clock;
    if (steps.get().paused) { draw(); return false; }
    if (anim.tourAt < 0 && !anim.touched && !calm) anim.tourAt = clock;
    let touring = false;
    if (!anim.touched && anim.tourAt >= 0) {
      const age = clock - anim.tourAt;
      while (anim.tourStep < TOUR.length && age >= TOUR[anim.tourStep][0]) TOUR[anim.tourStep++][1](), sync();
      touring = anim.tourStep < TOUR.length;
    }
    steps.tick(dt, calm);
    return draw() || touring;
  });

  function accept() { if (steps.get().id !== "validation") return; anim.pressOk = anim.clock; if (flow.accept()) announce("approuvé : envoi au client"); }
  function refuse() { if (steps.get().id !== "validation") return; anim.pressNo = anim.clock; if (flow.refuse()) announce("refusé : retour aux tâches pour une nouvelle version"); }
  function insert() { flow.insert(kindSelect.value as Kind); setTexts(); }
  function sync() {
    const s = steps.get();
    root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) => b.toggleAttribute("data-current", Number(b.dataset.step) === s.index));
    root.querySelectorAll<HTMLButtonElement>("[data-accept],[data-refuse]").forEach((b) => (b.disabled = s.id !== "validation"));
    const pause = root.querySelector("[data-pause]");
    if (pause) { pause.textContent = s.paused ? "Reprendre" : "Pause"; pause.setAttribute("aria-pressed", String(s.paused)); }
    announce(`${KIND_LABEL[flow.state.kind]} : ${STATE_LABEL[s.id]}`);
    loop.kick();
  }
  const handlers: [Element | null, string, EventListener][] = [];
  const listen = (el: Element | null, type: string, fn: EventListener) => { el?.addEventListener(type, fn); handlers.push([el, type, fn]); };
  const act = (fn: () => void) => () => { anim.touched = true; fn(); sync(); };
  listen(root.querySelector("[data-insert]"), "click", act(insert));
  listen(kindSelect, "change", act(insert));
  listen(root.querySelector("[data-next]"), "click", act(() => steps.next()));
  listen(root.querySelector("[data-prev]"), "click", act(() => steps.prev()));
  listen(root.querySelector("[data-accept]"), "click", act(accept));
  listen(root.querySelector("[data-refuse]"), "click", act(refuse));
  listen(root.querySelector("[data-pause]"), "click", act(() => steps.pause()));
  listen(root.querySelector("[data-replay]"), "click", act(() => steps.replay()));
  listen(root.querySelector("[data-reset]"), "click", act(insert));
  root.querySelectorAll("[data-step]").forEach((b) => listen(b, "click", act(() => steps.select(Number((b as HTMLElement).dataset.step)))));
  listen(svg, "click", ((e: Event) => { const b = (e.target as Element).closest("[data-btn]") as HTMLElement | null; if (b) act(b.dataset.btn === "ok" ? accept : refuse)(); }) as EventListener);
  listen(stage, "keydown", ((e: KeyboardEvent) => {
    const keys: Record<string, () => void> = { ArrowRight: () => steps.next(), ArrowLeft: () => steps.prev(), a: accept, A: accept, r: refuse, R: refuse, " ": () => steps.pause(), Home: insert, Enter: () => steps.next() };
    const fn = keys[e.key] ?? (/^[1-6]$/.test(e.key) ? () => steps.select(Number(e.key) - 1) : null);
    if (!fn) return;
    e.preventDefault();
    act(fn)();
  }) as EventListener);

  setTexts();
  sync();
  draw();
  return () => { loop.destroy(); for (const [el, type, fn] of handlers) el?.removeEventListener(type, fn); };
}
