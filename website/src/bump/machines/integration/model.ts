import type { Plan, Point3 } from '../../anatomy/kit/iso-kit';

export type IntegrationStage = 'separate' | 'align' | 'connect' | 'sync' | 'unified';
export const INTEGRATION_STAGES: ReadonlyArray<{ id: IntegrationStage; title: string; detail: string; at: number; pose: number }> = [
  { id: 'separate', title: 'Systèmes séparés', detail: 'Votre CRM, votre ERP et vos applications travaillent chacun de leur côté. Les informations doivent être recopiées.', at: 0, pose: 0 },
  { id: 'align', title: 'Interfaces adaptées', detail: 'Bump adapte les formats et les règles de chaque outil pour préparer des échanges cohérents.', at: 1.15, pose: 2.6 },
  { id: 'connect', title: 'Connexions établies', detail: 'Les API relient les cinq outils à un circuit commun, sans remplacer vos logiciels existants.', at: 2.75, pose: 4.2 },
  { id: 'sync', title: 'Échanges synchronisés', detail: 'Une information mise à jour est transmise aux outils concernés. Les équipes évitent les doubles saisies.', at: 4.4, pose: 6.7 },
  { id: 'unified', title: 'Écosystème unifié', detail: 'Vos outils fonctionnent ensemble. Vos équipes retrouvent les bonnes données et suivent les échanges au même endroit.', at: 7.65, pose: 8.5 },
];
export const INTEGRATION_DURATION = 8.5;
export const INTEGRATION_TOOLS = [
  { id: 'crm', label: 'CRM', engraving: 'CRM', height: 25 },
  { id: 'erp', label: 'ERP', engraving: 'ERP', height: 28 },
  { id: 'api', label: 'API', engraving: 'API', height: 22 },
  { id: 'apps', label: 'Applications métier', engraving: 'MÉTIER', height: 25 },
  { id: 'internal', label: 'Systèmes internes', engraving: 'INTERNE', height: 24 },
] as const;
export type ToolId = (typeof INTEGRATION_TOOLS)[number]['id'];
export type Material = 'ivory' | 'base' | 'brass' | 'green' | 'ink';
export type ShapeSpec =
  | { kind: 'slab'; plan: Plan; z: number; h: number; bevel?: number }
  | { kind: 'cylinder'; x: number; y: number; r: number; z: number; h: number }
  | { kind: 'disc'; origin: Point3; axis: Point3; from: number; to: number; r: number };
export interface PartSpec {
  id: string;
  piece: string;
  material: Material;
  shape: ShapeSpec;
  at: Point3;
  move?: Point3;
  tool?: ToolId;
  detail?: 'base' | 'housing' | 'lid' | 'collar' | 'port' | 'stem' | 'cap' | 'core' | 'plate';
}
export interface ToolDock {
  id: ToolId;
  label: string;
  engraving: string;
  x: number;
  y: number;
  direction: 1 | -1;
  body: Plan;
  height: number;
  face: number;
  port: number;
  collarFrom: number;
  collarTo: number;
  needle: Point3;
  move: Point3;
  collarMove: Point3;
}
export interface StationModel {
  mobile: boolean;
  width: number;
  height: number;
  base: Plan;
  bus: Plan;
  cap: Plan;
  core: Point3;
  docks: ToolDock[];
  parts: PartSpec[];
}

