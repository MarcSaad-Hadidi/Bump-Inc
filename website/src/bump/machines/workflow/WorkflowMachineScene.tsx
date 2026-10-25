import React from 'react';
import * as k from '../../anatomy/kit/iso-kit';
import { WORKFLOW_STAGES, type WorkflowPose } from './model';
import { DESKTOP_SCENE, MOBILE_SCENE, type MachinePart, type MachineScene, type Motion } from './geometry';

export type PartRefs = Map<string, SVGGElement>;
export const sceneFor = (mobile: boolean) => mobile ? MOBILE_SCENE : DESKTOP_SCENE;

/** Changes only affine transforms; the 76 solids were built once by Anatomy. */
export function writeWorkflowPose(scene: MachineScene, pose: WorkflowPose, refs: PartRefs) {
  const index = Math.min(4, Math.max(0, Math.floor(pose.travel)));
  const fraction = Math.min(1, Math.max(0, pose.travel - index));
  const distance = scene.stops[index] + (scene.stops[index + 1] - scene.stops[index]) * fraction;
  const pos = scene.capsuleAt(distance), start = scene.stations[0];
  const capsule: [number, number, number] = [pos[0] - start[0], pos[1] - start[1], pos[2] - start[2]];
  const moves: Record<Motion, [number, number, number]> = {
    capsule, intake: [0, pose.intake * 1.5, 0], diverter: [0, -pose.diverter * 3, 0],
    probeA: [0, 0, -pose.probeA * 7], probeB: [0, 0, -pose.probeB * 7], probeC: [0, 0, -pose.probeC * 7],
    gate: [0, 0, pose.gate * 23], connector: [pose.connector * 3, 0, 0], completion: [0, 0, pose.completion * 2],
  };
  const ordered = scene.parts.map(part => {
    const el = refs.get(part.id), by = part.motion ? moves[part.motion] : [0, 0, 0] as [number, number, number];
    if (el && part.motion) {
      const [x, y] = scene.projectOffset(by);
      el.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)})`);
      el.querySelector('[data-hold]')?.setAttribute('transform', `translate(${(-x).toFixed(3)} ${(-y).toFixed(3)})`);
    }
    // These offsets are the actual world-space depth changes, not screen Y.
    const key = part.key + k.depthOf(by, scene.projection);
    return { el, key, id: part.id };
  }).sort((a, b) => a.key - b.key);
  const parent = ordered.find(item => item.el)?.el?.parentElement;
  if (!parent) return;
  const order = ordered.map(item => item.id).join('|');
  if (parent.getAttribute('data-order') !== order) {
    const fragment = document.createDocumentFragment();
    ordered.forEach(item => item.el && fragment.appendChild(item.el));
    parent.appendChild(fragment);
    parent.setAttribute('data-order', order);
  }
}

function AnatomyPart({ part, register }: { part: MachinePart; register: (id: string, element: SVGGElement | null) => void }) {
  return <g ref={element => register(part.id, element)} data-part={part.id} data-module={part.module < 0 ? undefined : part.module}
    data-motion={part.motion} className={`bwm-part bwm-material-${part.material}`}>
    {part.clip && <defs><clipPath id={`bwm-clip-${part.id.replaceAll('.', '-')}`}><path data-hold="" d={part.clip} /></clipPath></defs>}
    <g className="iso-solid" clipPath={part.clip ? `url(#bwm-clip-${part.id.replaceAll('.', '-')})` : undefined}>
      <path className="iso-fill" d={part.paths.fill} />
      {part.paths.shades.map((d, i) => d ? <path key={i} className="iso-shade" data-shade={i} d={d} /> : null)}
      <path className="iso-top" d={part.paths.top} />
      {part.paths.crease && <path className="iso-line iso-crease" data-tone="faint" d={part.paths.crease} />}
      {part.paths.bevel && <path className="iso-line iso-bevel" data-tone="faint" d={part.paths.bevel} />}
      {part.lines.map((d, i) => <path key={i} className="iso-line" data-tone="lo" d={d} />)}
      <path className="iso-line iso-edge" data-tone="hi" d={part.paths.outline} />
    </g>
  </g>;
}

export function WorkflowMachineScene({ mobile, partRefs, inspect }: {
  mobile: boolean; partRefs: React.MutableRefObject<PartRefs>; inspect: (id: number | null) => void;
}) {
  const scene = sceneFor(mobile);
  const register = React.useCallback((id: string, element: SVGGElement | null) => {
    if (element) partRefs.current.set(id, element); else partRefs.current.delete(id);
  }, [partRefs]);
  const hit = (target: EventTarget | null) => {
    const part = target instanceof Element ? target.closest('[data-module]') : null;
    if (part) { const id = Number(part.getAttribute('data-module')); if (id >= 0 && id <= 5) inspect(id); }
  };
  return <svg className="bwm-svg iso-svg" viewBox={`0 0 ${scene.width} ${scene.height}`}
    role="img" aria-label="Machine Bump à canaux ouverts : une capsule verte traverse la réception, l’aiguillage, la préparation IA, une barrière de validation humaine, le connecteur et la sortie."
    onPointerMove={e => { if (e.pointerType !== 'touch') hit(e.target); }} onPointerDown={e => hit(e.target)} onPointerLeave={() => inspect(null)}>
    <defs><filter id={`bwm-shadow-${mobile ? 'm' : 'd'}`} x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="7" /></filter></defs>
    <path className="bwm-ground-shadow" d={scene.halo} filter={`url(#bwm-shadow-${mobile ? 'm' : 'd'})`} />
    <g className="bwm-parts">
      {[...scene.parts].sort((a, b) => a.key - b.key).map(part => <AnatomyPart key={`${mobile ? 'm' : 'd'}-${part.id}`} part={part} register={register} />)}
    </g>
  </svg>;
}
