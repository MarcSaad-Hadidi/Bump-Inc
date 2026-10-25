// Porte du coffre : partagée par build.mjs (pose de repos, audit) et live.ts (reconstruite pendant
// qu'elle pivote). Toutes les pièces sont exprimées dans le repère de la porte : u le long de la
// porte depuis l'axe des charnières, w l'épaisseur (positif = face extérieure), z la hauteur.
import { extrude, iso, pathOf } from "../kit/iso-kit";

type P2 = [number, number];
type P3 = [number, number, number];
type Proj = { origin: [number, number]; scale: number; azimuth: number; elevation: number };

export const HINGE: P2 = [66, 54];
export const DOOR = { u0: 4, u1: 126, w: 4, z0: 12, z1: 130 };
export const OPEN = (165 * Math.PI) / 180;
export const DIAL = { u: 62, z: 76, r: 21, depth: 5 };
export const WHEEL = { u: 98, z: 76, r: 13 };
export const PLATE = { u0: 34, u1: 90, z0: 108, z1: 118 };
export const BOLT_Z = [36, 76, 116];
export const BOLT_STROKE = 9;

/** Repère de la porte ouverte de theta (0 = fermée, face extérieure vers +y). */
export function frame(theta: number) {
  return { t: [-Math.cos(theta), Math.sin(theta)] as P2, n: [Math.sin(theta), Math.cos(theta)] as P2 };
}
export function worldOf(theta: number, u: number, w: number, z: number): P3 {
  const { t, n } = frame(theta);
  return [HINGE[0] + u * t[0] + w * n[0], HINGE[1] + u * t[1] + w * n[1], z];
}
const plan = (theta: number, u0: number, u1: number, w0: number, w1: number): P2[] =>
  ([[u0, w0], [u1, w0], [u1, w1], [u0, w1]] as P2[]).map(([u, w]) => worldOf(theta, u, w, 0).slice(0, 2) as P2);

/** Boîte alignée sur la porte : un prisme vertical, extrudé par le kit (ombrage compris). */
export const doorBox = (theta: number, u0: number, u1: number, w0: number, w1: number, z0: number, z1: number, P: Proj) =>
  extrude(plan(theta, u0, u1, w0, w1), z0, z1 - z0, P, { convex: true });
export const doorBoxRing = (theta: number, u0: number, u1: number, w0: number, w1: number) => plan(theta, u0, u1, w0, w1);

function hull(points: P2[]): P2[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [], upper: P2[] = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Le côté de la porte tourné vers l'observateur. */
export function outerFacing(theta: number, P: Proj) {
  const a = (P.azimuth * Math.PI) / 180;
  const { n } = frame(theta);
  return n[0] * Math.cos(a) + n[1] * Math.sin(a) > 0;
}

/** Cercle dans le plan de la porte (u, z) à l'épaisseur w. */
export const circleAt = (theta: number, u: number, z: number, w: number, r: number, steps = 36): P3[] =>
  Array.from({ length: steps }, (_, i) => { const a = (i / steps) * Math.PI * 2; return worldOf(theta, u + r * Math.cos(a), w, z + r * Math.sin(a)); });

/** Cylindre dont l'axe traverse la porte (cadran, moyeu, came) : enveloppe des deux faces. */
export function crossCylinder(theta: number, u: number, z: number, w0: number, w1: number, r: number, P: Proj) {
  const a = circleAt(theta, u, z, w0, r).map((p) => iso(p, P) as P2);
  const b = circleAt(theta, u, z, w1, r).map((p) => iso(p, P) as P2);
  const face = outerFacing(theta, P) === w1 > w0 ? b : a;
  const outline = pathOf(hull([...a, ...b]), true);
  return { fill: outline, cap: pathOf(face, true), outline };
}

/** Boîte quelconque dans le plan de la porte (rayon du volant) : enveloppe de ses huit coins. */
export function spoke(theta: number, u: number, z: number, angle: number, r0: number, r1: number, half: number, w0: number, w1: number, P: Proj) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const pts: P2[] = [];
  for (const r of [r0, r1]) for (const h of [-half, half]) for (const w of [w0, w1]) pts.push(iso(worldOf(theta, u + r * c - h * s, w, z + r * s + h * c), P) as P2);
  return pathOf(hull(pts), true);
}

/** Ligne dans le plan de la porte. */
export const lineIn = (theta: number, pts: [number, number, number][], P: Proj) => pathOf(pts.map(([u, w, z]) => iso(worldOf(theta, u, w, z), P) as P2));

