import * as k from '../../anatomy/kit/iso-kit';
import type { Flat, Plan, Plane, Point3, Projection, SolidPaths } from '../../anatomy/kit/iso-kit';
import { SECURITY_ORDER } from './security-order';
import type { SecurityModuleId } from './model';

export type SecurityCamera = 'desktop' | 'mobile';
export type SecurityMotion = 'fixed' | 'core-insertion' | 'hatch' | 'permission' | 'identity-lock';
export type ShapeDescriptor =
  | { kind: 'slab'; plan: Plan; z: number; h: number; steps: number }
  | { kind: 'cylinder'; x: number; y: number; r: number; z: number; h: number; steps: number }
  | { kind: 'extrude'; ring: Plane[]; z: number; h: number };
export type SecurityPart = { id: string; module?: SecurityModuleId; material: 'base' | 'ivory' | 'green' | 'brass' | 'ink' | 'lens'; purpose: string; motion: SecurityMotion; move: Point3; paths: SolidPaths; shape: ShapeDescriptor; at: Point3; svg: string; key: number; dx: number; dy: number; intro: boolean };
export type SecurityChannel = { id: SecurityModuleId; d: string; start: Flat; end: Flat; terminals: string };
export type SecurityGeometry = { mode: SecurityCamera; width: number; height: number; P: Projection; parts: SecurityPart[]; details: Record<string, string>; channels: SecurityChannel[]; halo: string; hitAreas: { id: SecurityModuleId; d: string }[]; needleAt: (angle: number) => string; needleCenter: Flat; solidCount: number };

const BASE: Plan = { x: -134, y: -120, w: 270, d: 250, r: 15 };
const CORE: Plan = { x: -37, y: -34, w: 74, d: 72, r: 9 };
const PLINTHS: { id: SecurityModuleId; plan: Plan; lamp: Point3 }[] = [
  { id: 'applications', plan: { x: -113, y: -88, w: 63, d: 44, r: 5 }, lamp: [-56, -50, 5.5] },
  { id: 'infrastructure', plan: { x: -17, y: -108, w: 62, d: 46, r: 5 }, lamp: [35, -66, 4] },
  { id: 'users', plan: { x: 64, y: -61, w: 58, d: 47, r: 5 }, lamp: [113, -22, 6] },
  { id: 'networks', plan: { x: 58, y: 24, w: 64, d: 44, r: 5 }, lamp: [114, 62, 4] },
  { id: 'data', plan: { x: -17, y: 68, w: 64, d: 46, r: 5 }, lamp: [44, 110, 4] },
  { id: 'external', plan: { x: -122, y: 4, w: 65, d: 46, r: 5 }, lamp: [-65, 8, 4] },
];
const SHIELD: Plane[] = [[-31, -29], [0, -35], [31, -29], [31, 2], [24, 20], [0, 35], [-24, 20], [-31, 2]];
const INNER_SHIELD: Plane[] = [[-27, -25], [0, -30.5], [27, -25], [27, 1], [20.5, 17.5], [0, 30.5], [-20.5, 17.5], [-27, 1]];
const MOVES: Record<SecurityMotion, Point3> = { fixed: [0, 0, 0], 'core-insertion': [0, 0, 8], hatch: [0, -9, 0], permission: [0, 4, 0], 'identity-lock': [0, 0, 1.2] };
const join = (...d: string[]) => d.filter(Boolean).join('');
const materialClass = (material: SecurityPart['material']) => `bse-material-${material}`;

