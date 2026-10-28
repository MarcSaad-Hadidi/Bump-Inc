// Animation de la carte des outils, en boucle : 1 un balayage fait l'inventaire, jauge à 42 ;
// 2 la coupure entre ventes et facturation ressort en rouge ; 3 trois raccords, le laiton est
// retenu ; 4 il se pose, les impulsions circulent partout, la jauge monte à 92 ; 5 surveillance :
// la liaison inventaire → facturation ralentit, la jauge baisse, Bump le détecte et pose un collier.
import { iso, segment, translateAlong } from "../kit/iso-kit";
import { windowOf } from "../shared/runtime";
import { loopSteps } from "../shared/step-loop";
import { createToolMap, STATES, STATE_LABEL, CHOSEN, DRIFT } from "./model";

type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };
type Pt = [number, number];
type Data = { P: Proj; center: Pt; routes: Pt[][]; gap: [number, number]; broken: number; dial: { c: Pt; r: number; z: number; face: number }; health: { before: number; after: number }; base: { x: number; y: number; w: number; d: number } };

const DWELL = [4.5, 4, 4, 5, 8];
const DRIFT_TOOL = 4; // inventaire
/** Maintenance (s) : la dérive commence, elle est détectée, le collier est posé, tout est rétabli. */
const M = { drift: 2.0, seen: 3.0, patch: 4.6, ok: 5.8 };

