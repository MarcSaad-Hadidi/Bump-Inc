import * as k from '../../anatomy/kit/iso-kit';
import * as G from '../../anatomy/kit/lathe.mjs';
import { COMPACT_LAYOUT, DESKTOP_LAYOUT, cartridgeMove, type Move3, type WorkshopLayout, type WorkshopPose } from './model';
export { poseAt } from './model';

export type WorkshopAssembly = 'fixed' | 'project' | 'head' | 'probe-slide' | 'probe' | 'pen-slide' | 'pen' | 'driver-slide' | 'driver' | 'cover' | 'clamp-left' | 'clamp-right' | 'cartridge-0' | 'cartridge-1' | 'cartridge-2' | 'service';
export type WorkshopMaterial = 'bed' | 'ivory' | 'green' | 'brass' | 'steel' | 'ink';
export type ShapeRecord =
  | { kind: 'slab'; plan: k.Plan; z: number; h: number; steps: number }
  | { kind: 'cylinder'; x: number; y: number; r: number; z: number; h: number }
  | { kind: 'slide'; origin: k.Point3; axis: k.Point3; from: number; to: number; r: number; stroke: number };

export interface WorkshopPart {
  id: string;
  assembly: WorkshopAssembly;
  material: WorkshopMaterial;
  at: k.Point3;
  svg: string;
  shape: ShapeRecord;
  key: number;
  detail?: boolean;
}
export interface WorkshopGeometry {
  width: number;
  height: number;
  projection: k.Projection;
  layout: WorkshopLayout;
  parts: WorkshopPart[];
  halo: string;
  plan: string;
  planLength: number;
  penRoute: readonly k.Plane[];
  gaugeFace: string;
  gaugeNeedle: string;
  wheelFace: string;
  serviceFace: string;
  adjustmentFace: string;
  sortBadge: string;
}

const planOf = (x: number, y: number, w: number, d: number, r = 1.6): k.Plan => ({ x, y, w, d, r });

