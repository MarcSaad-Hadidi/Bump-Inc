// Animation du classeur, en boucle : 1 une fiche de tâche s'allume sur le bureau ; 2 les tiroirs
// autorisés s'ouvrent et leurs fiches volent vers l'assistant, le tiroir verrouillé clignote et reste
// fermé ; 3 la synthèse s'écrit, reliée par des fils aux trois sources ; 4 le tampon descend : validé.
import { iso, translateAlong } from "../kit/iso-kit";
import { windowOf } from "../shared/runtime";
import { loopSteps } from "../shared/step-loop";
import { createAssistant, STATES, STATE_LABEL } from "./model";

type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };
type V3 = [number, number, number];
type Data = { P: Proj; open: { c: number; j: number; from: V3 }[]; ai: V3; sheet: V3; tops: V3[]; check: V3 };

const DWELL = [3.4, 5, 4.6, 5];

export function mount(root: HTMLElement, data: Data): () => void {
  const { P } = data;
  const svg = root.querySelector(".iso-stage svg") as SVGSVGElement;
  const one = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
  const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const fade = (el: Element, o: number) => ((el as SVGElement).style.opacity = String(Math.round(o * 1000) / 1000));
  const drawers = data.open.map(({ c, j }) => one<SVGGElement>(`[data-drawer="${c}.${j}"]`));
  const docs = all<SVGGElement>("[data-doc]");
  const lines = all<SVGPathElement>("[data-line]");
  const threads = all<SVGPathElement>("[data-thread]");
  const lock = one<SVGPathElement>("[data-lock]");
  const lockRing = one<SVGCircleElement>("[data-lockring]");
  const task = one<SVGGElement>("[data-task]");
  const ai = one<SVGPathElement>("[data-ai]");
  const stamp = one<SVGGElement>("[data-stamp]");
  const check = one<SVGPathElement>("[data-check]");
  const aiAt = iso(data.ai, P);
  const sheetAt = iso(data.sheet, P);
  const [cx, cy] = iso(data.check, P);
  check.setAttribute("d", `M${(cx - 7).toFixed(1)} ${cy.toFixed(1)}l5 5l11-12`);
  threads.forEach((el, c) => { const [tx, ty] = iso(data.tops[c], P); el.setAttribute("d", `M${sheetAt[0].toFixed(1)} ${sheetAt[1].toFixed(1)}Q${((sheetAt[0] + tx) / 2).toFixed(1)} ${(Math.min(sheetAt[1], ty) - 40).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`); });
  const assistant = createAssistant();

  const scene = {
    draw(i: number, since: number, running: boolean, clock: number) {
      const final = !running;
      // Tiroirs : fermés, puis ouverts à l'étape 2 (un à un), refermés après la synthèse.
      drawers.forEach((el, n) => {
        const open = i === 1 ? (final ? 1 : windowOf(since, 0.2 + n * 0.3, 0.7 + n * 0.3)) : i === 2 ? 1 - (final ? 1 : windowOf(since, 2.6, 3.4)) : 0;
        el.setAttribute("transform", open < 1 ? translateAlong(P, [0, -16 * (1 - open), 0]) : "");
        fade(el, open > 0.02 ? 1 : 0); // fermé : la façade dessinée sur le meuble suffit
      });
      // Fiches : volent des tiroirs ouverts vers l'assistant.
      docs.forEach((el, n) => {
        const src = data.open[n % data.open.length];
        const t = i === 1 && running ? windowOf(since, 0.9 + n * 0.55, 1.9 + n * 0.55) : 0;
        const [fx, fy] = iso(src.from, P);
        const x = fx + (aiAt[0] - fx) * t, y = fy + (aiAt[1] - fy) * t - Math.sin(Math.PI * t) * 40;
        el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        fade(el, t > 0 && t < 1 ? 1 : 0);
      });
      // Tiroir verrouillé : clignote rouge pendant la collecte, et reste fermé.
      lock.dataset.on = i === 1 ? (final || Math.floor(clock * 3) % 2 ? "red" : "") : "red";
      fade(lockRing, i === 1 ? 1 : 0);
      // Tâche, assistant, synthèse.
      fade(task, 1);
      task.querySelector(".iso-solid")?.toggleAttribute("data-lit", i === 0);
      ai.dataset.on = i === 1 || i === 2 ? (Math.floor(clock * 4) % 2 ? "amber" : "white") : i === 3 ? "green" : "";
      const writing = i === 2 ? (final ? 1 : windowOf(since, 0.2, 2.2)) : i === 3 ? 1 : 0;
      lines.forEach((el, n) => fade(el, writing * lines.length > n ? 1 : 0));
      threads.forEach((el, c) => fade(el, i === 2 ? (final ? 1 : windowOf(since, 1.2 + c * 0.4, 1.7 + c * 0.4)) : 0));
      // Décision : le tampon descend sur la synthèse, une coche verte apparaît.
      const press = i === 3 ? (final ? 1 : windowOf(since, 0.6, 1.2)) : 0;
      const lift = i === 3 && !final && since > 1.2 ? windowOf(since, 1.5, 2.1) * 12 : 0;
      stamp.setAttribute("transform", translateAlong(P, [0, 0, 18 * (1 - press) + lift]));
      fade(stamp, i === 3 ? 1 : 0);
      fade(check, i === 3 && (final || since > 1.3) ? 1 : 0);
    },
    readout: (i: number) => assistant.readout(i),
  };
  return loopSteps(root, assistant.steps, STATES, STATE_LABEL, DWELL, scene);
}
