import * as K from '../../anatomy/kit/iso-kit';
import * as G from '../../anatomy/kit/lathe.mjs';
import { stationModel, type PartSpec, type ShapeSpec, type ToolId } from './model';
import { INTEGRATION_ORDER } from './order-keys';

export interface DetailLine { d: string; tone?: K.LineTone; free?: boolean; className?: string }
export interface PartArt extends PartSpec {
  paths: K.SolidPaths;
  lines: DetailLine[];
  dots: K.Flat[];
  text?: { transform: string; value: string; size: number };
  needleFrames?: string[];
  indicatorPoint?: K.Flat;
  key: number;
  lift: number;
}

function geometry(mobile: boolean) {
  const model = stationModel(mobile);
  const P = K.fitProjection(K.boxCorners(model.base, -12, 48), model.width, model.height, { pad: mobile ? 13 : 18, azimuth: mobile ? 52 : 70, elevation: mobile ? 48 : 30 });
  const at = (p: K.Point3) => K.iso(p, P);
  const vector = (move: K.Point3): K.Flat => { const a = at([0, 0, 0]); const b = at(move); return [b[0] - a[0], b[1] - a[1]]; };
  const pathFor = (shape: ShapeSpec) => {
    if (shape.kind === 'slab') return K.slabOf(shape.plan, shape.z, shape.h, P, 6, shape.bevel || 0);
    if (shape.kind === 'cylinder') return K.cylinder(shape.x, shape.y, shape.r, shape.z, shape.h, P, 48, .3);
    const F = G.frameAlong(shape.origin, shape.axis);
    return G.disc(shape.from, shape.to, shape.r, F, P, { steps: 48 });
  };
  const needle = (centre: K.Point3, radius: number) => Array.from({ length: 321 }, (_, frame) => {
    const a = (-140 + (frame / 320) * 140) * Math.PI / 180;
    return K.lineOnTop([centre[0], centre[1]], [centre[0] + Math.cos(a) * radius, centre[1] + Math.sin(a) * radius], centre[2] + .03, P);
  });
  const parts: PartArt[] = model.parts.map((spec) => {
    const paths = pathFor(spec.shape);
    const lines: DetailLine[] = [];
    const dots: K.Flat[] = [];
    const art: PartArt = { ...spec, paths, lines, dots, key: INTEGRATION_ORDER[mobile ? 'mobile' : 'desktop']?.[spec.id] ?? K.depthOf(spec.at, P), lift: spec.move ? K.depthOf(spec.move, P) - K.depthOf([0, 0, 0], P) : 0 };
    const shape = spec.shape;
    const dock = model.docks.find((d) => d.id === spec.tool);
    if (spec.detail === 'base' && shape.kind === 'slab') {
      lines.push({ d: K.planOutline(K.insetPlan(shape.plan, 4), 0, P, 6), tone: 'faint' });
      K.corners(shape.plan, 8).forEach(([x, y]) => {
        lines.push({ d: K.ring(x, y, 1.5, 0, P, 24), tone: 'lo' });
        dots.push(at([x, y, 0]));
      });
    }
    if (spec.detail === 'housing' && shape.kind === 'slab') {
      // The seam follows the box's own corners; it never stops on a bare face.
      lines.push({ d: K.sideSeam(shape.plan, shape.z + shape.h - 3.3, P, 6), tone: 'faint' });
      // Closed cooling slots on the top belong to each physical lid.
    }
    if (spec.detail === 'lid' && shape.kind === 'slab' && dock) {
      const z = shape.z + shape.h;
      K.corners(shape.plan, 3).forEach(([x, y]) => {
        lines.push({ d: K.ring(x, y, .85, z, P, 16), tone: 'faint' });
        dots.push(at([x, y, z]));
      });
      for (let row = 0; row < 3; row++) lines.push({ d: K.planOutline({ x: dock.x - 18, y: dock.y + 17 + row * 3.1, w: 25, d: 1, r: .5 }, z, P, 3), tone: 'lo' });
      art.text = { transform: K.topMatrix([dock.x - 18, dock.y + 11], z + .02, P), value: dock.engraving, size: mobile ? 5.7 : 5.3 };
      lines.push({ d: K.ring(dock.needle[0], dock.needle[1], 5.3, z, P, 48), tone: 'lo' });
      lines.push({ d: K.ring(dock.needle[0], dock.needle[1], 4.2, z, P, 48), tone: 'faint' });
      const ticks = K.radialTicks(dock.needle[0], dock.needle[1], 3.6, 8, 2, z, [.6, 1], P);
      lines.push({ d: ticks.minor, tone: 'lo' }, { d: ticks.major, tone: 'mid' });
      dots.push(at(dock.needle));
      art.indicatorPoint = at(dock.needle);
      art.needleFrames = needle(dock.needle, 3.2);
    }
    if (spec.detail === 'collar' && shape.kind === 'slab') {
      const z = shape.z + shape.h;
      lines.push({ d: K.planOutline(K.insetPlan(shape.plan, 1.2), z, P, 3), tone: 'lo' });
      K.corners(shape.plan, 1.9).forEach(([x, y]) => dots.push(at([x, y, z])));
    }
    if ((spec.detail === 'port' || spec.detail === 'stem') && shape.kind === 'disc') {
      const F = G.frameAlong(shape.origin, shape.axis);
      const r = shape.r;
      if (spec.detail === 'port') lines.push({ d: G.circleOf(F, 0, 6.6, P, 64), tone: 'mid' });
      if (spec.detail === 'stem') {
        [shape.to - 2.2, shape.to - 4.5].forEach((s) => lines.push({ d: G.arcOf(F, s, r, P), tone: 'faint' }));
      }
    }
    if (spec.detail === 'core' && shape.kind === 'cylinder') {
      const z = shape.z + shape.h;
      lines.push({ d: K.ring(shape.x, shape.y, 7.5, z, P, 64), tone: 'mid' });
      const ticks = K.radialTicks(shape.x, shape.y, 7, 16, 4, z, [1, 1.6], P);
      lines.push({ d: ticks.minor, tone: 'lo' }, { d: ticks.major, tone: 'mid' });
      dots.push(at([shape.x, shape.y, z]));
      art.needleFrames = needle([shape.x, shape.y, z], 6.2);
    }
    if (spec.detail === 'cap' && shape.kind === 'slab') {
      // Five closed contact channels share the same physical bus, without loose wires.
      [4, 8.5, 13, 17.5, 22].forEach((dy) => lines.push({ d: K.planOutline({ x: shape.plan.x + 3, y: shape.plan.y + dy - .6, w: shape.plan.w - 6, d: 1.2, r: .6 }, 29.02, P, 3), tone: 'faint' }));
    }
    if (spec.detail === 'plate' && shape.kind === 'slab') {
      const z = shape.z + shape.h;
      lines.push({ d: K.planOutline(K.insetPlan(shape.plan, 1), z, P, 3), tone: 'lo' });
      dots.push(at([shape.plan.x + 3, shape.plan.y + shape.plan.d / 2, z]), at([shape.plan.x + shape.plan.w - 3, shape.plan.y + shape.plan.d / 2, z]));
      art.text = { transform: K.topMatrix([shape.plan.x + 8, shape.plan.y + shape.plan.d / 2 + 1.2], z + .02, P), value: 'BUMP / INTEGRATION', size: 2.9 };
    }
    return art;
  });
  const moduleMoves = Object.fromEntries(model.docks.map((dock) => [dock.id, vector(dock.move)])) as Record<ToolId, K.Flat>;
  const collarMoves = Object.fromEntries(model.docks.map((dock) => [dock.id, vector(dock.collarMove)])) as Record<ToolId, K.Flat>;
  const signals = model.docks.map((dock, index) => {
    const y = model.cap.y + [4, 8.5, 13, 17.5, 22][index];
    const start = at([dock.x, y, 29.06]);
    const middle = at([model.docks[(index + 2) % model.docks.length].x, y, 29.06]);
    return { tool: dock.id, start, delta: [middle[0] - start[0], middle[1] - start[1]] as K.Flat };
  });
  return { model, P, parts: parts.sort((a, b) => a.key - b.key), moduleMoves, collarMoves, signals, halo: K.haloOf(model.base, -12, 8, P) };
}

// Both responsive geometries and every rotating indicator path are built once.
export const DESKTOP_INTEGRATION = geometry(false);
export const MOBILE_INTEGRATION = geometry(true);
export type IntegrationGeometry = typeof DESKTOP_INTEGRATION;