function buildWorkshop(layout: WorkshopLayout): WorkshopGeometry {
  const compact = layout.compact;
  const width = compact ? 600 : 960;
  const height = compact ? 510 : 600;
  const bed = compact ? planOf(-164, -97, 328, 250, 10) : planOf(-228, -98, 456, 196, 12);
  const beamFrom = bed.x + 22;
  const beamTo = bed.x + bed.w - 22;
  const beamY = layout.beamY;
  const beamZ = layout.beamZ;
  const P = k.fitProjection([
    ...k.boxCorners(bed, -20, 0),
    ...k.boxCorners(planOf(beamFrom - 4, beamY - 9, beamTo - beamFrom + 8, 18), beamZ, beamZ + 26),
    [layout.supplyX + 46, layout.supplyY + 41, 68],
  ], width, height, { pad: compact ? 20 : 34, azimuth: compact ? 43 : 53, elevation: compact ? 37 : 31 });
  const at = (p: k.Point3) => k.iso(p, P);
  const parts: WorkshopPart[] = [];
  const ln = (d: string, tone: k.LineTone = 'lo', free?: boolean | 'start' | 'end') => k.lineSvg(d, { tone, free });
  const spokes = '<path d="M-6 0H6M0-6V6M-4.2-4.2L4.2 4.2M-4.2 4.2L4.2-4.2" class="iso-line" data-tone="lo"/><circle r="1.4" class="mw-hub"/>';
  const dots = (pts: k.Point3[], size = .55) => k.dotsSvg(pts.map(at), { size, tone: 'mid' });
  const screws = (pts: k.Point3[], radius = 1.5) => ln(pts.map(([x, y, z]) => k.ring(x, y, radius, z, P, 16)).join('')) + dots(pts, .45) + ln(pts.map(([x, y, z]) => k.lineOnTop([x - radius * .5, y], [x + radius * .5, y], z + .01, P)).join(''));
  const perimeterScrews = (plan: k.Plan, z: number, inset = 4) => screws(k.corners(plan, inset).map(([x, y]) => [x, y, z]));
  function addSlab(id: string, plan: k.Plan, z: number, h: number, material: WorkshopMaterial, assembly: WorkshopAssembly = 'fixed', inner = '', steps = 5, bevel = .65, detail = false) {
    const shape: ShapeRecord = { kind: 'slab', plan, z, h, steps };
    const paths = k.slabOf(plan, z, h, P, steps, bevel);
    const centre: k.Point3 = [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];
    parts.push({ id, assembly, material, at: centre, shape, key: k.depthOf(centre, P), detail, svg: k.solidSvg(paths, { tone: material === 'ivory' ? 'mid' : 'lo', crease: 'faint', inner }) });
  }
  function addCylinder(id: string, x: number, y: number, r: number, z: number, h: number, material: WorkshopMaterial, assembly: WorkshopAssembly = 'fixed', inner = '', steps = 40, bevel = .35, detail = false) {
    const centre: k.Point3 = [x, y, z + h / 2];
    parts.push({ id, assembly, material, at: centre, shape: { kind: 'cylinder', x, y, r, z, h }, key: k.depthOf(centre, P), detail, svg: k.solidSvg(k.cylinder(x, y, r, z, h, P, steps, bevel), { tone: 'lo', crease: 'faint', inner }) });
  }
  function addRod(id: string, origin: k.Point3, to: number, r: number, stroke: number, material: WorkshopMaterial, assembly: WorkshopAssembly) {
    const axis: k.Point3 = [0, 0, -1];
    const frame = G.frameAlong(origin, axis);
    const rod = G.rodOut(frame, 0, to, r, P, { stroke, steps: 28, bevel: .2 });
    const shape: ShapeRecord = { kind: 'slide', origin, axis, from: 0, to, r, stroke };
    const centre: k.Point3 = [origin[0], origin[1], origin[2] - to / 2];
    const clipId = `__MWID__-${id}`;
    parts.push({ id, assembly, material, shape, at: centre, key: k.depthOf(centre, P), svg: `<defs><clipPath id="${clipId}"><path data-hold d="${rod.clip}"/></clipPath></defs><g clip-path="url(#${clipId})">${k.solidSvg(rod.paths, { tone: 'mid', crease: 'none' })}</g>` });
  }

  // A cast bed on four levelling feet. Its ribs are actual support parts.
  const feet = k.corners(bed, 24).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  feet.forEach(([x, y], index) => {
    addCylinder(`stand.foot-pad-${index}`, x, y, 8, -20, 3, 'ink');
    addCylinder(`stand.foot-stem-${index}`, x, y, 5.6, -17, 5, 'brass', 'fixed', ln(k.sideArc(x, y, 5.6, -14, P)));
  });
  for (const y of [-62, 58]) addSlab(`stand.stiffener-${y}`, planOf(bed.x + 26, y, bed.w - 52, 8, 2), -16, 4, 'steel');
  addSlab('stand.bed', bed, -12, 12, 'bed', 'fixed', ln(k.planOutline(k.insetPlan(bed, 5.5), 0, P), 'faint') + perimeterScrews(bed, 0, 10), 9, 1.5);
  const rule = planOf(bed.x + 30, compact ? 130 : 79, bed.w - (compact ? 60 : 130), 7, 1);
  const ticks = k.topTicks(rule.x + 4, rule.x + rule.w - 4, 4, 5, rule.y + .1, .8, [2, 4], P);
  addSlab('stand.rule', rule, 0, .8, 'brass', 'fixed', ln(ticks.minor, 'lo') + ln(ticks.major, 'mid') + screws([[rule.x + 2, rule.y + 3.5, .8], [rule.x + rule.w - 2, rule.y + 3.5, .8]], .9), 3, .1);
  const plate = planOf(bed.x + 26, compact ? 3 : 55, 53, 13, 1.4);
  addSlab('stand.makers-plate', plate, 0, .8, 'brass', 'fixed', screws([[plate.x + 3.5, plate.y + 6.5, .8], [plate.x + 49.5, plate.y + 6.5, .8]], .8) + k.faceTextSvg(k.topMatrix([plate.x + 26.5, plate.y + 8.5], .85, P), 'BUMP  /  01', { size: 4, anchor: 'middle', tone: 'lo' }), 4, .2);

  // Two prismatic rails and four individual stops. The moving pallet sits on four bearings.
  for (const y of [-25, 24]) {
    const rail = planOf(beamFrom - 5, y - 3, beamTo - beamFrom + 10, 6, 1.4);
    addSlab(`rail-${y}`, rail, 0, 7, 'steel', 'fixed', ln(k.lineOnTop([rail.x, y], [rail.x + rail.w, y], 7, P), 'faint'), 4, .5);
    [rail.x, rail.x + rail.w - 6].forEach((x, index) => {
      const stop = planOf(x, y - 6, 6, 12, 1.4);
      addSlab(`stop-${y}-${index}`, stop, 7, 7, 'green', 'fixed', screws([[x + 3, y, 14]], 1.2), 4, .4);
    });
  }
  const gearX = bed.x + bed.w - 19;
  addSlab('feed.gearbox', planOf(gearX - 9, -14, 18, 28, 3), 0, 13, 'green', 'fixed', ln(k.sideSeam(planOf(gearX - 9, -14, 18, 28, 3), 8, P, 5), 'faint') + screws([[gearX - 5, -9, 13], [gearX + 5, 9, 13]], 1), 5, .7);
  addCylinder('feed.wheel', gearX, 0, 10, 13, 4, 'brass', 'fixed', ln(k.knurl(gearX, 0, 10, 13, 17, 44, P, .1)) + ln(k.ring(gearX, 0, 7.3, 17, P)) + `<g class="mw-wheel-plane" transform="${k.topMatrix([gearX, 0], 17.2, P)}"><g data-feed-spin><g transform="scale(1.2)">${spokes}</g></g></g>`);

  // Gantry posts, their bolted shoes, a guide beam, and true travel stops.
  [beamFrom, beamTo].forEach((x, index) => {
    const shoe = planOf(x - 11, beamY - 12, 22, 24, 3);
    addSlab(`gantry.shoe-${index}`, shoe, 0, 5, 'brass', 'fixed', perimeterScrews(shoe, 5, 4), 5, .7);
    const post = planOf(x - 5, beamY - 5, 10, 10, 1.8);
    addSlab(`gantry.post-${index}`, post, 5, beamZ - 5, 'green', 'fixed', ln(k.sideSeam(post, 26, P, 5), 'faint'), 5, .7);
  });
  const beam = planOf(beamFrom - 8, beamY - 5, beamTo - beamFrom + 16, 10, 2);
  const beamRule = k.topTicks(beam.x + 12, beam.x + beam.w - 12, 4, 5, beam.y + .2, beamZ + 10, [1.7, 3.5], P);
  addSlab('gantry.beam', beam, beamZ, 10, 'steel', 'fixed', ln(beamRule.minor, 'lo') + ln(beamRule.major, 'mid') + screws([[beamFrom, beamY, beamZ + 10], [beamTo, beamY, beamZ + 10]], 1.7), 5, .7);
  [beamFrom + 6, beamTo - 10].forEach((x, index) => addSlab(`gantry.stop-${index}`, planOf(x, beamY - 7, 4, 14, .8), beamZ + 10, 4, 'brass', 'fixed', '', 3, .3));

  // X carriage and Y cross-slide: all tools use this single piece of structure.
  [-16, 8].forEach((x, index) => addSlab(`head.bearing-${index}`, planOf(x, beamY - 7, 8, 14, 1.5), beamZ + 10, 8, 'brass', 'head', screws([[x + 4, beamY, beamZ + 18]], 1.2), 4, .4));
  addSlab('head.carriage', planOf(-20, beamY - 8, 40, 16, 3), beamZ + 18, 8, 'green', 'head', screws([[-14, beamY, beamZ + 26], [14, beamY, beamZ + 26]], 1.4) + ln(k.planOutline(planOf(-7, beamY - 4, 14, 8, 2), beamZ + 26, P), 'faint'), 5, .8);
  const armZ = beamZ + 20;
  const cross = planOf(-20, beamY + 8, 40, compact ? 160 : 112, 3);
  addSlab('head.cross-slide', cross, armZ, 5, 'steel', 'head', ln(k.planOutline(planOf(-4, cross.y + 4, 8, cross.d - 8, 2), armZ + 5, P), 'faint') + screws([[-14, cross.y + 6, armZ + 5], [14, cross.y + 6, armZ + 5], [-14, cross.y + cross.d - 6, armZ + 5], [14, cross.y + cross.d - 6, armZ + 5]], 1.1), 5, .7);
  addSlab('head.pen-slide', planOf(-6, -6, 12, 12, 2), armZ + 5, 5, 'brass', 'pen-slide', screws([[0, 0, armZ + 10]], 1.5), 4, .4);
  addCylinder('head.probe-housing', -14, 0, 5.7, 83, armZ - 83, 'green', 'probe-slide', ln(k.sideArc(-14, 0, 5.7, 91, P), 'faint'));
  addCylinder('head.probe-gland', -14, 0, 6.6, 80, 3, 'brass', 'probe-slide', ln(k.ring(-14, 0, 2.2, 80, P)));
  addRod('probe-rod', [-14, 0, 80], 14, 1.65, 24, 'steel', 'probe');
  addCylinder('probe-pad', -14, 0, 4.3, 63, 3, 'ivory', 'probe', ln(k.ring(-14, 0, 2.8, 66, P), 'faint'), 40, .2);
  addRod('pen-barrel', [0, 0, armZ], armZ - 72, 2.3, 49, 'ink', 'pen');
  addCylinder('pen-nib', 0, 0, .75, 69, 3, 'brass', 'pen', '', 20, .05);
  addCylinder('head.driver-housing', 14, 0, 5.4, 124, armZ - 124, 'green', 'driver-slide', ln(k.sideArc(14, 0, 5.4, 130, P), 'faint'));
  addRod('driver-shaft', [14, 0, 124], 50, 2, 30, 'steel', 'driver');
  addCylinder('driver-collar', 14, 0, 3.8, 72, 2, 'brass', 'driver', ln(k.knurl(14, 0, 3.8, 72, 74, 18, P, .05)), 32, .2);
  addCylinder('driver-torque-cap', 14, 0, 3.1, 69, 3, 'ink', 'driver', '', 28, .2);

  // The one persistent project: green outline, ivory insert, datum and supported cartridges.
  for (const x of [-39, 31]) for (const y of [-25, 24]) {
    const bearing = planOf(x, y - 5, 8, 10, 1.6);
    addSlab(`project.bearing-${x}-${y}`, bearing, 7, 6, 'brass', 'project', screws([[x + 4, y, 13]], 1), 4, .4);
  }
  const cassette = planOf(-53, -40, 106, 80, 5);
  addSlab('project.cassette', cassette, 13, 9, 'green', 'project', ln(k.sideSeam(cassette, 18, P, 7), 'faint') + perimeterScrews(cassette, 22, 6), 7, 1);
  const insert = planOf(-46, -33, 92, 66, 3.2);
  addSlab('project.insert', insert, 22, 2, 'ivory', 'project', ln(k.planOutline(k.insetPlan(insert, 2), 24, P), 'faint'), 6, .45);
  [-1, 1].forEach((side) => {
    const cleat = planOf(side < 0 ? -60 : 52, -14, 8, 28, 1.5);
    addSlab(`project.locating-cleat-${side}`, cleat, 22, 28, 'steel', 'project', screws([[cleat.x + 4, -8, 50], [cleat.x + 4, 8, 50]], 1), 4, .5);
    const clamp = planOf(side < 0 ? -59 : 42, -4, 17, 8, 1.6);
    addSlab(`project.hold-down-${side}`, clamp, 50, 3, 'brass', side < 0 ? 'clamp-left' : 'clamp-right', screws([[side < 0 ? -55 : 55, 0, 53]], 1.5), 4, .4);
  });
  [-28, 0, 28].forEach((x, index) => {
    const guide = planOf(x - 3, -72, 6, 144, 1.2);
    addSlab(`project.guide-${index}`, guide, 24, 1.1, 'brass', 'project', ln(k.planOutline(k.insetPlan(guide, 1), 25.1, P), 'faint'), 4, .1);
    const module = planOf(x - 10, -13, 20, 26, 2.2);
    const assembly = `cartridge-${index}` as WorkshopAssembly;
    addSlab(`project.cartridge-${index}`, module, 25.2, 11.9, index === 1 ? 'green' : 'steel', assembly, ln(k.sideSeam(module, 32, P, 5), 'faint'), 5, .6);
    const cap = k.insetPlan(module, .8);
    const vents = [0, 1, 2].map((i) => k.planOutline(planOf(cap.x + 4, cap.y + 5 + i * 4.2, cap.w - 8, 1.5, .75), 39.1, P, 3)).join('');
    addSlab(`project.cartridge-lid-${index}`, cap, 37.1, 2, index === 1 ? 'ivory' : 'green', assembly, ln(vents, 'faint') + screws([[x - 6, -9, 39.1], [x + 6, 9, 39.1]], .9), 5, .25);
  });
  addSlab('project.plan-sheet', planOf(-41, -28, 82, 56, 2), 25.1, .1, 'ivory', 'project', '', 5, .05);
  addCylinder('project.datum', -37, 36, 2.7, 22, 7, 'brass', 'project', ln(k.ring(-37, 36, 1.3, 29, P)), 28, .25);

  // An open protection frame waits on a real fixture, then seats on the cassette.
  addSlab('frame.back-bridge', planOf(-47, -36, 94, 7, 1.5), 50, 5, 'green', 'cover', screws([[-41, -32.5, 55], [41, -32.5, 55]], 1.2), 5, .6);
  [-1, 1].forEach((side) => {
    const panel = planOf(side < 0 ? -47 : 42, -29, 5, 58, 1);
    addSlab(`frame.side-${side}`, panel, 24, 26, 'green', 'cover', ln(k.sideSeam(panel, 32, P, 5), 'faint') + screws([[panel.x + 2.5, -22, 50], [panel.x + 2.5, 22, 50]], .9), 5, .6);
  });
  const supply = planOf(layout.supplyX - 49, layout.supplyY - 39, 98, 78, 4);
  for (const y of compact ? [-21, 28] : [-29, 27]) addSlab(`supply.support-${y}`, planOf(layout.supplyX - 36, layout.supplyY + y, 72, 7, 1.8), 0, 20, 'steel', 'fixed', '', 4, .4);
  addSlab('supply.tray', supply, 20, 5, 'bed', 'fixed', ln(k.planOutline(k.insetPlan(supply, 4), 25, P), 'faint') + screws([[supply.x + 7, supply.y + 71, 25], [supply.x + supply.w - 7, supply.y + 71, 25]], 1), 6, .7);

  // A face-up analogue indicator is legible without floating labels or a fake dashboard.
  const gx = layout.gaugeX;
  const gy = compact ? 96 : 73;
  const pedestal = planOf(gx - 22, gy - 21, 44, 42, 4);
  addSlab('gauge.pedestal', pedestal, 0, 5, 'green', 'fixed', perimeterScrews(pedestal, 5, 5), 6, .7);
  addCylinder('gauge.neck', gx, gy, 6, 5, 13, 'brass', 'fixed', ln(k.sideArc(gx, gy, 6, 14, P), 'faint'));
  const gt = 27;
  const radial = k.radialTicks(gx, gy, 18, 40, 5, gt, [1.2, 2.5], P);
  addCylinder('gauge.body', gx, gy, 21, 18, 9, 'ivory', 'fixed', ln(k.sideArc(gx, gy, 21, 23.8, P), 'faint') + ln(k.knurl(gx, gy, 21, 23.8, 27, 72, P, .1)) + ln(k.ring(gx, gy, 18, gt, P)) + ln(radial.minor) + ln(radial.major, 'mid') + dots([[gx, gy, gt]], 1.2), 72, .8);
  addCylinder('gauge.crown', gx + 24, gy, 3.4, 18, 7, 'brass', 'fixed', ln(k.knurl(gx + 24, gy, 3.4, 18, 25, 18, P, .1)), 32, .2);

  // Calibration column and a supported sliding service arm reach the completed frame.
  const sx = layout.serviceX;
  const tx = layout.stations[4] + 44;
  const serviceBase = planOf(sx - 10, 43, 20, 26, 3);
  addSlab('service.foot', serviceBase, 0, 4, 'brass', 'fixed', perimeterScrews(serviceBase, 4, 4), 5, .5);
  addCylinder('service.column', sx, 52, 4, 4, 58, 'steel', 'fixed', ln(k.sideArc(sx, 52, 4, 47, P), 'faint'));
  addSlab('service.collar', planOf(sx - 8, 27, 16, 46, 2.4), 62, 5, 'green', 'fixed', screws([[sx, 69, 67]], 1.4), 5, .5);
  addSlab('service.arm', planOf(tx - 4, 25, sx - tx + 12, 33, 2), 67, 5, 'steel', 'service', screws([[sx, 52, 72]], 1.1), 5, .5);
  addCylinder('service.adjustment-key', tx, 27, 2, 50, 17, 'steel', 'service', '', 28, .1);
  addCylinder('service.wheel', tx, 33, 6.2, 72, 4, 'brass', 'service', ln(k.knurl(tx, 33, 6.2, 72, 76, 28, P, .05)) + ln(k.ring(tx, 33, 4.3, 76, P)) + `<g class="mw-wheel-plane" transform="${k.topMatrix([tx, 33], 76.1, P)}"><g data-service-spin>${spokes}</g></g>`, 44, .3);

  // Exact pen route. It closes the drawing and ends at the plotted datum.
  const penRoute: k.Plane[] = [[-28, 24], [-28, -24], [28, -24], [28, 24], [-28, 24], [-28, 0], [28, 0], [28, 24]];
  const planD = k.onTop(penRoute, 25.25, P);
  const length = penRoute.slice(1).reduce((total, point, index) => total + Math.hypot(point[0] - penRoute[index][0], point[1] - penRoute[index][1]), 0);
  const plans = [-28, 0, 28].map((x) => k.planOutline(planOf(x - 10, -13, 20, 26, 2), 25.26, P, 5)).join('');
  return {
    width, height, projection: P, layout, parts: parts.sort((a, b) => a.key - b.key),
    halo: k.haloOf(k.insetPlan(bed, 2), -20, 6, P),
    plan: ln(planD, 'mid') + ln(plans, 'faint'), planLength: length, penRoute,
    gaugeFace: k.topMatrix([gx, gy], gt + .2, P), gaugeNeedle: 'M0 3.5L0 -14.5',
    wheelFace: k.topMatrix([gearX, 0], 17.2, P),
    serviceFace: k.topMatrix([tx, 33], 76.1, P),
    adjustmentFace: k.topMatrix([tx, 33], 50.2, P),
    sortBadge: k.planOutline(planOf(-6, -6, 12, 12, 2), 39.1, P, 4),
  };
}

