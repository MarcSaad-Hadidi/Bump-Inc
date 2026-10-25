// Profils plans des engrenages, partagés par build.mjs (pose de repos, audit) et live.ts
// (reconstruits à chaque image avec extrude du kit, comme le recommande Anatomy pour une pièce qui tourne).
type Pt = [number, number];

export const MODULE = 2.4;
export const pitchRadius = (n: number) => (MODULE * n) / 2;
export const tipRadius = (n: number) => pitchRadius(n) + MODULE;
export const rootRadius = (n: number) => pitchRadius(n) - 1.25 * MODULE;

const polar = (cx: number, cy: number, r: number, a: number): Pt => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

/**
 * Contour d'un engrenage de n dents tourné de `angle`. Les dents de `broken` sont cassées net ;
 * celles de `ground` sont meulées jusqu'au pied (place libre pour le secteur de réparation).
 */
export function gearRing(n: number, cx: number, cy: number, angle: number, broken: readonly number[] = [], ground: readonly number[] = []): Pt[] {
  const R = pitchRadius(n), rt = tipRadius(n), rr = rootRadius(n), p = (2 * Math.PI) / n;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const c = angle + i * p;
    if (ground.includes(i)) {
      out.push(polar(cx, cy, rr, c - 0.32 * p), polar(cx, cy, rr, c), polar(cx, cy, rr, c + 0.32 * p));
    } else if (broken.includes(i)) {
      // moignon irrégulier : la dent est partie, il reste une cassure
      out.push(polar(cx, cy, rr, c - 0.32 * p), polar(cx, cy, R - 0.5 * MODULE, c - 0.18 * p), polar(cx, cy, R - 1.0 * MODULE, c), polar(cx, cy, R - 0.3 * MODULE, c + 0.16 * p), polar(cx, cy, rr, c + 0.32 * p));
    } else {
      out.push(polar(cx, cy, rr, c - 0.32 * p), polar(cx, cy, rt, c - 0.15 * p), polar(cx, cy, rt, c + 0.15 * p), polar(cx, cy, rr, c + 0.32 * p));
    }
    out.push(polar(cx, cy, rr, c + 0.5 * p));
  }
  return out;
}

/** Secteur de réparation : les dents `teeth` neuves, posées sur le pied meulé de l'engrenage. */
export function patchRing(n: number, cx: number, cy: number, angle: number, teeth: readonly number[]): Pt[] {
  const rt = tipRadius(n), rr = rootRadius(n), p = (2 * Math.PI) / n, inner = rr - 0.3; // appuyé contre le pied meulé
  const a0 = angle + (teeth[0] - 0.5) * p, a1 = angle + (teeth[teeth.length - 1] + 0.5) * p;
  const out: Pt[] = [polar(cx, cy, rr, a0)];
  for (const i of teeth) {
    const c = angle + i * p;
    out.push(polar(cx, cy, rr, c - 0.32 * p), polar(cx, cy, rt, c - 0.15 * p), polar(cx, cy, rt, c + 0.15 * p), polar(cx, cy, rr, c + 0.32 * p));
  }
  out.push(polar(cx, cy, rr, a1));
  for (let s = 0; s <= 6; s++) out.push(polar(cx, cy, inner, a1 - ((a1 - a0) * s) / 6));
  return out;
}

/**
 * Angle d'un engrenage mené (rayon primitif rb, nb dents) par un menant (ra, angle aa) dont le centre
 * le voit dans la direction phi : roulement sans glissement, une dent du menant dans un creux du mené.
 */
export function meshed(ra: number, aa: number, rb: number, nb: number, phi: number) {
  return phi + Math.PI - (rb * (Math.PI / nb) - ra * (phi - aa)) / rb;
}

/** Rectangle tourné (dans le plan) : longueur le long de phi, largeur en travers. */
export function radialRect(phi: number, r0: number, r1: number, half: number): Pt[] {
  const c = Math.cos(phi), s = Math.sin(phi);
  return [[r0, -half], [r1, -half], [r1, half], [r0, half]].map(([a, b]) => [a * c - b * s, a * s + b * c] as Pt);
}

/** Bande d'arc (polygone simple) entre r0 et r1, de a0 à a1. */
export function arcBand(r0: number, r1: number, a0: number, a1: number, steps = 40): Pt[] {
  const outer = Array.from({ length: steps + 1 }, (_, i) => polar(0, 0, r1, a0 + ((a1 - a0) * i) / steps));
  const inner = Array.from({ length: steps + 1 }, (_, i) => polar(0, 0, r0, a1 - ((a1 - a0) * i) / steps));
  return [...outer, ...inner];
}
