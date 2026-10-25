'use client';

import * as React from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DESKTOP_INTEGRATION, MOBILE_INTEGRATION } from './geometry';
import { INTEGRATION_DURATION, INTEGRATION_STAGES, stageIndexAt } from './model';
import { IntegrationCoreScene } from './IntegrationCoreScene';
import './integration-core.css';

gsap.registerPlugin(useGSAP);

export interface IntegrationCoreProps { playbackRate?: number; className?: string }
interface IntegrationControls { step: (index: number) => void }

/** Compact companion to the existing software demonstrations; never captures scroll. */
export function IntegrationCore({ playbackRate = 1.5, className = '' }: IntegrationCoreProps) {
  const root = React.useRef<HTMLElement>(null);
  const controls = React.useRef<IntegrationControls | null>(null);
  const [mobile, setMobile] = React.useState(false);
  const [stage, setStage] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const [inspecting, setInspecting] = React.useState(false);
  const geometry = mobile ? MOBILE_INTEGRATION : DESKTOP_INTEGRATION;
  const id = React.useId().replace(/:/g, '');

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useGSAP(() => {
    const element = root.current;
    if (!element) return;
    const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');
    const rate = Math.max(.35, Math.min(3, playbackRate));
    const moduleGroups = element.querySelectorAll<SVGGElement>('[data-bic-module]');
    const adapterGroups = element.querySelectorAll<SVGGElement>('[data-bic-adapter]');
    const signalGroups = element.querySelectorAll<SVGCircleElement>('[data-bic-signal]');
    const needlePaths = element.querySelectorAll<SVGPathElement>('[data-bic-needle]');
    const frames = new Map(geometry.parts.filter((part) => part.needleFrames).map((part) => [part.id, part.needleFrames!]));
    let visible = false;
    let completed = false;
    let inspectionUntil = 0;
    let idleTimer: number | null = null;
    let cycleTimer: gsap.core.Tween | null = null;
    let lastStage = -1;
    const clearIdle = () => { if (idleTimer !== null) window.clearTimeout(idleTimer); idleTimer = null; };
    const clearCycle = () => { cycleTimer?.kill(); cycleTimer = null; };
    const inspectionHeld = () => performance.now() < inspectionUntil;
    // The end of the existing finite timeline already contains a short final hold.
    const finalHoldDelay = Math.max(0, 2 - (INTEGRATION_DURATION - INTEGRATION_STAGES[4].at) / rate);
    const indicator = { phase: 0 };
    const modulePose = { share: 1 };
    const adapterPose = { share: 1 };
    const partsLayer = element.querySelector<SVGGElement>('[data-bic-parts]')!;
    const nodes = new Map(Array.from(partsLayer.children).map((node) => [(node as SVGGElement).dataset.bicPart!, node]));
    let priorOrder = '';
    const paintOrder = () => {
      const ordered = geometry.parts.map((part) => ({ part, key: part.key + part.lift * (part.piece.startsWith('tool-') ? modulePose.share : part.piece.startsWith('adapter-') ? adapterPose.share : 0) })).sort((a, b) => a.key - b.key);
      const signature = ordered.map(({ part }) => part.id).join('|');
      if (signature === priorOrder) return;
      priorOrder = signature;
      ordered.forEach(({ part }, index) => { const node = nodes.get(part.id)!; if (partsLayer.children[index] !== node) partsLayer.insertBefore(node, partsLayer.children[index] || null); });
    };
    const reportStage = (index: number) => {
      if (lastStage === index) return;
      lastStage = index;
      element.dataset.integrationStage = INTEGRATION_STAGES[index].id;
      setStage(index);
    };
    const reportPlaying = (next: boolean) => {
      element.dataset.integrationPlaying = String(next);
      setPlaying(next);
    };
    const paintNeedles = () => {
      const index = Math.max(0, Math.min(320, Math.round(indicator.phase * 320)));
      needlePaths.forEach((path) => { const list = frames.get(path.dataset.bicNeedle!); if (list) path.setAttribute('d', list[index]); });
    };
    moduleGroups.forEach((group) => {
      const move = geometry.moduleMoves[group.dataset.bicModule as keyof typeof geometry.moduleMoves];
      gsap.set(group, { x: move[0], y: move[1] });
    });
    adapterGroups.forEach((group) => {
      const move = geometry.collarMoves[group.dataset.bicAdapter as keyof typeof geometry.collarMoves];
      gsap.set(group, { x: move[0], y: move[1] });
    });
    gsap.set(signalGroups, { opacity: 0, x: 0, y: 0 });
    gsap.set(element.querySelectorAll('[data-bic-ready]'), { opacity: .15 });
    const timeline = gsap.timeline({
      paused: true,
      defaults: { ease: 'power2.inOut' },
      onUpdate: () => { paintOrder(); reportStage(stageIndexAt(timeline.time())); },
      onComplete: () => { completed = true; reportStage(4); reportPlaying(false); scheduleNextCycle(); },
    });
    timeline.to(adapterGroups, { x: 0, y: 0, duration: 1.15 }, 1.15);
    timeline.to(adapterPose, { share: 0, duration: 1.15 }, 1.15);
    timeline.to(moduleGroups, { x: 0, y: 0, duration: 1.2 }, 2.75);
    timeline.to(modulePose, { share: 0, duration: 1.2 }, 2.75);
    timeline.to(element.querySelectorAll('[data-bic-ready]'), { opacity: 1, duration: .35 }, 4.4);
    timeline.to(indicator, { phase: 1, duration: 1.05, onUpdate: paintNeedles }, 4.45);
    // All five streams ride in the inlaid tracks of the same physical bus.
    geometry.signals.forEach((signal, index) => {
      const dot = signalGroups[index];
      [4.55, 6.0].forEach((at) => {
        timeline.fromTo(dot, { x: 0, y: 0, opacity: 0 }, { opacity: 1, duration: .18 }, at);
        timeline.to(dot, { x: signal.delta[0], y: signal.delta[1], duration: .8, ease: 'sine.inOut' }, at + .18);
        timeline.to(dot, { opacity: 0, duration: .24 }, at + .98);
      });
    });
    timeline.to(indicator, { phase: .86, duration: .75, onUpdate: paintNeedles }, 6.9);
    timeline.to({}, { duration: .85 }, 7.65);
    timeline.timeScale(rate);

    const pause = () => { clearIdle(); clearCycle(); timeline.pause(); reportPlaying(false); };
    const scheduleInspectionResume = (): void => {
      clearIdle();
      if (!visible || document.hidden || stillness.matches) return;
      const remaining = inspectionUntil - performance.now();
      if (remaining <= 0) { replay(); return; }
      idleTimer = window.setTimeout(() => {
        idleTimer = null;
        if (visible && !document.hidden && !stillness.matches) replay();
      }, Math.ceil(remaining));
    };
    const replay = (): void => {
      if (!visible || document.hidden || stillness.matches) return;
      if (inspectionHeld()) { scheduleInspectionResume(); return; }
      clearIdle();
      clearCycle();
      inspectionUntil = 0;
      setInspecting(false);
      completed = false;
      reportStage(0);
      timeline.restart();
      reportPlaying(true);
    };
    const scheduleNextCycle = (): void => {
      clearCycle();
      if (!visible || document.hidden || stillness.matches) return;
      if (inspectionHeld()) { scheduleInspectionResume(); return; }
      // One finite cycle, then about two seconds total in the unified state.
      cycleTimer = gsap.delayedCall(finalHoldDelay, () => { cycleTimer = null; replay(); });
    };
    const staticFinal = () => {
      clearIdle();
      clearCycle();
      inspectionUntil = 0;
      setInspecting(false);
      timeline.pause().totalTime(INTEGRATION_DURATION, true);
      paintOrder();
      paintNeedles();
      completed = true;
      reportStage(4);
      reportPlaying(false);
    };
    const updateStillness = () => {
      setReduced(stillness.matches);
      if (stillness.matches) staticFinal();
      else if (visible && !document.hidden) replay();
    };
    controls.current = {
      step: (index) => {
        const next = Math.max(0, Math.min(4, index));
        pause();
        inspectionUntil = performance.now() + 30_000;
        setInspecting(true);
        completed = next === 4;
        timeline.pause().totalTime(INTEGRATION_STAGES[next].pose, true);
        paintOrder();
        paintNeedles();
        reportStage(next);
        reportPlaying(false);
        scheduleInspectionResume();
      },
    };
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      const nextVisible = entry.isIntersecting && entry.intersectionRatio > .18;
      const entered = nextVisible && !visible;
      visible = nextVisible;
      if (!visible) { pause(); return; }
      if (entered) {
        clearIdle();
        inspectionUntil = 0;
        setInspecting(false);
        if (!document.hidden && !stillness.matches) replay();
      }
    }, { threshold: [0, .18, .35, .7] });
    observer.observe(element);
    const onVisibility = () => {
      if (document.hidden) { pause(); return; }
      if (!visible || stillness.matches) return;
      if (inspectionHeld()) { scheduleInspectionResume(); return; }
      inspectionUntil = 0;
      setInspecting(false);
      if (completed) { scheduleNextCycle(); return; }
      timeline.resume();
      reportPlaying(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    stillness.addEventListener('change', updateStillness);
    setReduced(stillness.matches);
    if (stillness.matches) staticFinal(); else { paintOrder(); reportStage(0); reportPlaying(false); }
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      stillness.removeEventListener('change', updateStillness);
      clearIdle();
      clearCycle();
      timeline.kill();
      controls.current = null;
    };
  }, { scope: root, dependencies: [geometry, playbackRate], revertOnUpdate: true });

  return (
    <figure ref={root} className={`bic ${className}`.trim()} data-integration-stage={INTEGRATION_STAGES[stage].id} data-integration-playing={String(playing)} data-integration-layout={mobile ? 'mobile' : 'desktop'} data-integration-reduced={String(reduced)} data-integration-inspecting={String(inspecting)} aria-labelledby={`${id}-title`}>
      <figcaption className="bic-heading">
        <span id={`${id}-title`}>Vos outils. Un fonctionnement commun.</span>
        <span className="bic-count">5 interfaces · 1 bus commun</span>
      </figcaption>
      <div className="bic-art"><IntegrationCoreScene geometry={geometry} /></div>
      <div className="bic-controls" role="group" aria-label="Démonstration d’interconnexion">
        <div className="bic-readout" aria-live={inspecting ? 'polite' : 'off'} aria-atomic="true">
          <span className="bic-step">0{stage + 1}</span>
          <div className="bic-explanation">
            <h4>{INTEGRATION_STAGES[stage].title}</h4>
            <p>{INTEGRATION_STAGES[stage].detail}</p>
          </div>
        </div>
        <div className="bic-stages" role="group" aria-label="Observer un état">
          {INTEGRATION_STAGES.map((item, index) => <button key={item.id} type="button" className="bic-stage" aria-label={`${index + 1}. ${item.title}`} aria-pressed={stage === index} title={item.detail} onClick={() => controls.current?.step(index)}>{index + 1}</button>)}
        </div>
      </div>
      <p className="bic-sr-only">Les boutons 1 à 5 permettent d’observer chaque état sans animation. La démonstration reprend après 30 secondes sans sélection ; elle reste immobile en mouvement réduit. Les échanges sont fictifs et ne connectent aucun logiciel réel.</p>
    </figure>
  );
}

export default IntegrationCore;
