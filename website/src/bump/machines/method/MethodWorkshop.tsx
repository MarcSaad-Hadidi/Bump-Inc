'use client';

import React, { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BUMP_PLAYBACK_RATE } from '/runtime/assets/BumpPlayback.js';
import { holdStill } from '../../anatomy/kit/iso-kit';
import { COMPACT_WORKSHOP, DESKTOP_WORKSHOP, assemblyOffset, offsetOnScreen, partDepth, type WorkshopPart } from './geometry';
import { METHOD_STAGES, STAGE_TIME, clampStage, poseAt, type MethodStage, type WorkshopPose } from './model';
import { createWorkshopTimeline } from './motion';
import { WORKSHOP_DEPTH_KEYS } from './depth-keys';
import './method-workshop.css';

gsap.registerPlugin(useGSAP);

export interface MethodWorkshopController {
  /** Requests one finite transition. Busy requests return false and never queue. */
  goTo(index: number, options?: { immediate?: boolean }): boolean;
  /** The selected target stage, zero-based. */
  getStage(): MethodStage;
  getBusy(): boolean;
  /** Finish at the selected stage, e.g. before a responsive layout change. */
  finish(): void;
  /** The existing Bump scroll owner controls capture eligibility through this hook. */
  setActive(active: boolean): void;
  isActive(): boolean;
}

export interface MethodWorkshopProps {
  id?: string;
  className?: string;
  initialStage?: number;
  onController?: (controller: MethodWorkshopController | null) => void;
  onStageChange?: (stage: MethodStage) => void;
  /** Supply false while the parent section is inactive; no global gestures are installed here. */
  active?: boolean;
  /** The parent may hide this header if its retained section already owns the exact title. */
  showHeader?: boolean;
}

type ItemNode = { part: WorkshopPart; node: SVGGElement; transform: string };

