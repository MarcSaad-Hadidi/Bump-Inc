import * as k from '../../anatomy/kit/iso-kit';
import * as G from '../../anatomy/kit/lathe.mjs';
import { WORKFLOW_ORDER_KEYS } from './order-keys';
import { pointAt, routeLength, type Vec3 } from './model';

export type Material = 'ivory' | 'green' | 'brass' | 'ink' | 'warning';
export type Motion = 'capsule' | 'intake' | 'diverter' | 'probeA' | 'probeB' | 'probeC' | 'gate' | 'connector' | 'completion';
export type Shape = { kind: 'slab'; plan: k.Plan; z: number; h: number } | { kind: 'cylinder'; x: number; y: number; r: number; z: number; h: number } | { kind: 'extruded'; ring: k.Plane[]; z: number; h: number } | { kind: 'ring'; x: number; y: number; rIn: number; rOut: number; z: number; h: number } | { kind: 'slide'; x: number; y: number; z: number; length: number; r: number; stroke: number };
export interface MachinePart {
  id: string; module: number; material: Material; paths: k.SolidPaths; at: Vec3; shape: Shape;
  motion?: Motion; lines: string[]; key: number; clip?: string;
}
export interface MachineScene {
  width: number; height: number; projection: k.Projection; parts: MachinePart[]; halo: string;
  route: Vec3[]; stations: Vec3[]; stops: number[]; total: number; mobile: boolean;
  projectOffset: (point: Vec3) => k.Flat; capsuleAt: (travel: number) => Vec3;
}
const Z = 18;
const PLAN_SIZES: [number, number][] = [[48, 40], [48, 40], [58, 46], [36, 40], [48, 42], [60, 42]];
const rect = (x: number, y: number, w: number, d: number, r = 2): k.Plan => ({ x, y, w, d, r });