/** Pure physical model. Both layouts have the same 57 real solids. */
export function stationModel(mobile: boolean): StationModel {
  const base: Plan = mobile ? { x: -112, y: -93, w: 224, d: 223, r: 10 } : { x: -194, y: -54, w: 388, d: 160, r: 10 };
  const bus: Plan = mobile ? { x: -102, y: -5, w: 204, d: 32, r: 4 } : { x: -181, y: -36, w: 362, d: 32, r: 4 };
  const cap: Plan = { x: bus.x + 3, y: bus.y + 3, w: bus.w - 6, d: 26, r: 2 };
  const core: Point3 = [0, bus.y + 16, 29];
  const parts: PartSpec[] = [];
  const slab = (id: string, plan: Plan, z: number, h: number, material: Material, extra: Partial<PartSpec> = {}) => {
    parts.push({ id, piece: 'stand', material, shape: { kind: 'slab', plan, z, h, bevel: h > 1 ? .7 : .2 }, at: [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], ...extra });
  };
  const cyl = (id: string, x: number, y: number, r: number, z: number, h: number, material: Material, extra: Partial<PartSpec> = {}) => {
    parts.push({ id, piece: 'stand', material, shape: { kind: 'cylinder', x, y, r, z, h }, at: [x, y, z + h / 2], ...extra });
  };
  const axial = (id: string, x: number, originY: number, direction: 1 | -1, from: number, to: number, r: number, material: Material, extra: Partial<PartSpec> = {}) => {
    parts.push({ id, piece: 'stand', material, shape: { kind: 'disc', origin: [x, originY, 18], axis: [0, direction, 0], from, to, r }, at: [x, originY + direction * (from + to) / 2, 18], ...extra });
  };
  [
    [base.x + 15, base.y + 15], [base.x + base.w - 15, base.y + 15],
    [base.x + 15, base.y + base.d - 15], [base.x + base.w - 15, base.y + base.d - 15],
  ].forEach(([x, y], i) => cyl(`stand.foot-${i}`, x, y, 6.5, -12, 4, 'ink'));
  slab('stand.base', base, -8, 8, 'base', { detail: 'base' });
  slab('stand.bus-plinth', { x: bus.x - 2, y: bus.y - 2, w: bus.w + 4, d: bus.d + 4, r: 5 }, 0, 8, 'base');
  slab('stand.bus', bus, 8, 20, 'ivory');
  slab('stand.cap', cap, 28, 1, 'brass', { detail: 'cap' });

  const docks: ToolDock[] = INTEGRATION_TOOLS.map((tool, index) => {
    const front = !mobile || index >= 3;
    const direction: 1 | -1 = front ? -1 : 1;
    const x = mobile ? (front ? [-38, 38][index - 3] : [-74, 0, 74][index]) : [-144, -72, 0, 72, 144][index];
    const y = mobile ? (front ? 69 : -69) : 45;
    const body: Plan = { x: x - 26, y, w: 52, d: 34, r: 3 };
    const face = front ? y : y + 34;
    const busFace = front ? bus.y + bus.d : bus.y;
    const port = busFace - direction * 4;
    const collarFrom = port - direction * 8;
    const collarTo = port;
    const move: Point3 = [0, -direction * 12, 0];
    const collarMove: Point3 = [(index % 2 ? -1 : 1) * 4, 0, 0];
    const dock: ToolDock = { ...tool, x, y, direction, body, height: tool.height, face, port, collarFrom, collarTo, needle: [x + 14, y + 12, 8 + tool.height + 1.2], move, collarMove };
    const moving = { piece: `tool-${tool.id}`, tool: tool.id, move };
    const cradle: Plan = { x: x - 29, y: y - (front ? 1 : 13), w: 58, d: 48, r: 4 };
    slab(`stand.cradle-${tool.id}`, cradle, 0, 8, 'base');
    slab(`tool.${tool.id}.housing`, body, 8, tool.height, 'ivory', { ...moving, detail: 'housing' });
    slab(`tool.${tool.id}.lid`, { x: x - 24, y: y + 2, w: 48, d: 30, r: 2 }, 8 + tool.height, 1.2, 'ivory', { ...moving, detail: 'lid' });
    axial(`tool.${tool.id}.stem`, x, face, direction, 0, (port - face) * direction, 3.8, 'brass', { ...moving, detail: 'stem' });
    // An open-bore adapter uses separately ordered jaws so the pin can enter it.
    const collarY = Math.min(collarFrom, collarTo);
    const adapter = { piece: `adapter-${tool.id}`, tool: tool.id, move: collarMove };
    slab(`adapter.${tool.id}.left-jaw`, { x: x - 8, y: collarY, w: 3.85, d: 8, r: .4 }, 10, 12, 'brass', adapter);
    slab(`adapter.${tool.id}.right-jaw`, { x: x + 4.15, y: collarY, w: 3.85, d: 8, r: .4 }, 10, 12, 'brass', adapter);
    slab(`adapter.${tool.id}.collar-cap`, { x: x - 8, y: collarY, w: 16, d: 8, r: .5 }, 22, 4, 'brass', { ...adapter, detail: 'collar' });
    axial(`stand.port-${tool.id}`, x, port, direction, 0, 4, 8, 'green', { tool: tool.id, detail: 'port' });
    // A tangent saddle holds the collar without intruding into its bore.
    slab(`stand.saddle-${tool.id}`, { x: x - 14, y: Math.min(collarFrom, collarTo), w: 28, d: 8, r: 1.2 }, 0, 10, 'base');
    return dock;
  });
  cyl('stand.core-pedestal', core[0], core[1], 12, 29, 3, 'ivory');
  cyl('stand.core-spindle', core[0], core[1], 4, 32, 4, 'brass');
  cyl('stand.core-rotor', core[0], core[1], 9, 36, 3, 'green', { detail: 'core' });
  const plate: Plan = mobile ? { x: -29, y: 43, w: 58, d: 12, r: 1 } : { x: 111, y: 95, w: 58, d: 9, r: 1 };
  slab('stand.plate', plate, 0, .6, 'brass', { detail: 'plate' });
  return { mobile, width: mobile ? 380 : 760, height: mobile ? 390 : 300, base, bus, cap, core, docks, parts };
}

export function stageIndexAt(time: number) {
  let index = 0;
  INTEGRATION_STAGES.forEach((stage, i) => { if (time >= stage.at) index = i; });
  return index;
}
