// Animation du tableau, en boucle : 1 la demande tombe dans « reçue » ; 2 elle passe à « attribuée »
// et un responsable s'y pose ; 3 elle avance à « en cours » ; 4 elle arrive à « terminée » et le CRM
// reçoit la mise à jour (impulsions sur le câble API).
import { translateAlong } from "../kit/iso-kit";
import { windowOf } from "../shared/runtime";
import { loopSteps } from "../shared/step-loop";
import { createBoard, STATES, STATE_LABEL } from "./model";

type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };
type Data = { P: Proj; laneStep: number; api: [[number, number], [number, number]] };

const DWELL = [3.6, 3.6, 3.6, 5];

export function mount(root: HTMLElement, data: Data): () => void {
  const { P } = data;
  const svg = root.querySelector(".iso-stage svg") as SVGSVGElement;
  const one = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
  const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const fade = (el: Element, o: number) => ((el as SVGElement).style.opacity = String(Math.round(o * 1000) / 1000));
  const heroWrap = (one<SVGGElement>("[data-hero]").parentElement as unknown) as SVGGElement;
  const ownerWrap = (one<SVGGElement>("[data-owner]").parentElement as unknown) as SVGGElement;
  const owner = one<SVGGElement>("[data-owner]");
  const lanes = all<SVGGElement>("[data-lane]");
  const crm = one<SVGPathElement>("[data-crm]");
  const api = one<SVGPathElement>("[data-api]");
  const sync = all<SVGCircleElement>("[data-sync]");
  const board = createBoard();
  let lane = 0; // position affichée du ticket (en colonnes, continue)

  const scene = {
    draw(i: number, since: number, running: boolean, clock: number) {
      const final = !running;
      // Le ticket glisse vers sa colonne ; à l'étape 1 il tombe d'en haut.
      const target = i;
      const k = final ? 1 : windowOf(since, 0.2, 1.1);
      const from = i === 0 ? 0 : i - 1;
      lane = from + (target - from) * k;
      const drop = i === 0 && !final ? 30 * (1 - windowOf(since, 0.1, 0.9)) : 0;
      const t = translateAlong(P, [(lane - 3) * data.laneStep, 0, drop]);
      heroWrap.setAttribute("transform", t);
      ownerWrap.setAttribute("transform", t);
      fade(heroWrap, i === 0 && !final ? Math.min(1, since * 3) : 1);
      // Le responsable se pose sur la demande à l'étape 2.
      const own = i === 0 ? 0 : i === 1 && !final ? windowOf(since, 1.1, 1.7) : 1;
      owner.setAttribute("transform", own < 1 ? translateAlong(P, [0, 0, 16 * (1 - own)]) : "");
      fade(owner, own > 0 ? 1 : 0);
      lanes.forEach((el, j) => (el.style.opacity = j === Math.round(lane) ? "1" : "0.75"));
      // Terminée : le CRM est mis à jour.
      const done = i === 3 && (final || since > 1.1);
      crm.dataset.on = done ? "green" : "";
      api.style.stroke = done ? "#4f9e70" : "#7b827d";
      const [[ax, ay], [bx, by]] = data.api;
      sync.forEach((el, n) => {
        const u = (clock * 0.8 + n / sync.length) % 1;
        el.setAttribute("cx", (ax + (bx - ax) * u).toFixed(1));
        el.setAttribute("cy", (ay + (by - ay) * u).toFixed(1));
        fade(el, done && running ? Math.min(1, u * 6, (1 - u) * 6) : 0);
      });
    },
    readout: (i: number) => board.readout(i),
  };
  return loopSteps(root, board.steps, STATES, STATE_LABEL, DWELL, scene);
}