/** A true constant-width machined strip, including the two mitered sides. */
function strip(points: k.Plane[], half: number): k.Plane[] {
  const side = (sign: number) => points.map((p, i): k.Plane => {
    const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    const a = i ? [p[0] - prev[0], p[1] - prev[1]] : [next[0] - p[0], next[1] - p[1]];
    const b = i < points.length - 1 ? [next[0] - p[0], next[1] - p[1]] : a;
    const la = Math.hypot(...a) || 1, lb = Math.hypot(...b) || 1;
    const na = [-a[1] / la, a[0] / la], nb = [-b[1] / lb, b[0] / lb];
    const nx = na[0] + nb[0], ny = na[1] + nb[1];
    const denominator = nx * nb[0] + ny * nb[1];
    return [p[0] + (denominator ? nx / denominator : nb[0]) * half * sign, p[1] + (denominator ? ny / denominator : nb[1]) * half * sign];
  });
  return [...side(1), ...side(-1).reverse()];
}
function offset(points: k.Plane[], distance: number): k.Plane[] {
  const full = strip(points, distance);
  return full.slice(0, points.length);
}
function roundedCorner(points: k.Plane[], radius: number): k.Plane[] {
  if (points.length < 3) return points;
  const out: k.Plane[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lb = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(radius, la * .45, lb * .45);
    const before: k.Plane = [b[0] + (a[0] - b[0]) * r / la, b[1] + (a[1] - b[1]) * r / la];
    const after: k.Plane = [b[0] + (c[0] - b[0]) * r / lb, b[1] + (c[1] - b[1]) * r / lb];
    out.push(before);
    for (let t = 1; t <= 12; t++) {
      const f = t / 12, q = 1 - f;
      out.push([q * q * before[0] + 2 * q * f * b[0] + f * f * after[0], q * q * before[1] + 2 * q * f * b[1] + f * f * after[1]]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function buildScene(mobile: boolean): MachineScene {
  const width = mobile ? 420 : 1120, height = mobile ? 550 : 420;
  const centres: k.Plane[] = mobile
    ? [[-145, -110], [-55, -110], [-55, -15], [35, -15], [35, 80], [125, 80]]
    : [[-170, -50], [-82, -50], [12, -50], [104, -50], [104, 56], [-6, 56]];
  const backbone = mobile ? centres : [centres[0], centres[3], centres[4], centres[5]];
  const baseRing = strip(backbone, 38);
  const extremes: Vec3[] = baseRing.flatMap(([x, y]) => [[x, y, -18] as Vec3, [x, y, 0] as Vec3]);
  centres.forEach(([x, y], i) => extremes.push(...k.boxCorners(rect(x - PLAN_SIZES[i][0] / 2, y - PLAN_SIZES[i][1] / 2, ...PLAN_SIZES[i], 5), 0, 32)));
  const [gateX, gateY] = centres[3], [prepareX, prepareY] = centres[2], [receiveX, receiveY] = centres[0];
  extremes.push([gateX - 20, gateY - 19, 72.2], [gateX + 1, gateY + 19, 66], [prepareX - 27, prepareY - 18, 47], [prepareX + 27, prepareY - 10, 47], [receiveX - 15, receiveY - 21, 50]);
  const P = k.fitProjection(extremes, width, height, { pad: mobile ? 15 : 24, azimuth: mobile ? 45 : 68, elevation: mobile ? 37 : 28 });
  const parts: MachinePart[] = [];
  function add(id: string, module: number, material: Material, shape: Shape, motion?: Motion, lines: string[] = []) {
    const rod = shape.kind === 'slide' ? G.rodOut(G.frameAlong([shape.x, shape.y, shape.z], [0, 0, -1]), 0, shape.length, shape.r, P, { stroke: shape.stroke }) : null;
    const paths = rod ? rod.paths : shape.kind === 'slab' ? k.slabOf(shape.plan, shape.z, shape.h, P, 6, .7)
      : shape.kind === 'ring' ? G.ringBand(shape.z, shape.z + shape.h, shape.rIn, shape.rOut, G.frameAlong([shape.x, shape.y, 0], [0, 0, 1]), P)
      : shape.kind === 'cylinder' ? k.cylinder(shape.x, shape.y, shape.r, shape.z, shape.h, P, 40, .35)
      : k.extrude((shape as Extract<Shape, { kind: 'extruded' }>).ring, shape.z, (shape as Extract<Shape, { kind: 'extruded' }>).h, P, { convex: false, bevel: .65 });
    const at: Vec3 = shape.kind === 'slab' ? [shape.plan.x + shape.plan.w / 2, shape.plan.y + shape.plan.d / 2, shape.z + shape.h / 2]
      : shape.kind === 'slide' ? [shape.x, shape.y, shape.z - shape.length / 2]
      : shape.kind === 'cylinder' || shape.kind === 'ring' ? [shape.x, shape.y, shape.z + shape.h / 2]
      : [shape.ring.reduce((v, p) => v + p[0], 0) / shape.ring.length, shape.ring.reduce((v, p) => v + p[1], 0) / shape.ring.length, shape.z + shape.h / 2];
    parts.push({ id, module, material, shape, paths, at, motion, lines, key: k.depthOf(at, P), clip: rod?.clip });
  }
  const slab = (id: string, module: number, material: Material, plan: k.Plan, z: number, h: number, motion?: Motion, lines: string[] = []) => add(id, module, material, { kind: 'slab', plan, z, h }, motion, lines);
  const cyl = (id: string, module: number, material: Material, x: number, y: number, r: number, z: number, h: number, motion?: Motion, lines: string[] = []) => add(id, module, material, { kind: 'cylinder', x, y, r, z, h }, motion, lines);
  const prism = (id: string, module: number, material: Material, ring: k.Plane[], z: number, h: number) => add(id, module, material, { kind: 'extruded', ring, z, h });
  // Four feet are flush with the underside; every station shares this routed chassis.
  [0, 2, 4, 5].forEach((i, n) => {
    const [x, y] = centres[i];
    cyl(`stand.foot.${n}`, -1, 'ink', x, y, 9, -18, 8);
  });
  prism('stand.routed-bedplate', -1, 'ivory', baseRing, -10, 10);
  const rimPath = backbone.map(p => [...p] as k.Plane);
  for (const [index, neighbour] of [[0, 1], [rimPath.length - 1, rimPath.length - 2]]) {
    const a = backbone[index], b = backbone[neighbour], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    rimPath[index] = [a[0] + (b[0] - a[0]) * 4 / length, a[1] + (b[1] - a[1]) * 4 / length];
  }
  parts[parts.length - 1].lines.push(k.onTop(strip(rimPath, 34), 0, P, true));
  [0, 2, 4, 5].forEach((i, n) => {
    const [x, y] = centres[i];
    const fixingX = x + (i === 0 ? 8 : i === 5 ? (mobile ? -8 : 8) : 0);
    cyl(`stand.fixing.${n}`, -1, 'brass', fixingX, y + 25, 2, 0, 1.4, undefined, [k.ring(fixingX, y + 25, .75, 1.4, P, 24)]);
  });
  const stationPlans = centres.map(([x, y], i) => rect(x - PLAN_SIZES[i][0] / 2, y - PLAN_SIZES[i][1] / 2, ...PLAN_SIZES[i], 5));
  // Open-sided trays: walls are chosen to leave the real inlet/outlet faces clear.
  const wallSides = mobile ? [['n', 's'], ['n', 'e'], ['w', 's'], ['n', 'e'], ['w', 's'], ['n', 's']] : [['n', 's'], ['n', 's'], ['n', 's'], ['n', 'e'], ['e', 's'], ['n', 's']];
  stationPlans.forEach((p, i) => {
    slab(`station.${i}.floor`, i, i === 2 ? 'green' : 'ivory', p, 0, Z, undefined, [k.sideSeam(p, 12, P, 6)]);
    wallSides[i].forEach((side, n) => {
      const wall = side === 'n' || side === 's'
        ? rect(p.x, side === 'n' ? p.y : p.y + p.d - 3, p.w, 3, 1)
        : rect(side === 'w' ? p.x : p.x + p.w - 3, p.y + 3, 3, p.d - 6, 1);
      slab(`station.${i}.cheek.${n}`, i, 'ivory', wall, Z, i === 2 ? 14 : 7);
    });
  });
  // Distinct machined channels, floor and both raised guides, land flush on station edges.
  const links: k.Plane[][] = centres.slice(0, -1).map((a, i) => {
    const b = centres[i + 1], pa = stationPlans[i], pb = stationPlans[i + 1];
    if (Math.abs(a[1] - b[1]) < .1) return b[0] > a[0] ? [[pa.x + pa.w, a[1]], [pb.x, b[1]]] : [[pa.x, a[1]], [pb.x + pb.w, b[1]]];
    return [[a[0], pa.y + pa.d], [b[0], pb.y]];
  });
  links.forEach((link, i) => {
    prism(`channel.${i}.bed`, i, 'ivory', strip(link, 11), 0, Z);
    [-1, 1].forEach((sign, n) => prism(`channel.${i}.guide.${n}`, i, 'brass', strip(offset(link, 10 * sign), 1), Z, 4));
  });
  const [rx, ry] = centres[0];
  slab('reception.stamp-pedestal', 0, 'ivory', rect(rx - 15, ry - 21, 8, 8, 1.5), 25, 14);
  cyl('reception.registering-plunger', 0, 'brass', rx - 11, ry - 17, 2.4, 39, 8, 'intake');
  cyl('reception.signal-collar', 0, 'green', rx - 11, ry - 17, 4, 47, 3, 'intake', [k.ring(rx - 11, ry - 17, 2.7, 50, P)]);
  const [sx, sy] = centres[1];
  slab('sort.spindle-seat', 1, 'ivory', rect(sx - 16, sy - 17, 33, 10, 1.5), Z, 3);
  cyl('sort.spindle', 1, 'ink', sx + 12, sy - 10, 2.6, Z + 3, 7, 'diverter');
  slab('sort.guide-tongue', 1, 'brass', rect(sx - 14, sy - 11, 23.4, 4, 1), Z + 3, 4, 'diverter');
  cyl('sort.valve-cap', 1, 'ivory', sx + 12, sy - 10, 5.4, Z + 10, 3, 'diverter', [k.knurl(sx + 12, sy - 10, 5.4, Z + 10, Z + 13, 24, P)]);
  const [ax, ay] = centres[2];
  [-22, 22].forEach((dx, i) => cyl(`prepare.header-support.${i}`, 2, 'ivory', ax + dx, ay - 14, 2.7, Z, 24));
  [-14, 0, 14].forEach((dx, i) => {
    const motion = (['probeA', 'probeB', 'probeC'] as Motion[])[i];
    add(`prepare.stem.${i}`, 2, 'brass', { kind: 'slide', x: ax + dx, y: ay - 14, z: Z + 24, length: 9, r: 2.1, stroke: 7 }, motion);
    cyl(`prepare.head.${i}`, 2, 'ivory', ax + dx, ay - 14, 4.1, Z + 10, 5, motion, [k.ring(ax + dx, ay - 14, 2.7, Z + 15, P)]);
  });
  slab('prepare.header-collar', 2, 'green', rect(ax - 27, ay - 18, 54, 8, 2), Z + 24, 5);
  const [gx, gy] = centres[3];
  const gateMechanismX = gx - 12;
  [-1, 1].forEach((s, n) => slab(`approval.guide-post.${n}`, 3, 'ivory', rect(gateMechanismX - 7, gy + s * 15 - 1, 7, 2, 1), Z, 44));
  slab('approval.upper-yoke', 3, 'ivory', rect(gateMechanismX - 8, gy - 19, 9, 38, 1.5), Z + 44, 4);
  slab('approval.blocking-blade', 3, 'brass', rect(gateMechanismX - 6, gy - 14, 4, 28, .6), Z, 18, 'gate');
  [-1, 1].forEach((s, n) => slab(`approval.guide-shoe.${n}`, 3, 'ink', rect(gateMechanismX - 6, gy + s * 12 - 1, 4, 2, .4), Z + 18, 3, 'gate'));
  cyl('approval.lamp-base', 3, 'brass', gateMechanismX - 3.5, gy - 16, 3.2, Z + 48, 3);
  cyl('approval.warning-lens', 3, 'warning', gateMechanismX - 3.5, gy - 16, 2.1, Z + 51, 2.2);
  const [tx, ty] = centres[4];
  slab('transfer.socket-back', 4, 'green', rect(tx - 15, ty + 10, 30, 8, 2), Z, 11);
  slab('transfer.socket-front', 4, 'ivory', rect(tx - 13, ty + 9, 26, 3, .8), Z + 11, 5);
  cyl('transfer.locking-collar', 4, 'brass', tx + 12, ty + 13, 3.3, Z + 16, 4, undefined, [k.knurl(tx + 12, ty + 13, 3.3, Z + 16, Z + 20, 20, P)]);
  slab('transfer.release-slider', 4, 'brass', rect(tx - 11, ty + 10, 16, 3, .6), Z + 16, 3, 'connector');
  const [ox, oy] = centres[5];
  slab('result.cassette-end-stop', 5, 'green', rect(ox + (mobile ? 22 : -26), oy - 16, 4, 32, 1.2), Z, 12);
  slab('result.record-seat', 5, 'ivory', rect(ox + (mobile ? -24 : 15), oy + 8, 9, 8, 1.4), Z, 3);
  cyl('result.completed-marker', 5, 'green', ox + (mobile ? -19.5 : 19.5), oy + 12, 3.3, Z + 3, 3, 'completion', [k.ring(ox + (mobile ? -19.5 : 19.5), oy + 12, 1.6, Z + 6, P)]);
  // One capsule, always assembled: body, band and identity stud.
  const [cx, cy] = centres[0];
  slab('request.capsule', 0, 'green', rect(cx - 8, cy - 5, 16, 10, 4.8), Z, 7, 'capsule');
  slab('request.identity-band', 0, 'brass', rect(cx - 1.5, cy - 5, 3, 10, .3), Z + 7, .9, 'capsule');
  cyl('request.identity-stud', 0, 'ivory', cx + 4.5, cy, 1.25, Z + 7, 1.2, 'capsule');
  const route2 = roundedCorner(mobile ? centres : [centres[0], centres[3], centres[4], centres[5]], 6);
  const route: Vec3[] = route2.map(([x, y]) => [x, y, Z]);
  const findDistance = ([x, y]: k.Plane) => {
    let best = Infinity, at = 0, walked = 0;
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (length * length || 1)));
      const distance = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
      if (distance < best) { best = distance; at = walked + t * length; }
      walked += length;
    }
    return at;
  };
  const wait: k.Plane = [gx - 29, gy];
  const stops = [0, findDistance(centres[1]), findDistance(centres[2]), findDistance(wait), findDistance(centres[4]), routeLength(route)];
  const measured = WORKFLOW_ORDER_KEYS[mobile ? 'mobile' : 'desktop'] as Record<string, number>;
  parts.forEach(part => { part.key = measured[part.id] ?? part.key; });
  const origin = k.iso([0, 0, 0], P);
  return { width, height, projection: P, parts, halo: k.extrude(baseRing, -18, .1, P, { convex: false }).fill,
    route, stations: centres.map(([x, y]) => [x, y, Z]), stops, total: routeLength(route), mobile,
    projectOffset: point => { const p = k.iso(point, P); return [p[0] - origin[0], p[1] - origin[1]]; },
    capsuleAt: travel => pointAt(route, travel),
  };
}
export const DESKTOP_SCENE = buildScene(false);
export const MOBILE_SCENE = buildScene(true);