export function buildSecurityGeometry(mode: SecurityCamera = 'desktop'): SecurityGeometry {
  const width = mode === 'desktop' ? 880 : 560;
  const height = mode === 'desktop' ? 510 : 510;
  const P = k.fitProjection([...k.boxCorners(BASE, -15, 0), ...k.boxCorners(CORE, 0, 47)], width, height, {
    pad: mode === 'desktop' ? 25 : 15,
    // The mobile camera looks farther down into the compartment, rather than
    // shrinking the desktop's oblique view and all of its small labels.
    azimuth: mode === 'desktop' ? 44 : 21,
    elevation: mode === 'desktop' ? 34 : 43,
  });
  const at = (p: Point3) => k.iso(p, P);
  const parts: SecurityPart[] = [];
  const details: Record<string, string> = {};
  const add = (id: string, shape: ShapeDescriptor, material: SecurityPart['material'], purpose: string, module?: SecurityModuleId, motion: SecurityMotion = 'fixed', inner = '') => {
    let paths: SolidPaths;
    let centre: Point3;
    if (shape.kind === 'slab') { paths = k.slabOf(shape.plan, shape.z, shape.h, P, shape.steps, Math.min(0.9, shape.h / 3)); centre = [shape.plan.x + shape.plan.w / 2, shape.plan.y + shape.plan.d / 2, shape.z + shape.h / 2]; }
    else if (shape.kind === 'cylinder') { paths = k.cylinder(shape.x, shape.y, shape.r, shape.z, shape.h, P, shape.steps, Math.min(0.6, shape.h / 3)); centre = [shape.x, shape.y, shape.z + shape.h / 2]; }
    else { paths = k.extrude(shape.ring, shape.z, shape.h, P, { convex: false, bevel: Math.min(0.9, shape.h / 3) }); centre = [shape.ring.reduce((sum, p) => sum + p[0], 0) / shape.ring.length, shape.ring.reduce((sum, p) => sum + p[1], 0) / shape.ring.length, shape.z + shape.h / 2]; }
    const move = MOVES[motion];
    const origin = at([0, 0, 0]);
    const moved = at(move);
    const svg = k.solidSvg(paths, { tone: material === 'base' ? 'lo' : material === 'ivory' ? 'hi' : 'mid', className: materialClass(material), inner });
    parts.push({ id, module, material, purpose, motion, move, paths, shape, at: centre, svg, key: SECURITY_ORDER[`${mode}:${id}`] ?? k.depthOf(centre, P), dx: moved[0] - origin[0], dy: moved[1] - origin[1], intro: motion === 'core-insertion' });
  };
  const slab = (id: string, plan: Plan, z: number, h: number, material: SecurityPart['material'], purpose: string, module?: SecurityModuleId, motion: SecurityMotion = 'fixed', inner = '') => add(id, { kind: 'slab', plan, z, h, steps: 6 }, material, purpose, module, motion, inner);
  const cylinder = (id: string, x: number, y: number, r: number, z: number, h: number, material: SecurityPart['material'], purpose: string, module?: SecurityModuleId, motion: SecurityMotion = 'fixed', inner = '') => add(id, { kind: 'cylinder', x, y, r, z, h, steps: r > 8 ? 56 : 32 }, material, purpose, module, motion, inner);
  const line = (d: string, tone: 'faint' | 'lo' | 'mid' | 'hi' = 'lo', free = false) => k.lineSvg(d, { tone, free });
  const dots = (pts: Point3[], size = 0.55) => k.dotsSvg(pts.map(at), { size, tone: 'mid' });
  const screws = (plan: Plan, z: number, inset = 4) => {
    const points = k.corners(plan, inset);
    return join(line(points.map(([x, y]) => k.ring(x, y, 1.35, z, P, 20)).join(''), 'lo'), dots(points.map(([x, y]) => [x, y, z] as Point3)));
  };
  const groove = (plan: Plan, z: number, inset = 3) => line(k.planOutline(k.insetPlan(plan, inset), z, P, 6), 'faint');
  const slots = (x: number, y: number, count: number, pitch: number, length: number, z: number, axis: 'x' | 'y' = 'x') => {
    let result = '';
    for (let n = 0; n < count; n++) result += line(k.planOutline(axis === 'x' ? { x: x + n * pitch, y, w: 1.1, d: length, r: 0.5 } : { x, y: y + n * pitch, w: length, d: 1.1, r: 0.5 }, z, P, 4), 'lo');
    return result;
  };

  k.corners(BASE, 20).forEach(([x, y], i) => cylinder(`chassis.foot.${i + 1}`, x, y, 6.2, -15, 5, 'ink', 'Isolate and support the chassis.'));
  const baseInner = join(line(k.sideSeam(BASE, -5, P, 6), 'faint'), groove(BASE, 0, 5), screws(BASE, 0, 10));
  slab('chassis.base', BASE, -10, 10, 'base', 'One load-bearing beveled chassis.', undefined, 'fixed', baseInner);

  const bridges: { id: SecurityModuleId; ring: Plane[]; route: Plane[] }[] = [
    { id: 'applications', ring: [[-50, -56], [-37, -32], [-37, -24], [-50, -48]], route: [[-50, -52], [-37, -28]] },
    { id: 'infrastructure', ring: [[-9, -62], [15, -62], [15, -34], [-9, -34]], route: [[3, -62], [3, -34]] },
    { id: 'users', ring: [[37, -26], [64, -26], [64, -14], [37, -14]], route: [[64, -20], [37, -20]] },
    { id: 'networks', ring: [[37, 24], [58, 24], [58, 35], [37, 35]], route: [[58, 29.5], [37, 29.5]] },
    { id: 'data', ring: [[-7, 38], [15, 38], [15, 68], [-7, 68]], route: [[4, 68], [4, 38]] },
    { id: 'external', ring: [[-57, 10], [-37, 10], [-37, 24], [-57, 24]], route: [[-57, 17], [-37, 17]] },
  ];
  const channels: SecurityChannel[] = [];
  bridges.forEach((bridge) => {
    add(`bus.${bridge.id}`, { kind: 'extrude', ring: bridge.ring, z: 0, h: 3 }, 'brass', 'A solid bus bridge physically attaches this bay to the core.', bridge.id);
    channels.push({ id: bridge.id, d: k.onTop(bridge.route, 3.05, P), start: at([bridge.route[0][0], bridge.route[0][1], 3.1]), end: at([bridge.route[1][0], bridge.route[1][1], 3.1]), terminals: bridge.route.map(([x, y]) => k.ring(x, y, 1.25, 3.1, P, 20)).join('') });
  });
  PLINTHS.forEach(({ id, plan }) => slab(`seat.${id}`, plan, 0, 4, 'ivory', 'Bolted seating plinth, flush on the shared chassis.', id, 'fixed', join(groove(plan, 4, 2), screws(plan, 4, 3.8))));

  slab('core.pedestal', CORE, 0, 5, 'green', 'The shield bearing and common bus junction.', undefined, 'fixed', join(groove(CORE, 5), screws(CORE, 5, 5)));
  add('core.shield', { kind: 'extrude', ring: SHIELD, z: 5, h: 24 }, 'green', 'A shield-shaped protective shell.', undefined, 'core-insertion', line(k.ringSeam(SHIELD, 13, P), 'faint'));
  add('core.rim', { kind: 'extrude', ring: SHIELD, z: 29, h: 1.1 }, 'brass', 'A flush machined shield rim.', undefined, 'core-insertion');
  add('core.face', { kind: 'extrude', ring: INNER_SHIELD, z: 30.1, h: 1.2 }, 'ivory', 'The shield face carries the inspection instrument.', undefined, 'core-insertion');
  cylinder('core.socket', 0, -4, 14.2, 31.3, 2, 'green', 'A fixed instrument socket.', undefined, 'core-insertion', line(k.sideArc(0, -4, 14.2, 32.1, P), 'faint'));
  cylinder('core.bezel', 0, -4, 12.3, 33.3, 1.8, 'brass', 'A tactile inspection bezel.', undefined, 'core-insertion');
  const ticks = k.radialTicks(0, -4, 9.8, 36, 3, 36.3, [1.1, 2.2], P);
  cylinder('core.lens', 0, -4, 10.4, 35.1, 1.2, 'lens', 'A face-mounted optical inspection instrument.', undefined, 'core-insertion', join(line(k.ring(0, -4, 9.8, 36.3, P, 72), 'lo'), line(ticks.minor, 'lo'), line(ticks.major, 'mid'), dots([[0, -4, 36.3]], 1.05)));
  const dial: Plan = { x: -11, y: 17, w: 22, d: 6.5, r: 1 };
  slab('core.correlation', dial, 31.3, 1.6, 'green', 'A correlation register, mechanically attached to the shield.', undefined, 'core-insertion', join(groove(dial, 32.9, 1), k.faceTextSvg(k.topMatrix([0, 21.9], 32.9, P), 'BUMP', { size: 3, anchor: 'middle', tone: 'hi' })));

  const pcb: Plan = { x: -110, y: -85, w: 57, d: 38, r: 2 };
  slab('applications.pcb', pcb, 4, 1.5, 'green', 'A circuit board carries the software processors.', 'applications', 'fixed', screws(pcb, 5.5, 3.5));
  [{ x: -103, y: -78, w: 18, d: 17, r: 1.7 }, { x: -80, y: -75, w: 18, d: 14, r: 1.5 }].forEach((p, i) => slab(`applications.processor.${i + 1}`, p, 5.5, i ? 4 : 5, 'ivory', 'A seated processor package.', 'applications', 'fixed', join(groove(p, i ? 9.5 : 10.5, 2.5), dots([[p.x + 3, p.y + 3, i ? 9.5 : 10.5]], 0.6))));
  for (let i = 0; i < 4; i++) slab(`applications.contact.${i + 1}`, { x: -110 + i * 14, y: -50, w: 9, d: 3, r: 0.4 }, 5.5, 1.5, 'brass', 'A soldered board connector contact.', 'applications');
  details['applications.pcb'] = join(line(k.onTop([[-104, -60], [-104, -56], [-94, -56], [-94, -50]], 5.55, P), 'lo'), line(k.onTop([[-77, -61], [-77, -56], [-66, -56], [-66, -50]], 5.55, P), 'lo'), dots([[-104, -60, 5.55], [-94, -50, 5.55], [-77, -61, 5.55], [-66, -50, 5.55]], 0.65));

  [{ x: -13, y: -104, w: 24, d: 32, r: 2 }, { x: 15, y: -104, w: 26, d: 32, r: 2 }].forEach((p, i) => {
    slab(`infrastructure.server.${i + 1}`, p, 4, 12, 'green', 'A supported server cartridge.', 'infrastructure', 'fixed', line(k.sideSeam(p, 9, P, 6), 'faint'));
    slab(`infrastructure.lid.${i + 1}`, p, 16, 1.5, 'ivory', 'A screwed server lid with closed cooling vents.', 'infrastructure', 'fixed', join(screws(p, 17.5, 3), slots(p.x + 6, p.y + 8, 4, 3.5, 16, 17.5)));
  });
  slab('infrastructure.cooling', { x: -11, y: -70, w: 22, d: 7, r: 2 }, 4, 3, 'brass', 'The low cooling chamber joins the server bay.', 'infrastructure');
  cylinder('infrastructure.bearing', 0, -66.5, 2.5, 7, 1, 'ink', 'A cooling impeller bearing.', 'infrastructure');
  cylinder('infrastructure.cap', 0, -66.5, 1.5, 8, 1, 'ivory', 'The cooling bearing cap.', 'infrastructure');

  const identity: Plan = { x: 68, y: -57, w: 50, d: 39, r: 3 };
  slab('users.identity', identity, 4, 2, 'green', 'An identity verification carrier.', 'users', 'fixed', screws(identity, 6, 3));
  [{ x: 72, y: -53, w: 13, d: 25, r: 1.5 }, { x: 88, y: -53, w: 13, d: 25, r: 1.5 }].forEach((p, i) => slab(`users.role.${i + 1}`, p, 6, 1.4, 'ivory', 'A seated role key.', 'users', 'fixed', join(line(k.ring(p.x + 6.5, p.y + 7, 2.7, 7.4, P, 24), 'mid'), slots(p.x + 3, p.y + 14, 2, 4, 5, 7.4))));
  slab('users.socket', { x: 105, y: -52, w: 9, d: 17, r: 2 }, 6, 4, 'brass', 'A role-verification lock socket.', 'users', 'fixed', groove({ x: 105, y: -52, w: 9, d: 17, r: 2 }, 10, 2));
  slab('users.gate', { x: 77, y: -25, w: 29, d: 3, r: 0.5 }, 7, 2, 'brass', 'The supported identity gate closes after correction.', 'users', 'identity-lock');
  [73, 106].forEach((x, i) => slab(`users.support.${i + 1}`, { x, y: -27, w: 4, d: 7, r: 0.6 }, 6, 4, 'ivory', 'A gate bearing, held by the identity plate.', 'users'));

  for (let i = 0; i < 3; i++) {
    const p = { x: 63 + i * 18, y: 29, w: 14, d: 25, r: 2 };
    slab(`networks.socket.${i + 1}`, p, 4, 6, 'ivory', 'A network socket housing.', 'networks', 'fixed', screws(p, 10, 2.8));
    slab(`networks.port.${i + 1}`, { x: 66 + i * 18, y: 33, w: 8, d: 13, r: 1 }, 10, 0.8, 'ink', 'An inset network port, flush on its socket.', 'networks', 'fixed', slots(67 + i * 18, 35, 3, 2.2, 7, 10.8));
  }

  slab('data.floor', { x: -11, y: 73, w: 51, d: 34, r: 2 }, 4, 3, 'green', 'The actual floor of the secure compartment.', 'data');
  slab('data.wall.left', { x: -11, y: 73, w: 3, d: 34, r: 0.5 }, 7, 11, 'ivory', 'The left wall supports the sliding hatch.', 'data');
  slab('data.wall.right', { x: 37, y: 73, w: 3, d: 34, r: 0.5 }, 7, 11, 'ivory', 'The right wall supports the sliding hatch.', 'data');
  slab('data.wall.rear', { x: -8, y: 73, w: 45, d: 3, r: 0.5 }, 7, 11, 'ivory', 'A rear closure for the secure compartment.', 'data');
  const hatch: Plan = { x: -10, y: 76, w: 49, d: 31, r: 2 };
  slab('data.hatch', hatch, 18, 2, 'ivory', 'A captive hatch, supported by both compartment walls.', 'data', 'hatch', join(groove(hatch, 20, 2.6), screws(hatch, 20, 4), line(k.ring(23, 90.5, 3, 20, P, 32), 'lo')));
  const gate: Plan = { x: -3, y: 98, w: 30, d: 8, r: 1 };
  slab('data.permission', gate, 7, 7, 'brass', 'A permission selector shifts four units and is reseated.', 'data', 'permission', join(groove(gate, 14, 1.5), dots([[1, 102, 14], [22, 102, 14]], 0.7)));
  slab('data.bolt', { x: 2, y: 88, w: 18, d: 5, r: 0.8 }, 20, 2, 'green', 'A retaining latch remains fixed to its moving hatch.', 'data', 'hatch', line(k.planOutline({ x: 5, y: 89.3, w: 11, d: 2.4, r: 0.7 }, 22, P, 4), 'faint'));

  for (let i = 0; i < 2; i++) {
    slab(`external.dock.${i + 1}`, { x: -117, y: 9 + i * 20, w: 25, d: 15, r: 2 }, 4, 5, 'green', 'A physical integration dock.', 'external', 'fixed', groove({ x: -117, y: 9 + i * 20, w: 25, d: 15, r: 2 }, 9, 2));
    slab(`external.plug.${i + 1}`, { x: -92, y: 11 + i * 20, w: 22, d: 11, r: 1.5 }, 4, 6, 'ivory', 'A removable integration plug, seated against its dock.', 'external', 'fixed', slots(-89, 14 + i * 20, 4, 4, 5, 10));
    slab(`external.tongue.${i + 1}`, { x: -70, y: 13 + i * 20, w: 8, d: 7, r: 0.6 }, 4, 2, 'brass', 'The plug contact tongue remains attached to the plug.', 'external');
  }
  cylinder('external.retainer', -65, 45, 3, 4, 3, 'brass', 'A captive retaining knob secures the external bay.', 'external', 'fixed', line(k.ring(-65, 45, 1.8, 7, P, 24), 'lo'));

  PLINTHS.forEach(({ id, lamp }) => {
    cylinder(`indicator.${id}.bezel`, lamp[0], lamp[1], 2.5, lamp[2], 1.2, 'ink', 'The status lens has a real mounted bezel.', id);
    cylinder(`indicator.${id}.lens`, lamp[0], lamp[1], 1.7, lamp[2] + 1.2, 0.65, 'lens', 'A mounted status indicator, also described in text.', id);
  });
  parts.sort((a, b) => a.key - b.key);
  const needleAt = (angle: number) => k.lineOnTop([Math.sin(angle) * -1.6, -4 + Math.cos(angle) * 1.6], [Math.sin(angle) * 7.4, -4 - Math.cos(angle) * 7.4], 36.4, P);
  return { mode, width, height, P, parts, details, channels, halo: k.haloOf(BASE, -15, 9, P), hitAreas: PLINTHS.map(({ id, plan }) => ({ id, d: k.slabOf(plan, 4, 19, P, 6).fill })), needleAt, needleCenter: at([0, -4, 36.4]), solidCount: parts.length };
}

export const SECURITY_GEOMETRY = { desktop: buildSecurityGeometry('desktop'), mobile: buildSecurityGeometry('mobile') };
export const SECURITY_MOVES = MOVES;
