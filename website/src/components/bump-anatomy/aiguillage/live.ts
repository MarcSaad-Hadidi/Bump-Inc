// Animation de l'aiguillage, en boucle sur les quatre situations : le wagon part du quai, arrive à la
// plaque Bump, le levier bascule et la voie choisie passe en laiton, le wagon y roule jusqu'à la gare,
// qui s'allume.
import { iso, segment, translateAlong } from "../kit/iso-kit";
import { windowOf } from "../shared/runtime";
import { loopSteps } from "../shared/step-loop";
import { createSwitchyard, STATES, STATE_LABEL } from "./model";

type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };
type Pt = [number, number];
type Data = { P: Proj; start: Pt; junction: Pt; ends: Pt[]; pivot: [number, number, number]; cartZ: number };

const DWELL = [4.6, 4.6, 4.6, 4.6];

export function mount(root: HTMLElement, data: Data): () => void {
  const { P } = data;
  const svg = root.querySelector(".iso-stage svg") as SVGSVGElement;
  const one = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
  const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const fade = (el: Element, o: number) => ((el as SVGElement).style.opacity = String(Math.round(o * 1000) / 1000));
  const cartWrap = one<SVGGElement>("[data-cart]").parentElement as unknown as SVGGElement;
  const icons = all<SVGGElement>("[data-icon]");
  const cargo = one<SVGGElement>("[data-cargo]");
  const lever = one<SVGPathElement>("[data-lever]");
  const knob = one<SVGCircleElement>("[data-knob]");
  const lamps = all<SVGPathElement>("[data-station-lamp]");
  const branches = data.ends.map((_, i) => one<SVGGElement>(`[data-track="${i}"] .rail`));
  const inbound = one<SVGGElement>('[data-track="in"] .rail');
  const yard = createSwitchyard();
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  const scene = {
    draw(i: number, since: number, running: boolean) {
      const final = !running;
      const arrive = final ? 1 : windowOf(since, 0.1, 1.3);
      const go = final ? 1 : windowOf(since, 1.7, 3.2);
      const at: Pt = go > 0 ? lerp(data.junction, data.ends[i], go) : lerp(data.start, data.junction, arrive);
      cartWrap.setAttribute("transform", translateAlong(P, [at[0] - data.junction[0], at[1] - data.junction[1], 0]));
      // Pictogramme de la situation, au-dessus du wagon.
      const [sx, sy] = iso([at[0], at[1], data.cartZ], P);
      cargo.setAttribute("transform", `translate(${sx.toFixed(1)} ${(sy - 22).toFixed(1)})`);
      icons.forEach((el, k) => fade(el, k === i ? 1 : 0));
      // Levier : bascule vers la voie choisie quand le wagon approche de Bump.
      const sw = final ? 1 : windowOf(since, 0.8, 1.5);
      const angle = (-45 + i * 30) * sw * (Math.PI / 180);
      const [px, py, pz] = data.pivot;
      lever.setAttribute("d", segment([px, py, pz], [px + 12 * Math.sin(angle), py, pz + 12 * Math.cos(angle)], P));
      const [kx, ky] = iso([px + 12 * Math.sin(angle), py, pz + 12 * Math.cos(angle)], P);
      knob.setAttribute("cx", kx.toFixed(1));
      knob.setAttribute("cy", ky.toFixed(1));
      // Voie choisie en laiton ; la gare s'allume à l'arrivée.
      inbound.style.stroke = "#a8853a";
      branches.forEach((el, k) => { el.style.stroke = k === i && sw > 0.5 ? "#a8853a" : "#c9cdc8"; el.style.strokeWidth = k === i && sw > 0.5 ? "2.4" : "1.6"; });
      lamps.forEach((el, k) => (el.dataset.on = k === i && go >= 1 ? "green" : ""));
    },
    readout: (i: number) => yard.readout(i),
  };
  return loopSteps(root, yard.steps, STATES, STATE_LABEL, DWELL, scene);
}