/** Matrice SVG pour graver un texte sur la face extérieure (lecture de gauche à droite porte fermée). */
export function textMatrix(theta: number, u: number, w: number, z: number, P: Proj) {
  const o = iso(worldOf(theta, u, w, z), P);
  const x = iso(worldOf(theta, u - 1, w, z), P);
  const d = iso(worldOf(theta, u, w, z - 1), P);
  const f = (v: number) => Math.round(v * 1000) / 1000;
  return `matrix(${f(x[0] - o[0])} ${f(x[1] - o[1])} ${f(d[0] - o[0])} ${f(d[1] - o[1])} ${f(o[0])} ${f(o[1])})`;
}

/** Toutes les formes de la porte pour un angle, un tour de volant, une aiguille et une sortie des pênes. */
export function doorPaths(theta: number, wheel: number, needle: number, shoot: number, P: Proj) {
  const { w, u0, u1, z0, z1 } = DOOR;
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2, r0 = i % 6 ? DIAL.r - 6.4 : DIAL.r - 8;
    return lineIn(theta, [[DIAL.u + r0 * Math.cos(a), w + DIAL.depth, DIAL.z + r0 * Math.sin(a)], [DIAL.u + (DIAL.r - 5) * Math.cos(a), w + DIAL.depth, DIAL.z + (DIAL.r - 5) * Math.sin(a)]], P);
  }).join("");
  return {
    outer: outerFacing(theta, P),
    slab: extrude(plan(theta, u0, u1, -w, w), z0, z1 - z0, P, { convex: true, bevel: 0.6 }),
    seam: lineIn(theta, [[u0 + 3, w, z0 + 3], [u1 - 3, w, z0 + 3], [u1 - 3, w, z1 - 3], [u0 + 3, w, z1 - 3], [u0 + 3, w, z0 + 3]], P),
    dial: crossCylinder(theta, DIAL.u, DIAL.z, w, w + DIAL.depth, DIAL.r, P),
    bezel: pathOf(circleAt(theta, DIAL.u, DIAL.z, w + DIAL.depth, DIAL.r - 2.4).map((p) => iso(p, P) as P2), true),
    face: pathOf(circleAt(theta, DIAL.u, DIAL.z, w + DIAL.depth, DIAL.r - 5).map((p) => iso(p, P) as P2), true),
    ticks,
    needle: lineIn(theta, [[DIAL.u - 2 * Math.cos(needle), w + DIAL.depth, DIAL.z - 2 * Math.sin(needle)], [DIAL.u + (DIAL.r - 7) * Math.cos(needle), w + DIAL.depth, DIAL.z + (DIAL.r - 7) * Math.sin(needle)]], P),
    hub: crossCylinder(theta, WHEEL.u, WHEEL.z, w, w + 7, 3.2, P),
    spokes: [0, 1, 2].map((k) => spoke(theta, WHEEL.u, WHEEL.z, wheel + (k * 2 * Math.PI) / 3, 2.5, WHEEL.r, 1.1, w + 4.5, w + 6.5, P)).join(""),
    knobs: [0, 1, 2].map((k) => { const a = wheel + (k * 2 * Math.PI) / 3; return crossCylinder(theta, WHEEL.u + WHEEL.r * Math.cos(a), WHEEL.z + WHEEL.r * Math.sin(a), w + 4, w + 9, 1.9, P).fill; }).join(""),
    plate: doorBox(theta, PLATE.u0, PLATE.u1, w, w + 1, PLATE.z0, PLATE.z1, P),
    plateText: textMatrix(theta, (PLATE.u0 + PLATE.u1) / 2, w + 1, PLATE.z0 + 3.4, P),
    cam: crossCylinder(theta, DIAL.u, DIAL.z, -w - 3, -w, 15, P),
    bar: doorBox(theta, 110, 117, -w - 3, -w, BOLT_Z[0] - 6, BOLT_Z[2] + 6, P),
    rod: doorBox(theta, DIAL.u, 110, -w - 2.4, -w, DIAL.z - 2, DIAL.z + 2, P),
    guides: BOLT_Z.map((z) => doorBox(theta, 117, 124, -w - 3, -w, z - 4, z + 4, P)),
    bolts: BOLT_Z.map((z) => (shoot > 0.05 ? doorBox(theta, u1, u1 + shoot, -2.4, 2.4, z - 2.4, z + 2.4, P) : null)),
  };
}
