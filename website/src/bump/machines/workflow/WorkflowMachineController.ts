import React from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { INITIAL_POSE, WORKFLOW_STAGES, WORKFLOW_TIMING, type WorkflowPose, type WorkflowStage } from './model';
import { sceneFor, writeWorkflowPose, type PartRefs } from './WorkflowMachineScene';

gsap.registerPlugin(useGSAP);
type CursorPhase = 'none' | 'approach' | 'click';
const VISITOR_IDLE_MS = 30000;

export function useWorkflowMachineController(root: React.RefObject<HTMLDivElement | null>, partRefs: React.MutableRefObject<PartRefs>, mobile: boolean, playbackRate = 1.5) {
  const [stage, setStage] = React.useState<WorkflowStage>(0);
  const [playing, setPlaying] = React.useState(false);
  const [waiting, setWaiting] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const [cursorPhase, setCursorPhase] = React.useState<CursorPhase>('none');
  const [cursorSequence, setCursorSequence] = React.useState(0);
  const pose = React.useRef<WorkflowPose>({ ...INITIAL_POSE });
  const timeline = React.useRef<gsap.core.Timeline | null>(null);
  const cueTimeline = React.useRef<gsap.core.Timeline | null>(null);
  const scene = React.useRef(sceneFor(mobile));
  const commands = React.useRef<{ approve: () => void }>({ approve: () => {} });
  const status = React.useRef({ stage: 0 as WorkflowStage, playing: false, waiting: false, started: false,
    approved: false, reduced: false, intent: false, visible: false, visited: false, restartOnEntry: false,
    lastInteraction: -Infinity, pointerDown: false, keyDown: false, editing: false, automaticClick: false });
  const announce = (next: WorkflowStage) => { status.current.stage = next; setStage(next); };
  const isPlaying = (next: boolean) => { status.current.playing = next; setPlaying(next); };
  const isWaiting = (next: boolean) => { status.current.waiting = next; setWaiting(next); };
  const render = React.useCallback(() => writeWorkflowPose(scene.current, pose.current, partRefs.current), [partRefs]);
  React.useLayoutEffect(() => { scene.current = sceneFor(mobile); render(); }, [mobile, render]);

  useGSAP(() => {
    const p = pose.current, s = status.current;
    let idleTimer: ReturnType<typeof window.setTimeout> | null = null;
    let alive = true;
    let cueKind: 'none' | 'approval' | 'rest' = 'none';
    const heldKeys = new Set<string>();
    const tl = gsap.timeline({ paused: true, onUpdate: render, onComplete: finishSequence });
    const cue = gsap.timeline({ paused: true });
    tl.timeScale(playbackRate); cue.timeScale(playbackRate);
    tl.addLabel('reception', 0)
      .to(p, { intake: 1, duration: .38, ease: 'power2.inOut' }, .35)
      .to(p, { intake: 0, duration: .4, ease: 'power2.out' }, .78)
      .call(() => announce(1), [], WORKFLOW_TIMING.sort)
      .to(p, { diverter: 1, duration: .5, ease: 'power2.inOut' }, 1.5)
      .to(p, { travel: 1, duration: 1.35, ease: 'power1.inOut' }, 1.55)
      .call(() => announce(2), [], WORKFLOW_TIMING.prepare)
      .to(p, { travel: 2, duration: 1.35, ease: 'power1.inOut' }, 3.15)
      .to(p, { probeA: 1, duration: .38, ease: 'sine.inOut' }, 4.5)
      .to(p, { probeB: 1, duration: .38, ease: 'sine.inOut' }, 4.66)
      .to(p, { probeC: 1, duration: .38, ease: 'sine.inOut' }, 4.82)
      .to(p, { probeA: 0, probeB: 0, probeC: 0, duration: .5, ease: 'sine.inOut' }, 5.25)
      .to(p, { travel: 3, duration: .9, ease: 'power1.inOut' }, 5.75)
      .call(() => announce(3), [], WORKFLOW_TIMING.approval)
      .addLabel('human-approval', WORKFLOW_TIMING.hold)
      .addPause(WORKFLOW_TIMING.hold, () => {
        if (status.current.approved) return;
        status.current.intent = false; isPlaying(false); isWaiting(true); announce(3); armApproval();
      })
      .call(() => announce(4), [], WORKFLOW_TIMING.transfer)
      .to(p, { gate: 1, duration: .8, ease: 'power2.inOut' }, 7.2)
      .to(p, { travel: 4, duration: 1.6, ease: 'power1.inOut' }, 8.05)
      .to(p, { connector: 1, duration: .35, ease: 'power2.inOut' }, 9.3)
      .to(p, { travel: 5, duration: 1.25, ease: 'power1.inOut' }, 9.8)
      .to(p, { connector: 0, gate: 0, completion: 0, duration: .45, ease: 'power2.inOut' }, 10.9)
      .call(() => announce(5), [], WORKFLOW_TIMING.complete);
    timeline.current = tl; cueTimeline.current = cue;
    render();
    const foreground = () => document.visibilityState !== 'hidden';
    const active = () => s.pointerDown || s.keyDown || s.editing;
    const idle = () => !active() && performance.now() - s.lastInteraction >= VISITOR_IDLE_MS;
    const canAutomate = () => alive && s.visible && foreground() && !s.reduced && idle();
    function clearIdle() { if (idleTimer !== null) window.clearTimeout(idleTimer); idleTimer = null; }
    function clearCue() { cue.pause().clear(); cueKind = 'none'; setCursorPhase('none'); }
    function resumeMain() {
      const running = alive && s.visible && foreground() && !s.reduced;
      if (running) tl.play(); else tl.pause();
      isPlaying(running);
    }
    function resetSequence() {
      clearIdle(); clearCue(); tl.pause().seek(0, true);
      Object.assign(pose.current, INITIAL_POSE); render();
      s.approved = false; s.intent = false; s.restartOnEntry = false; s.started = true;
      isWaiting(false); isPlaying(false); announce(0); setStarted(true);
      if (s.reduced) {
        tl.seek(WORKFLOW_TIMING.hold, true); render(); announce(3); isWaiting(true);
      } else { s.intent = true; resumeMain(); }
    }
    function scheduleIdle() {
      clearIdle();
      if (!alive || !s.visible || !foreground() || active() || (s.reduced && !s.restartOnEntry)) return;
      const remaining = Math.max(0, VISITOR_IDLE_MS - (performance.now() - s.lastInteraction));
      if (remaining === 0) { resumeAutomation(); return; }
      idleTimer = window.setTimeout(() => { idleTimer = null; resumeAutomation(); }, remaining + 16);
    }
    function armApproval() {
      clearCue();
      if (!canAutomate() || !s.waiting) { scheduleIdle(); return; }
      cueKind = 'approval';
      // At ×1.5: one visible stopped second, then a measured approach and one click.
      cue.call(() => {
        if (!canAutomate() || !s.waiting) return;
        setCursorSequence(value => value + 1); setCursorPhase('approach');
      }, [], 1.5).call(() => {
        if (!canAutomate() || !s.waiting) { clearCue(); return; }
        const target = root.current?.querySelector<HTMLButtonElement>('.bwm-approve');
        if (!target || target.disabled) { clearCue(); return; }
        setCursorPhase('click'); s.automaticClick = true;
        try { target.click(); } finally { s.automaticClick = false; }
      }, [], 2.55).call(() => { cueKind = 'none'; setCursorPhase('none'); }, [], 2.85).play(0);
    }
    function armFinishedRest() {
      clearCue();
      if (!canAutomate()) { scheduleIdle(); return; }
      cueKind = 'rest';
      // A finite completed-state rest; no permanent repeating GSAP timeline.
      cue.call(() => { if (canAutomate()) resetSequence(); else scheduleIdle(); }, [], 3).play(0);
    }
    function finishSequence() {
      s.intent = false; isPlaying(false); isWaiting(false); announce(5);
      if (!s.reduced) armFinishedRest();
    }
    function resumeAutomation() {
      if (!alive || !s.visible || !foreground()) return;
      if (s.restartOnEntry || !s.started) {
        if (!idle()) { scheduleIdle(); return; }
        resetSequence(); return;
      }
      // A visitor's explicit approval may continue during their idle grace.
      if (s.intent && !s.waiting && s.stage < 5 && !s.reduced) { resumeMain(); return; }
      if (s.reduced) return;
      if (!idle()) { scheduleIdle(); return; }
      if (s.waiting) { if (cueKind !== 'approval' || cue.paused()) armApproval(); }
      else if (s.stage === 5) { if (cueKind !== 'rest' || cue.paused()) armFinishedRest(); }
      else { s.intent = true; resumeMain(); }
    }
    function pauseForVisitor() {
      s.lastInteraction = performance.now(); s.intent = false;
      tl.pause(); isPlaying(false); clearCue(); scheduleIdle();
    }
    function visitor(event: Event) { return event.isTrusted !== false && !s.automaticClick; }
    function editable(target: EventTarget | null) {
      return target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'));
    }
    function pointerDown(event: Event) {
      if (!visitor(event)) return;
      s.pointerDown = true; pauseForVisitor();
    }
    function pointerUp(event: Event) {
      if (!s.pointerDown || !visitor(event)) return;
      s.pointerDown = false; pauseForVisitor();
    }
    function keyDown(event: KeyboardEvent) {
      if (!visitor(event)) return;
      heldKeys.add(event.code || event.key); s.keyDown = true; pauseForVisitor();
    }
    function keyUp(event: KeyboardEvent) {
      if (!s.keyDown || !visitor(event)) return;
      heldKeys.delete(event.code || event.key); s.keyDown = heldKeys.size > 0; pauseForVisitor();
    }
    function focusIn(event: FocusEvent) {
      if (s.automaticClick) return;
      s.editing = editable(event.target); pauseForVisitor();
    }
    function focusOut(event: FocusEvent) {
      s.editing = editable(event.relatedTarget) && Boolean(root.current?.contains(event.relatedTarget as Node));
      if (!s.editing) pauseForVisitor();
    }
    function click(event: Event) { if (visitor(event)) pauseForVisitor(); }
    function approve() {
      if (!s.waiting) return;
      if (!s.automaticClick) { clearCue(); s.lastInteraction = performance.now(); }
      s.approved = true; isWaiting(false);
      if (s.reduced) {
        s.intent = false; tl.pause().seek(tl.duration(), true); render(); announce(5); isPlaying(false); return;
      }
      s.intent = true; tl.pause().seek(WORKFLOW_TIMING.hold + .001, true); resumeMain();
    }
    commands.current.approve = approve;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    function onReduced() {
      s.reduced = media.matches; setReduced(media.matches);
      if (s.reduced) {
        clearIdle(); clearCue(); tl.pause(); s.intent = false; isPlaying(false);
        if (s.started) {
          tl.seek(s.approved ? tl.duration() : WORKFLOW_TIMING.hold, true); render();
          announce(s.approved ? 5 : 3); isWaiting(!s.approved);
        } else if (s.visible) resetSequence();
      } else resumeAutomation();
    }
    onReduced(); media.addEventListener('change', onReduced);
    const observer = new IntersectionObserver(entries => {
      if (!alive) return;
      const entry = entries[entries.length - 1], visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= .08);
      const wasVisible = s.visible; s.visible = visible;
      if (!visible) {
        if (wasVisible) s.restartOnEntry = true;
        clearIdle(); cue.pause(); setCursorPhase('none'); tl.pause(); isPlaying(false); return;
      }
      if (!wasVisible) {
        if (s.visited) {
          // Idle grace belongs to the visit that ended. A real viewport return
          // starts fresh; tab visibility changes do not pass through this branch.
          clearIdle(); s.lastInteraction = -Infinity;
          s.pointerDown = false; s.keyDown = false; heldKeys.clear();
          s.editing = editable(document.activeElement) && Boolean(root.current?.contains(document.activeElement));
        }
        s.visited = true; s.restartOnEntry = true;
      }
      resumeAutomation();
    }, { threshold: .08 });
    if (root.current) observer.observe(root.current);
    function onVisibility() {
      if (!foreground()) {
        if (s.pointerDown || s.keyDown) { s.pointerDown = false; s.keyDown = false; heldKeys.clear(); s.lastInteraction = performance.now(); }
        clearIdle(); cue.pause(); setCursorPhase('none'); tl.pause(); isPlaying(false);
      }
      else resumeAutomation();
    }
    document.addEventListener('visibilitychange', onVisibility);
    const element = root.current;
    element?.addEventListener('pointerdown', pointerDown, true);
    element?.addEventListener('keydown', keyDown, true);
    element?.addEventListener('focusin', focusIn, true);
    element?.addEventListener('focusout', focusOut, true);
    element?.addEventListener('click', click, true);
    document.addEventListener('pointerup', pointerUp, true);
    document.addEventListener('pointercancel', pointerUp, true);
    document.addEventListener('keyup', keyUp, true);
    return () => {
      alive = false; clearIdle(); observer.disconnect(); media.removeEventListener('change', onReduced);
      document.removeEventListener('visibilitychange', onVisibility);
      element?.removeEventListener('pointerdown', pointerDown, true);
      element?.removeEventListener('keydown', keyDown, true);
      element?.removeEventListener('focusin', focusIn, true);
      element?.removeEventListener('focusout', focusOut, true);
      element?.removeEventListener('click', click, true);
      document.removeEventListener('pointerup', pointerUp, true);
      document.removeEventListener('pointercancel', pointerUp, true);
      document.removeEventListener('keyup', keyUp, true);
      cue.kill(); tl.kill(); timeline.current = null; cueTimeline.current = null;
      commands.current.approve = () => {};
    };
  }, { scope: root, dependencies: [] });

  React.useEffect(() => { timeline.current?.timeScale(playbackRate); cueTimeline.current?.timeScale(playbackRate); }, [playbackRate]);
  const approve = React.useCallback(() => commands.current.approve(), []);
  return { stage, playing, waiting, started, reduced, cursorPhase, cursorSequence, approve, statusText: WORKFLOW_STAGES[stage].status };
}