function Arrow({ next = false }: { next?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={next ? 'M4 12h15m-6-6 6 6-6 6' : 'M20 12H5m6-6-6 6 6 6'} /></svg>;
}

export function MethodWorkshop({ id, className = '', initialStage = 0, onController, onStageChange, active = true, showHeader = true }: MethodWorkshopProps) {
  const root = useRef<HTMLElement>(null);
  const movingLayer = useRef<SVGGElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [compact, setCompact] = useState(false);
  const [stage, setStage] = useState<MethodStage>(() => clampStage(initialStage));
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const stageRef = useRef(stage);
  const busyRef = useRef(false);
  const activeRef = useRef(active);
  const visibleRef = useRef(true);
  const reducedRef = useRef(false);
  const callbacks = useRef({ onController, onStageChange });
  callbacks.current = { onController, onStageChange };
  const travelRef = useRef<gsap.core.Tween | null>(null);
  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const goRef = useRef<MethodWorkshopController['goTo']>(() => false);
  const finishRef = useRef<() => void>(() => {});
  const syncPlaybackRef = useRef<() => void>(() => {});
  const geometry = compact ? COMPACT_WORKSHOP : DESKTOP_WORKSHOP;
  const markup = useMemo(() => geometry.parts.map((part) => ({ ...part, svg: part.svg.replaceAll('__MWID__', `mw${uid}`) })), [geometry, uid]);
  const selected = METHOD_STAGES[stage];

  useEffect(() => {
    const query = window.matchMedia('(max-width: 720px)');
    const resize = () => { finishRef.current(); setCompact(query.matches); };
    resize();
    query.addEventListener('change', resize);
    return () => query.removeEventListener('change', resize);
  }, []);

  useEffect(() => { activeRef.current = active; syncPlaybackRef.current(); }, [active]);

  useGSAP((_context, contextSafe) => {
    if (!root.current || !movingLayer.current) return;
    const scope = root.current;
    const layer = movingLayer.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pose: WorkshopPose = { ...poseAt(0, geometry.layout) };
    const nodes: ItemNode[] = markup.map((part) => ({ part, node: layer.querySelector(`[data-item="${part.id}"]`)! as SVGGElement, transform: '' }));
    const plan = layer.querySelector<SVGGElement>('[data-plan]')!;
    const ink = plan.querySelector<SVGPathElement>('.iso-line')!;
    const ghosts = Array.from(plan.querySelectorAll<SVGPathElement>('.iso-line')).slice(1);
    ink.setAttribute('pathLength', '1');
    ink.style.strokeDasharray = '1';
    const needle = scope.querySelector<SVGGElement>('[data-needle]')!;
    const wheel = scope.querySelector<SVGGElement>('[data-feed-spin]')!;
    const serviceSpin = scope.querySelector<SVGGElement>('[data-service-spin]')!;
    const planEntry = { id: '__plan', key: 0, node: plan };
    let order = '';
    let lastPlan = -1;
    const round = (value: number) => Math.round(value * 100) / 100;
    const depthTables = geometry.layout.compact ? WORKSHOP_DEPTH_KEYS.compact : WORKSHOP_DEPTH_KEYS.desktop;
    const restPoses = [0, 1, 2, 3, 4].map((index) => poseAt(index as MethodStage, geometry.layout));
    const depthBias = (part: WorkshopPart, index: number) => {
      const measured = depthTables[index]?.[part.id];
      return measured === undefined ? 0 : measured - partDepth(part, assemblyOffset(part.assembly, restPoses[index]), geometry.projection);
    };

    function draw() {
      const ordered: { id: string; key: number; node: SVGGElement }[] = [];
      const time = masterRef.current?.time() ?? STAGE_TIME[stageRef.current];
      scope.dataset.methodTime = String(Math.round(time * 1000) / 1000);
      const found = STAGE_TIME.findIndex((stop) => stop >= time);
      const upper = found < 0 ? STAGE_TIME.length - 1 : Math.max(1, found);
      const lower = upper - 1;
      const share = Math.min(1, Math.max(0, (time - STAGE_TIME[lower]) / (STAGE_TIME[upper] - STAGE_TIME[lower])));
      const measuredDepth = (part: WorkshopPart, offset: [number, number, number]) => partDepth(part, offset, geometry.projection) + depthBias(part, lower) * (1 - share) + depthBias(part, upper) * share;
      for (const item of nodes) {
        const offset = assemblyOffset(item.part.assembly, pose);
        const [x, y] = offsetOnScreen(geometry.projection, offset);
        const transform = `translate(${round(x)} ${round(y)})`;
        if (transform !== item.transform) { item.node.setAttribute('transform', transform); item.transform = transform; }
        if (item.part.shape.kind === 'slide') {
          const drop = item.part.assembly === 'probe' ? pose.probeDrop : item.part.assembly === 'pen' ? pose.penDrop : pose.driverDrop;
          holdStill(item.node, offsetOnScreen(geometry.projection, [0, 0, -drop]));
        }
        ordered.push({ id: item.part.id, key: measuredDepth(item.part, offset), node: item.node });
      }
      const project = offsetOnScreen(geometry.projection, [pose.projectX, 0, 0]);
      plan.setAttribute('transform', `translate(${round(project[0])} ${round(project[1])})`);
      // The plan belongs on the work insert, below guide strips and cartridges.
      const insert = nodes.find(({ part }) => part.id === 'project.plan-sheet')!;
      planEntry.key = measuredDepth(insert.part, [pose.projectX, 0, 0]) + .01;
      ordered.push(planEntry);
      ordered.sort((a, b) => a.key - b.key || a.id.localeCompare(b.id));
      const nextOrder = ordered.map((item) => item.id).join('|');
      if (order !== nextOrder) {
        const fragment = document.createDocumentFragment();
        ordered.forEach((item) => fragment.appendChild(item.node));
        layer.appendChild(fragment);
        order = nextOrder;
      }
      if (lastPlan !== pose.plan) {
        ink.style.strokeDashoffset = String(1 - pose.plan);
        plan.style.opacity = pose.plan > .0001 ? '1' : '0';
        ghosts.forEach((path) => { path.style.opacity = String(Math.min(1, pose.plan * 5)); });
        lastPlan = pose.plan;
      }
      needle.setAttribute('transform', `rotate(${-120 + pose.gauge * 240})`);
      wheel.setAttribute('transform', `rotate(${pose.wheel * 180})`);
      serviceSpin.setAttribute('transform', `rotate(${pose.adjustment * 125})`);
    }

    function commitBusy(next: boolean) {
      busyRef.current = next;
      setBusy(next);
      scope.dataset.methodBusy = String(next);
    }
    function complete() {
      travelRef.current = null;
      commitBusy(false);
      const state = METHOD_STAGES[stageRef.current];
      setAnnouncement(`${stageRef.current + 1} sur 5. ${state.name}. ${state.title} ${state.message}`);
      callbacks.current.onStageChange?.(stageRef.current);
    }
    const master = createWorkshopTimeline(pose, geometry, draw);
    masterRef.current = master;
    master.seek(STAGE_TIME[stageRef.current], false);
    draw();

    const syncPlayback = () => {
      const travel = travelRef.current;
      if (!travel) return;
      if (!activeRef.current || !visibleRef.current || document.hidden) travel.pause();
      else travel.resume();
    };
    syncPlaybackRef.current = syncPlayback;
    const finish = () => {
      travelRef.current?.kill();
      travelRef.current = null;
      master.seek(STAGE_TIME[stageRef.current], false);
      draw();
      commitBusy(false);
    };
    finishRef.current = finish;
    goRef.current = contextSafe!((index: number, options?: { immediate?: boolean }) => {
      const next = clampStage(index);
      if (busyRef.current || next === stageRef.current) return false;
      stageRef.current = next;
      setStage(next);
      scope.dataset.methodStage = String(next);
      if (reducedRef.current || media.matches || options?.immediate) {
        master.seek(STAGE_TIME[next], false);
        draw();
        complete();
        return true;
      }
      commitBusy(true);
      // Direct selection traverses the same poses and remains bounded to a short finite duration.
      const distance = Math.abs(STAGE_TIME[next] - master.time());
      travelRef.current = master.tweenTo(STAGE_TIME[next], {
        duration: Math.min(2.8, Math.max(.65, distance)) / BUMP_PLAYBACK_RATE,
        ease: 'none', onComplete: complete,
      });
      syncPlayback();
      return true;
    });

    const still = () => { reducedRef.current = media.matches; if (media.matches) finish(); };
    still();
    media.addEventListener('change', still);
    const observer = new IntersectionObserver((entries) => {
      visibleRef.current = entries[entries.length - 1]?.isIntersecting ?? false;
      syncPlayback();
    }, { threshold: .08 });
    observer.observe(scope);
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', still);
      document.removeEventListener('visibilitychange', syncPlayback);
      travelRef.current?.kill();
      master.kill();
      travelRef.current = null;
      masterRef.current = null;
      goRef.current = () => false;
      finishRef.current = () => {};
      syncPlaybackRef.current = () => {};
      busyRef.current = false;
    };
  }, { scope: root, dependencies: [geometry, markup], revertOnUpdate: true });

  const controller = useMemo<MethodWorkshopController>(() => ({
    goTo: (index, options) => goRef.current(index, options),
    getStage: () => stageRef.current,
    getBusy: () => busyRef.current,
    finish: () => finishRef.current(),
    setActive: (next) => { activeRef.current = next; syncPlaybackRef.current(); },
    isActive: () => activeRef.current && visibleRef.current && !document.hidden,
  }), []);

  useEffect(() => {
    onController?.(controller);
    return () => onController?.(null);
  }, [controller, onController]);

  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = stageRef.current + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = stageRef.current - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = 4;
    if (next === null) return;
    event.preventDefault();
    controller.goTo(next);
  }

  return (
    <section id={id} ref={root} className={`method-workshop iso ${className}`} data-theme="light" data-method-stage={stage} data-method-busy={busy} data-method-machine="atelier" data-method-compact={compact} data-bump-local-keys="true" onKeyDown={keyDown} aria-labelledby={`mw-title-${uid}`}>
      {showHeader ? <header className="mw-heading">
        <span className="mw-eyebrow">Notre méthode</span>
        <h2 id={`mw-title-${uid}`}>Cinq étapes,<br className="mw-title-break" /> un même fil conducteur</h2>
        <p>Du premier échange au suivi, nous construisons avec vous.</p>
      </header> : <h2 id={`mw-title-${uid}`} className="mw-sr">Cinq étapes, un même fil conducteur</h2>}

      <div className="mw-body">
        <figure className="mw-figure" aria-label="L’atelier Bump, un seul projet de l’audit au suivi">
          <div className="mw-figure-top" aria-hidden="true"><span>Fig. 01</span><span>L’atelier Bump</span></div>
          <div className="mw-scene" tabIndex={0} role="group" aria-label={`Atelier Bump. Étape ${stage + 1} sur 5, ${selected.name}. Utilisez les flèches pour changer d’étape, Début et Fin pour les extrêmes.`}>
            <svg className="mw-svg iso-svg" viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-label={`Un banc d’ingénierie sur rails. Le même projet vert est ${['inspecté par une sonde et un cadran', 'séparé en composants sur ses glissières', 'dessiné par un traceur mécanique', 'assemblé et verrouillé', 'réglé et suivi par des instruments stables'][stage]}.`} focusable="false">
              <path className="mw-ground" d={geometry.halo} />
              <g ref={movingLayer} data-workshop-layer>
                {markup.map((part) => <g key={part.id} data-item={part.id} data-assembly={part.assembly} className={`mw-material mw-${part.material}${part.detail ? ' mw-detail' : ''}`} dangerouslySetInnerHTML={{ __html: part.svg }} />)}
                <g data-plan className="mw-plan" dangerouslySetInnerHTML={{ __html: geometry.plan }} />
              </g>
              <g transform={geometry.gaugeFace} className="mw-pointer-plane"><g data-needle><path className="iso-line mw-needle" data-tone="red" data-free="" d={geometry.gaugeNeedle} /><circle r="1.5" className="mw-hub" /></g></g>
            </svg>
          </div>
          <figcaption className="mw-figure-bottom"><span><i /> Un seul projet, de bout en bout</span><span className="mw-instrument" data-readout>{busy ? 'Mécanisme en mouvement' : selected.instrument}</span></figcaption>
        </figure>

        <div className="mw-stage-content" aria-busy={busy}>
          <div className="mw-stage-kicker"><span>{String(stage + 1).padStart(2, '0')}</span><span>/ 05</span><span className="mw-stage-action">{selected.action}</span></div>
          <h3>{selected.name}</h3>
          <p className="mw-stage-title">{selected.title}</p>
          <p className="mw-stage-message">{selected.message}</p>
          <span className="mw-gesture-hint" aria-hidden="true"><span className="mw-hint-desktop">Molette · flèches · étapes</span><span className="mw-hint-mobile">À votre rythme, étape par étape</span></span>
        </div>
      </div>

      <nav className="mw-stages" aria-label="Étapes de notre méthode">
        {METHOD_STAGES.map((item, index) => <button key={item.key} type="button" aria-current={stage === index ? 'step' : undefined} aria-label={`${index + 1}. ${item.name}`} disabled={busy} onClick={() => controller.goTo(index)} data-past={index < stage}><span>{String(index + 1).padStart(2, '0')}</span><b className="mw-stage-full">{item.name}</b><b className="mw-stage-short" aria-hidden="true">{['Audit','Analyse','Proposer','Implanter','Suivre'][index]}</b><i aria-hidden="true" /></button>)}
      </nav>
      <span className="mw-sr" aria-live="polite" aria-atomic="true">{announcement}</span>
    </section>
  );
}

export default MethodWorkshop;