export const DESKTOP_WORKSHOP = buildWorkshop(DESKTOP_LAYOUT);
export const COMPACT_WORKSHOP = buildWorkshop(COMPACT_LAYOUT);

export function assemblyOffset(assembly: WorkshopAssembly, p: WorkshopPose): Move3 {
  switch (assembly) {
    case 'fixed': return [0, 0, 0];
    case 'project': return [p.projectX, 0, 0];
    case 'head': return [p.headX, 0, 0];
    case 'probe-slide': return [p.headX, p.probeY, 0];
    case 'probe': return [p.headX, p.probeY, -p.probeDrop];
    case 'pen-slide': return [p.headX, p.penY, 0];
    case 'pen': return [p.headX, p.penY, -p.penDrop];
    case 'driver-slide': return [p.headX, p.driverY, 0];
    case 'driver': return [p.headX, p.driverY, -p.driverDrop];
    case 'cover': return [p.coverX, p.coverY, p.coverLift];
    case 'clamp-left': return [p.projectX, (1 - p.clamp) * -14, 0];
    case 'clamp-right': return [p.projectX, (1 - p.clamp) * 14, 0];
    case 'service': return [0, (1 - p.service) * 15, 0];
    default: {
      const index = Number(assembly.slice(-1));
      const local = cartridgeMove(index, p.sort);
      return [p.projectX + local[0], local[1], local[2]];
    }
  }
}

/** No geometry is rebuilt during playback: only precomputed paths are translated. */
export function offsetOnScreen(P: k.Projection, offset: Move3): k.Flat {
  const zero = k.iso([0, 0, 0], P);
  const point = k.iso(offset, P);
  return [point[0] - zero[0], point[1] - zero[1]];
}

export function partDepth(part: WorkshopPart, offset: Move3, P: k.Projection) {
  const raw = k.depthOf([part.at[0] + offset[0], part.at[1] + offset[1], part.at[2] + offset[2]], P);
  // These continuous ground planes must precede every supported object, regardless of their centroid.
  if (part.id === 'stand.bed') return -9000;
  if (part.id.startsWith('stand.foot-')) return -9500 + raw;
  if (part.id.startsWith('stand.stiffener')) return -9200 + raw;
  if (part.id === 'stand.rule' || part.id === 'stand.makers-plate') return -8500 + raw;
  if (part.id.startsWith('rail-')) return -8000 + raw;
  return raw;
}