export function mount(root: HTMLElement, data: Data): () => void {
  const { P } = data;
  const svg = root.querySelector(".iso-stage svg") as SVGSVGElement;
  const one = <T extends Element>(sel: string) => svg.querySelector(sel) as T;
  const all = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel));
  const fade = (el: Element, o: number) => ((el as SVGElement).style.opacity = String(Math.round(o * 1000) / 1000));
  const connector = one<SVGGElement>("[data-connector]");
  const caps = all<SVGPathElement>("[data-cap]");
  const ring = one<SVGCircleElement>("[data-ring]");
  const scan = one<SVGPathElement>("[data-scan]");
  const needle = one<SVGPathElement>("[data-needle]");
  const score = one<SVGTextElement>("[data-score]");
  const tray = one<SVGGElement>("[data-tray]");
  const opts = all<SVGGElement>("[data-opt]");
  const lamps = all<SVGPathElement>("[data-tool-lamp]");
  const links = all<SVGPathElement>("[data-link]");
  const pulses = all<SVGCircleElement>("[data-pulse]");
  const patch = one<SVGGElement>("[data-patch]");
  const watch = one<SVGCircleElement>("[data-watch]");
  const radar = one<SVGEllipseElement>("[data-radar]");
  radar.setAttribute("cx", data.center[0].toFixed(1));
  radar.setAttribute("cy", data.center[1].toFixed(1));
  /** Phase de la maintenance : 0 surveillance, 1 dérive détectée, 2 réglé. */
  const phaseOf = (i: number, since: number, running: boolean) => (i !== 4 ? 0 : !running ? 2 : since < M.seen ? 0 : since < M.ok ? 1 : 2);
  const z = 1.3;
  // Position le long d'un tracé, en proportion de sa longueur (0..1).
  const lens = data.routes.map((r) => r.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - r[i][0], p[1] - r[i][1]), 0));
  const along = (k: number, t: number): Pt => {
    const r = data.routes[k];
    let d = t * lens[k];
    for (let i = 1; i < r.length; i++) {
      const L = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
      if (d <= L) return [r[i - 1][0] + ((r[i][0] - r[i - 1][0]) * d) / L, r[i - 1][1] + ((r[i][1] - r[i - 1][1]) * d) / L];
      d -= L;
    }
    return r[r.length - 1];
  };
  const map = createToolMap();
  const angleOf = (v: number) => ((210 - 2.4 * v) * Math.PI) / 180;

  const scene = {
    draw(i: number, since: number, running: boolean, clock: number) {
      const final = !running;
      const maint = i === 4;
      // Maintenance : dérive (0 → 1) puis réparation (0 → 1).
      const drift = maint && running ? windowOf(since, M.drift, M.seen) : 0;
      const mend = maint ? (running ? windowOf(since, M.patch, M.ok) : 1) : 0;
      const sick = drift * (1 - mend);
      const fixed = i >= 3;
      const set = i === 3 ? (final ? 1 : windowOf(since, 0.5, 1.6)) : fixed ? 1 : 0;
      // Raccord : descend dans la coupure.
      connector.setAttribute("transform", set < 1 ? translateAlong(P, [0, 0, 24 * (1 - set)]) : "");
      fade(connector, fixed ? Math.min(1, set * 3) : 0);
      caps.forEach((el) => (el.dataset.on = fixed ? "green" : i === 1 || i === 2 ? (Math.floor(clock * 3) % 2 || final ? "red" : "") : ""));
      fade(ring, i === 1 ? 1 : 0);
      fade(tray, i >= 2 ? 1 : 0);
      opts.forEach((el, k) => fade(el, i === 2 ? (k === CHOSEN ? 1 : 0.3) : fixed && k === CHOSEN ? 0 : 1));
      links.forEach((el) => (el.style.strokeWidth = Number(el.dataset.link) === DRIFT.link && sick > 0.3 ? "5" : ""));
      links.forEach((el) => (el.style.stroke = Number(el.dataset.link) === DRIFT.link && sick > 0.3 ? "#cf7a25" : fixed ? "#4f9e70" : Number(el.dataset.link) === data.broken && (i === 1 || i === 2) ? "#c4553c" : "#7b827d"));
      // Impulsions : circulent partout, sauf à travers la coupure tant qu'elle n'est pas réparée.
      pulses.forEach((el) => {
        const k = Number(el.dataset.pulse);
        const slow = k === DRIFT.link && sick > 0.3 ? 0.25 : 1; // la liaison qui dérive ralentit
        const t = (clock * 0.35 * slow + Number(el.dataset.n) * 0.5) % 1;
        const [x, y] = along(k, t);
        const blocked = !fixed && k === data.broken && y > data.gap[0] - 3;
        const [sx, sy] = iso([x, y, z], P);
        el.setAttribute("cx", sx.toFixed(1));
        el.setAttribute("cy", sy.toFixed(1));
        fade(el, running && !blocked ? Math.min(1, t * 6, (1 - t) * 6) : 0);
      });
      // Jauge : 42 puis 92.
      const v = data.health.before + (data.health.after - data.health.before) * set - (data.health.after - DRIFT.dip) * sick;
      const { c, r, z: dz, face } = data.dial;
      needle.setAttribute("d", segment([c[0], face + 0.2, dz], [c[0] + (r - 5) * Math.cos(angleOf(v)), face + 0.2, dz + (r - 5) * Math.sin(angleOf(v))], P));
      score.textContent = String(Math.round(v));
      score.style.fill = v > 75 ? "#2f6b4a" : v > 50 ? "#cf7a25" : "#b8452f";
      // Balayage d'inventaire pendant l'audit.
      if (i === 0 && running) {
        const b = data.base;
        const x = b.x + 10 + ((since * 0.35) % 1) * (b.w - 20);
        scan.setAttribute("d", segment([x, b.y + 8, z], [x, b.y + b.d - 8, z], P));
        fade(scan, 0.7);
      } else fade(scan, 0);
      // Surveillance : une onde parcourt la carte pendant toute la maintenance.
      if (maint && running) {
        const u = (since / 1.8) % 1;
        // Onde à plat sur le plateau (ellipse) : la surveillance couvre toute la carte.
        radar.setAttribute("rx", (14 + u * 330).toFixed(1));
        radar.setAttribute("ry", (8 + u * 190).toFixed(1));
        radar.style.stroke = sick > 0.3 ? "#cf7a25" : "#4f9e70";
        fade(radar, 0.85 * (1 - u));
      } else fade(radar, 0);
      // Détection : un cercle orange pulse sur la liaison qui ralentit, vert une fois réglée.
      const seen = maint && running && since >= M.seen;
      watch.setAttribute("r", (17 + 5 * Math.sin(clock * 6)).toFixed(1));
      watch.style.stroke = mend >= 1 ? "#4f9e70" : "#cf7a25";
      fade(watch, seen ? (mend >= 1 ? 1 - windowOf(since, M.ok + 0.6, M.ok + 1.4) : 1) : 0);
      // Collier de réparation : descend sur la liaison, puis reste en place.
      patch.setAttribute("transform", running && since < M.patch + 0.8 ? translateAlong(P, [0, 0, 18 * (1 - windowOf(since, M.patch, M.patch + 0.8))]) : "");
      fade(patch, maint && (final || since >= M.patch) ? 1 : 0);
      lamps.forEach((el, k) => (el.dataset.on = k === DRIFT_TOOL && sick > 0.3 && seen ? (Math.floor(clock * 3) % 2 ? "amber" : "") : fixed ? "green" : i === 0 ? "white" : ""));
    },
    readout: (i: number, since: number, running: boolean) => map.readout(i, phaseOf(i, since, running)),
  };
  return loopSteps(root, map.steps, STATES, STATE_LABEL, DWELL, scene);
}
