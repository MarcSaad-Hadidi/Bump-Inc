import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import gsap from 'gsap';
import { AutoCursor } from '../../ui/AutoCursor.jsx';
import { useGSAP } from '@gsap/react';
import { SECURITY_GEOMETRY, type SecurityCamera, type SecurityGeometry } from './geometry';
import { SECURITY_ACTIONS, SECURITY_CORE_INSERTION, SECURITY_DURATION, SECURITY_MECHANISM_CUES, SECURITY_MODULES, SECURITY_PLAYBACK_RATE, SECURITY_STAGES, STATUS_LABELS, moduleStatus, representativeTime, securitySnapshotAt, type SecurityModuleId, type SecuritySnapshot } from './model';
import './security-engine.css';

gsap.registerPlugin(useGSAP);

type SecurityEngineProps = { className?: string; playbackRate?: number; onStageChange?: (zeroBasedStage: number) => void };
type IconName = 'close' | 'check' | 'arrow';
type CursorState = { phase: 'none' | 'approach' | 'click'; sequence: number };
const APPROVAL_AT = 26;
const READING_IDLE_SECONDS = 30;
function ControlIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  };
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function SecurityScene({ geometry, selected, snapshot, onInspect, labelId }: { geometry: SecurityGeometry; selected: SecurityModuleId | null; snapshot: SecuritySnapshot; onInspect: (id: SecurityModuleId) => void; labelId: string }) {
  const channelFor = new Map(geometry.channels.map(channel => [channel.id, channel]));
  return <svg className={`bse-scene bse-scene--${geometry.mode}`} data-bse-camera={geometry.mode} viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-labelledby={`${labelId}-${geometry.mode}`}>
    <title id={`${labelId}-${geometry.mode}`}>Security Engine Bump. Une machine compacte à noyau en forme de bouclier, avec six modules physiques reliés. Le compartiment des permissions s’ouvre, se corrige puis se verrouille.</title>
    <path className="bse-halo" d={geometry.halo} />
    <g className="bse-solids">
      {geometry.parts.map(part => {
        const channel = part.id.startsWith('bus.') && part.module ? channelFor.get(part.module) : undefined;
        return <g key={part.id} className="bse-part" data-part={part.id} data-module={part.module} data-motion={part.motion} data-dx={part.dx} data-dy={part.dy} data-selected={selected && part.module === selected ? 'true' : undefined} data-status={part.module ? moduleStatus(part.module, snapshot) : undefined}>
          <g dangerouslySetInnerHTML={{ __html: part.svg }} />
          {geometry.details[part.id] && <g dangerouslySetInnerHTML={{ __html: geometry.details[part.id] }} />}
          {channel && <g className="bse-channel" data-channel={channel.id}>
            <path className="iso-line bse-conduit" d={channel.d} />
            <path className="iso-line bse-circuit" d={channel.d} data-circuit={channel.id} />
            <path className="iso-line bse-terminals" d={channel.terminals} />
            <circle className="bse-signal" data-signal={channel.id} data-sx={channel.start[0]} data-sy={channel.start[1]} data-ex={channel.end[0]} data-ey={channel.end[1]} cx={channel.start[0]} cy={channel.start[1]} r="1.8" />
          </g>}
          {part.id === 'core.lens' && <path className="iso-line bse-needle" data-free="" data-camera={geometry.mode} d={geometry.needleAt(0.3)} />}
        </g>;
      })}
    </g>
    <g className="bse-hit-regions" aria-hidden="true">
      {geometry.hitAreas.map(area => <path key={area.id} className="bse-hit" d={area.d} onClick={() => onInspect(area.id)}><title>{SECURITY_MODULES.find(module => module.id === area.id)?.name}</title></path>)}
    </g>
  </svg>;
}

export function SecurityEngine({ className = '', playbackRate = SECURITY_PLAYBACK_RATE, onStageChange }: SecurityEngineProps) {
  const root = useRef<HTMLElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const approval = useRef<gsap.core.Timeline | null>(null);
  const idleCall = useRef<gsap.core.Tween | null>(null);
  const visible = useRef(false);
  const idleUntil = useRef(0);
  const manualRun = useRef(false);
  const approvalArmed = useRef(false);
  const approvalClicked = useRef(false);
  const cursorSequence = useRef(0);
  const launchCorrection = useRef<(automatic: boolean) => void>(() => {});
  const initialSnapshot = securitySnapshotAt(0);
  const snapshotRef = useRef(initialSnapshot);
  const callbackRef = useRef(onStageChange);
  const syncPlayback = useRef<() => void>(() => {});
  const [snapshot, setSnapshot] = useState<SecuritySnapshot>(initialSnapshot);
  const [selected, setSelected] = useState<SecurityModuleId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [reading, setReading] = useState(false);
  const [cursor, setCursor] = useState<CursorState>({ phase: 'none', sequence: 0 });
  const [reduced, setReduced] = useState<boolean | null>(null);
  const uid = useId().replace(/:/g, '');
  const stage = SECURITY_STAGES[snapshot.stage];
  callbackRef.current = onStageChange;

  const publishSnapshot = useCallback((time: number) => {
    const next = securitySnapshotAt(time);
    if (next.signature !== snapshotRef.current.signature) {
      const stageChanged = next.stage !== snapshotRef.current.stage;
      snapshotRef.current = next;
      setSnapshot(next);
      if (stageChanged) callbackRef.current?.(next.stage);
    }
  }, []);
  const editingFocused = useCallback(() => {
    const active = document.activeElement;
    return active instanceof HTMLElement && Boolean(root.current?.contains(active)) && (active.isContentEditable || Boolean(active.closest('input,textarea,select,[data-editing="true"]')));
  }, []);
  const cancelApproval = useCallback(() => {
    approval.current?.kill();
    approval.current = null;
    approvalArmed.current = false;
    setCursor(current => current.phase === 'none' ? current : { ...current, phase: 'none' });
  }, []);
  const armIdle = useCallback(() => {
    idleCall.current?.kill();
    const checkIdle = () => {
      idleCall.current = null;
      const remaining = (idleUntil.current - performance.now()) / 1000;
      if (remaining > 0) idleCall.current = gsap.delayedCall(remaining + 0.02, checkIdle);
      else syncPlayback.current();
    };
    idleCall.current = gsap.delayedCall(Math.max(0.05, (idleUntil.current - performance.now()) / 1000) + 0.02, checkIdle);
  }, []);
  const protectReading = useCallback(() => {
    idleUntil.current = performance.now() + READING_IDLE_SECONDS * 1000;
    manualRun.current = false;
    timeline.current?.pause();
    cancelApproval();
    setPlaying(false);
    setReading(true);
    armIdle();
  }, [armIdle, cancelApproval]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(preference.matches);
    change();
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);

  useGSAP(() => {
    if (!root.current || reduced === null) return;
    const scope = root.current;
    cancelApproval();
    approvalClicked.current = false;
    manualRun.current = false;
    const q = <T extends Element = Element>(selector: string) => Array.from(scope.querySelectorAll<T>(selector));
    const canAuto = () => !reduced && visible.current && document.visibilityState === 'visible' && performance.now() >= idleUntil.current && !editingFocused();
    const resetCycle = () => {
      cancelApproval();
      approvalClicked.current = false;
      manualRun.current = false;
      setSelected(null);
      setReading(false);
      tl.pause(0, true);
      publishSnapshot(0);
    };
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power2.inOut' },
      onUpdate: () => publishSnapshot(tl.time()),
      onComplete: () => {
        manualRun.current = false;
        setPlaying(false);
        publishSnapshot(SECURITY_DURATION);
        if (canAuto()) { resetCycle(); tl.play(); setPlaying(true); }
      },
    });
    timeline.current = tl;
    tl.timeScale(playbackRate);
    SECURITY_STAGES.forEach(entry => tl.addLabel(entry.id, entry.start));
    tl.to({ time: 0 }, { time: SECURITY_DURATION, duration: SECURITY_DURATION, ease: 'none' }, 0);
    // Two real seconds of completed protection before the next visible cycle.
    tl.to({ hold: 0 }, { hold: 1, duration: 2 * playbackRate, ease: 'none' }, SECURITY_DURATION);
    tl.fromTo(q('[data-part="chassis.base"]'), { opacity: 0.45 }, { opacity: 1, duration: 0.65 }, 0);
    tl.fromTo(q('[data-part^="bus."]'), { opacity: 0 }, { opacity: 1, duration: 0.65, stagger: 0.035 }, 1.25);
    q<SVGGElement>('[data-motion="core-insertion"]').forEach(node => {
      tl.fromTo(node, { x: Number(node.dataset.dx), y: Number(node.dataset.dy), opacity: 0.15 }, { x: 0, y: 0, opacity: 1, duration: SECURITY_CORE_INSERTION.duration, ease: 'power3.out' }, SECURITY_CORE_INSERTION.at);
    });
    q<SVGPathElement>('.bse-circuit').forEach(node => {
      const index = SECURITY_MODULES.findIndex(module => module.id === node.dataset.circuit);
      const length = node.getTotalLength();
      tl.fromTo(node, { strokeDasharray: length, strokeDashoffset: length, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 0.62 }, 2.6 + index * 0.52);
    });
    const instrument = { angle: 0.3 };
    const drawNeedle = () => q<SVGPathElement>('.bse-needle').forEach(node => {
      const camera = node.dataset.camera as SecurityCamera;
      node.setAttribute('d', SECURITY_GEOMETRY[camera].needleAt(instrument.angle));
    });
    tl.to(instrument, { angle: Math.PI * 2 + 0.3, duration: 4.5, ease: 'power1.inOut', onUpdate: drawNeedle }, 6.7);
    tl.to(instrument, { angle: Math.PI * 3.8, duration: 1.8, onUpdate: drawNeedle }, 14.8);
    tl.to(instrument, { angle: Math.PI * 4 + 0.3, duration: 1.1, onUpdate: drawNeedle }, 31.7);
    function signal(id: SecurityModuleId, at: number, duration = 0.58) {
      q<SVGCircleElement>(`[data-signal="${id}"]`).forEach(node => {
        tl.fromTo(node, { attr: { cx: Number(node.dataset.sx), cy: Number(node.dataset.sy) }, opacity: 0 }, { opacity: 1, duration: 0.13 }, at);
        tl.to(node, { attr: { cx: Number(node.dataset.ex), cy: Number(node.dataset.ey) }, duration, ease: 'power1.inOut' }, at + 0.1);
        tl.to(node, { opacity: 0, duration: 0.13 }, at + duration + 0.1);
      });
    }
    SECURITY_MODULES.forEach((module, index) => signal(module.id, 6.9 + index * 0.65));
    ['applications', 'data'].forEach(id => { signal(id as SecurityModuleId, 15.1, 0.85); signal(id as SecurityModuleId, 16.45, 0.8); });
    function moveMechanism(name: string, share: number, at: number, duration: number) {
      q<SVGGElement>(`[data-motion="${name}"]`).forEach(node => tl.to(node, { x: Number(node.dataset.dx) * share, y: Number(node.dataset.dy) * share, duration }, at));
    }
    for (const [name, cue] of Object.entries(SECURITY_MECHANISM_CUES)) {
      moveMechanism(name, 1, cue.outAt, cue.outDuration);
      moveMechanism(name, 0, cue.backAt, cue.backDuration);
    }
    signal('data', 32.0, 0.65);
    signal('users', 32.0, 0.65);

    launchCorrection.current = automatic => {
      if (automatic && (!canAuto() || approvalClicked.current)) return;
      if (!automatic) protectReading();
      approvalClicked.current = true;
      cancelApproval();
      manualRun.current = !automatic;
      setSelected(null);
      const time = reduced ? representativeTime(8) : SECURITY_STAGES[7].start + 0.02;
      tl.pause(time, true);
      publishSnapshot(time);
      syncPlayback.current();
    };
    const beginApproval = () => {
      if (!canAuto() || approvalArmed.current || approvalClicked.current) return;
      setSelected(null);
      approvalArmed.current = true;
      const sequence = ++cursorSequence.current;
      setCursor({ phase: 'none', sequence });
      // This separate short timeline uses real seconds, including a readable
      // wait. Its only illustrative click invokes the real correction action.
      approval.current = gsap.timeline()
        .to({ wait: 0 }, { wait: 1, duration: 1, ease: 'none' })
        .call(() => setCursor({ phase: 'approach', sequence }))
        .to({ approach: 0 }, { approach: 1, duration: 0.95, ease: 'none' })
        .call(() => setCursor({ phase: 'click', sequence }))
        .to({ press: 0 }, { press: 1, duration: 0.18, ease: 'none' })
        .call(() => launchCorrection.current(true));
    };
    // Recommendations keep revealing while the cue waits, so the pointer
    // appears about one real second after this stage begins. The hold is a
    // guard for a cue resumed later within the same visible visit.
    tl.call(beginApproval, [], SECURITY_STAGES[6].start + 0.02);
    tl.addPause(APPROVAL_AT, () => { setPlaying(false); beginApproval(); });
    const sync = () => {
      const onscreen = !reduced && visible.current && document.visibilityState === 'visible';
      const automatic = canAuto();
      if (!onscreen || (!automatic && !manualRun.current)) {
        tl.pause();
        cancelApproval();
        setPlaying(false);
        if (onscreen && idleUntil.current > performance.now()) armIdle();
        return;
      }
      if (automatic) { setReading(false); setSelected(null); }
      if (tl.time() >= tl.duration() - 0.001) {
        if (!automatic) return;
        resetCycle();
      }
      if (!manualRun.current && !approvalClicked.current && tl.time() >= SECURITY_STAGES[6].start && tl.time() < SECURITY_STAGES[7].start) {
        beginApproval();
        if (tl.time() >= APPROVAL_AT - 0.01) { setPlaying(false); return; }
      }
      tl.play();
      setPlaying(true);
    };
    syncPlayback.current = sync;
    if (reduced) { tl.pause(representativeTime(8), true); publishSnapshot(tl.time()); }
    if (idleUntil.current > performance.now()) armIdle();
    sync();
    return () => {
      approval.current?.kill();
      approval.current = null;
      approvalArmed.current = false;
      idleCall.current?.kill();
      idleCall.current = null;
      timeline.current = null;
      launchCorrection.current = () => {};
      syncPlayback.current = () => {};
    };
  }, { scope: root, dependencies: [reduced, playbackRate, publishSnapshot, editingFocused, cancelApproval, protectReading, armIdle], revertOnUpdate: true });

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      const nextVisible = entry.isIntersecting && entry.intersectionRatio >= 0.22;
      const freshEntry = nextVisible && !visible.current;
      visible.current = nextVisible;
      if (freshEntry && timeline.current && !editingFocused()) {
        // Reading grace belongs to this visit. A genuine viewport return is a
        // fresh cycle; switching browser tabs only calls sync and preserves it.
        idleUntil.current = 0;
        idleCall.current?.kill();
        idleCall.current = null;
        cancelApproval();
        approvalClicked.current = false;
        manualRun.current = false;
        setSelected(null);
        setReading(false);
        const time = reduced ? representativeTime(8) : 0;
        timeline.current.pause(time, true);
        publishSnapshot(time);
      }
      syncPlayback.current();
    }, { threshold: [0, 0.22, 0.55] });
    observer.observe(element);
    const visibilityChange = () => syncPlayback.current();
    document.addEventListener('visibilitychange', visibilityChange);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibilityChange); };
  }, [publishSnapshot, reduced, editingFocused, cancelApproval]);

  const viewPlan = useCallback(() => {
    protectReading();
    setSelected(null);
    const time = representativeTime(6);
    timeline.current?.pause(time, true);
    publishSnapshot(time);
  }, [protectReading, publishSnapshot]);
  const closeDetail = useCallback(() => { protectReading(); setSelected(null); }, [protectReading]);
  const inspect = useCallback((id: SecurityModuleId) => {
    protectReading();
    setSelected(current => current === id ? null : id);
  }, [protectReading]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && selected !== null) { event.preventDefault(); closeDetail(); }
  };
  const selectedModule = SECURITY_MODULES.find(module => module.id === selected);

  return <section ref={root} className={`bse ${className}`.trim()} data-security-engine-stage={snapshot.stage + 1} data-security-engine-playing={String(playing)} data-security-engine-reduced={String(Boolean(reduced))} data-security="engine" data-stage={snapshot.stage + 1} data-selected-module={selected ?? undefined} tabIndex={0} role="group" data-security-engine-cursor={cursor.phase} data-security-engine-sequence={cursor.sequence} data-security-engine-reading={String(reading)} aria-label="Security Engine Bump. Scénario illustratif automatique, avec six modules à examiner." onPointerDownCapture={event => { if (event.isTrusted) protectReading(); }} onKeyDownCapture={event => { if (event.isTrusted) protectReading(); }} onFocusCapture={event => { if (event.isTrusted) protectReading(); }} onBlurCapture={() => queueMicrotask(() => syncPlayback.current())} onKeyDown={onKeyDown}>
    <header className="bse-heading">
      <div><span className="bse-eyebrow">CYBERSÉCURITÉ · SECURITY ENGINE</span><h3>Examiner avec<br />{' '}un cadre clair</h3></div>
      <p>Comprendre les connexions.<br />{' '}Resserrer les accès. Garder le contrôle.</p>
    </header>
    <div className="bse-layout">
      <div className="bse-machine">
        <div className="bse-figure-header"><span>FIG. 02</span><span>Une machine · six domaines</span></div>
        <SecurityScene geometry={SECURITY_GEOMETRY.desktop} selected={selected} snapshot={snapshot} onInspect={inspect} labelId={uid} />
        <SecurityScene geometry={SECURITY_GEOMETRY.mobile} selected={selected} snapshot={snapshot} onInspect={inspect} labelId={uid} />
        <div className="bse-machine-caption"><span className="bse-caption-mark" aria-hidden="true" />{selectedModule ? `${selectedModule.name} · ${selectedModule.purpose}` : 'Sélectionnez un module pour comprendre son rôle.'}</div>
        <div className="bse-module-list" aria-label="Les six modules de sécurité">
          {SECURITY_MODULES.map(module => {
            const status = moduleStatus(module.id, snapshot);
            return <button key={module.id} type="button" className="bse-module-button" data-status={status} aria-pressed={selected === module.id} onClick={() => inspect(module.id)} aria-label={`${module.name} — ${STATUS_LABELS[status]}. Examiner ce module.`}><span className="bse-status-dot" aria-hidden="true">{status === 'verified' ? '✓' : status === 'danger' ? '!' : ''}</span><span>{module.shortName}</span></button>;
          })}
        </div>
      </div>
      <aside className="bse-information" aria-label="Comprendre le scénario">
        {selectedModule ? <div className="bse-module-detail" key={selectedModule.id}>
          <button type="button" className="bse-close" aria-label="Fermer le détail du module" onClick={closeDetail}><ControlIcon name="close" /></button>
          <span className="bse-eyebrow">MODULE {String(SECURITY_MODULES.findIndex(module => module.id === selected) + 1).padStart(2, '0')} / 06</span>
          <h4>{selectedModule.name}</h4><p>{selectedModule.detail}</p>
          <span className="bse-inline-status" data-status={moduleStatus(selectedModule.id, snapshot)}>{STATUS_LABELS[moduleStatus(selectedModule.id, snapshot)]}</span>
          <p className="bse-pause-note">Consultez ce module à votre rythme.</p>
        </div> : <div className="bse-stage-detail">
          <span className="bse-eyebrow">{String(snapshot.stage + 1).padStart(2, '0')} / 09 · {stage.title}</span>
          <h4>{stage.headline}</h4>
          {snapshot.stage !== 8 && <p className="bse-stage-description">{stage.description}</p>}
          {snapshot.stage === 5 && <div className="bse-risk" role="note">
            <span className="bse-risk-label">EXEMPLE FICTIF · PRIORITÉ ÉLEVÉE</span>
            <strong>Accès trop large sur un serveur</strong>
            <dl><div><dt>Domaine</dt><dd>Données & accès</dd></div><div><dt>Système fictif</dt><dd>DEMO-01</dd></div><div><dt>Impact potentiel</dt><dd>Lecture de données sans autorisation.</dd></div></dl>
            <p>Recommandation : réduire les permissions au besoin réel.</p>
            <button className="bse-text-button" type="button" onClick={viewPlan}>Voir le plan <ControlIcon name="arrow" /></button>
          </div>}
          {(snapshot.stage === 6 || snapshot.stage === 7) && <div className="bse-remediation">
            <ol>{SECURITY_ACTIONS.map(([title, text], index) => <li key={title} data-revealed={index < snapshot.revealed ? 'true' : 'false'} data-complete={index < snapshot.corrected ? 'true' : 'false'}><span className="bse-action-mark" aria-hidden="true">{index < snapshot.corrected ? <ControlIcon name="check" /> : String(index + 1).padStart(2, '0')}</span><span><strong>{title}</strong><small>{text}</small></span></li>)}</ol>
            {snapshot.stage === 6 ? <button type="button" className="bse-primary-button" onClick={() => launchCorrection.current(false)}><span>Lancer la correction<small className="bse-approval-status">{cursor.phase === 'none' ? 'En attente de validation' : 'Validation illustrative'}</small></span><ControlIcon name="arrow" /></button> : <div className="bse-correction-progress"><span>Correction illustrative</span><strong>{snapshot.corrected} / 4</strong></div>}
          </div>}
          {snapshot.stage === 8 && <div className="bse-complete"><span className="bse-complete-seal"><ControlIcon name="check" /></span><strong>{snapshot.finalFollowup ? 'Suivi continu activé' : 'Tous les modules sont stables'}</strong><p>Une protection vérifiée, puis suivie dans le temps.</p></div>}
          {snapshot.stage < 5 && <div className="bse-protection-note"><span className="bse-eyebrow">COMPRENDRE · CORRIGER · SUIVRE</span><p>La protection<br /><em>se construit.</em></p></div>}
        </div>}
      </aside>
    </div>
    <footer className="bse-footer" aria-label="Progression du scénario de sécurité">
      <span className="bse-auto-caption">{reduced ? 'Vue d’ensemble' : reading ? 'Consultation en cours' : 'Comprendre · Corriger · Suivre'}</span>
      <div className="bse-progress-dots" aria-hidden="true">{SECURITY_STAGES.map((entry, index) => <span key={entry.id} data-current={snapshot.stage === index ? 'true' : 'false'} data-passed={snapshot.stage > index ? 'true' : 'false'} />)}</div>
      <span className="bse-step-count">{String(snapshot.stage + 1).padStart(2, '0')} <span>/ 09</span></span>
    </footer>
    <p className="bse-disclaimer">Scénario fictif. Aucun audit ni changement informatique n’est exécuté.</p>
    <span className="bse-sr-only" aria-live="polite" aria-atomic="true">{`${snapshot.stage + 1} sur 9. ${stage.title}. ${stage.headline} ${stage.description}`}</span>
    <AutoCursor root={root} selector=".bse-primary-button" phase={cursor.phase} sequence={cursor.sequence} />
  </section>;
}

export default SecurityEngine;
