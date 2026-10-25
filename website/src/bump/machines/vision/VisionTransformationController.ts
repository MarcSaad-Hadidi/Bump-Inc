import React from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { VISION_DESKTOP, VISION_MOBILE } from './geometry';
import { gearFrame, poseAt, worldOffset, depthOffset } from './geometry-source.mjs';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type VisionController = {
  seek: (value: number, immediate?: boolean) => void;
  followScroll: () => void;
};
export type VisionMotionOptions = {
  scrollLinked?: boolean;
  progress?: number;
  onProgress?: (progress: number) => void;
};

const PHASE_TEXT: Record<string, string> = {
  complexity: 'Partir du terrain — des besoins qui se croisent',
  alignment: 'Relier les expertises — partager le contexte',
  coherence: 'Garder la main — coordonner et valider les actions',
};

function bindScene(svg: SVGSVGElement, geometry: any) {
  const layer = svg.querySelector('[data-vision-parts]')!;
  const list = geometry.parts.map((part: any) => {
    const node = layer.querySelector(`[data-vision-part="${part.id}"]`) as SVGGElement;
    const paths = Object.fromEntries(Array.from(node.querySelectorAll<SVGPathElement>('[data-path]')).map(path => [path.dataset.path, path]));
    return { part, node, paths, lastFrame: -1, key: 0 };
  });
  let previousOrder = '';
  return (progress: number) => {
    const pose = poseAt(progress, geometry.config);
    for (const item of list) {
      const offset = worldOffset(item.part, pose);
      const xy = geometry.translate(offset);
      item.node.setAttribute('transform', `translate(${xy[0].toFixed(3)} ${xy[1].toFixed(3)})`);
      item.key = item.part.key + depthOffset(item.part,pose,geometry);
      if (item.part.shape.kind === 'geartooth') {
        const frame = gearFrame(pose.phases[item.part.group] || 0, item.part.shape.teeth);
        if (frame !== item.lastFrame) {
          const paths = geometry.gearFrames.get(`${item.part.shape.teeth}:${item.part.shape.tooth}`)[frame];
          for (const key of ['fill', 'top', 'crease', 'bevel', 'outline']) item.paths[key]?.setAttribute('d', paths[key] || '');
          paths.shades.forEach((d: string, i: number) => item.paths[`shade-${i}`]?.setAttribute('d', d));
          item.lastFrame = frame;
        }
      }
    }
    list.sort((a: any, b: any) => a.key - b.key);
    const order = list.map((item: any) => item.part.id).join('|');
    if (order !== previousOrder) {
      const fragment = document.createDocumentFragment();
      for (const item of list) fragment.appendChild(item.node);
      layer.appendChild(fragment);
      previousOrder = order;
    }
  };
}

/** One paused reversible GSAP timeline. Native scroll only supplies its progress. */
export function useVisionTransformationController(root: React.RefObject<HTMLElement | null>, options: VisionMotionOptions = {}) {
  const api = React.useRef<VisionController | null>(null);
  const onProgress = React.useRef(options.onProgress);
  onProgress.current = options.onProgress;

  useGSAP(() => {
    const stage = root.current;
    if (!stage) return;
    const range = stage.querySelector<HTMLInputElement>('[data-vision-range]')!;
    const readout = stage.querySelector<HTMLOutputElement>('[data-vision-percent]')!;
    const modeLabel = stage.querySelector<HTMLElement>('[data-vision-mode]')!;
    const status = stage.querySelector<HTMLElement>('[data-vision-status]')!;
    const followButton = stage.querySelector<HTMLButtonElement>('[data-vision-follow]')!;
    const stateButtons = Array.from(stage.querySelectorAll<HTMLButtonElement>('[data-vision-state]'));
    const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 680px)');
    const drawDesktop = bindScene(stage.querySelector('[data-vision-scene="desktop"]')!, VISION_DESKTOP);
    const drawMobile = bindScene(stage.querySelector('[data-vision-scene="mobile"]')!, VISION_MOBILE);
    let manual = stillness.matches || options.scrollLinked === false || options.progress !== undefined;
    let visible = true;
    let background = document.hidden;
    let lastScrollProgress = 0;
    let lastPhase = '';
    let trigger: ScrollTrigger | undefined;
    let seeking: gsap.core.Tween | undefined;
    let idleTimer: number | undefined;
    let idleRemaining = 30_000;
    let idleDue = 0;
    let idleArmed = false;
    let hasEnteredViewport = false;
    let nativeOnRelease = false;
    const heldPointers = new Set<number>();
    const heldKeys = new Set<string>();
    const canAutoFollow = () => !stillness.matches && options.scrollLinked !== false && options.progress === undefined;
    const controlsHeld = () => heldPointers.size > 0 || heldKeys.size > 0;
    const pauseIdle = () => {
      if (idleTimer !== undefined) {
        window.clearTimeout(idleTimer);
        idleTimer = undefined;
        idleRemaining = Math.max(0, idleDue - performance.now());
      }
    };
    const resumeIdle = () => {
      if (!idleArmed || idleTimer !== undefined || !manual || !visible || background || controlsHeld() || !canAutoFollow()) return;
      idleDue = performance.now() + idleRemaining;
      idleTimer = window.setTimeout(() => {
        idleTimer = undefined;
        idleRemaining = 0;
        if (visible && !background && !controlsHeld() && canAutoFollow()) followScroll();
      }, idleRemaining);
    };
    const recordManualInteraction = () => {
      pauseIdle();
      idleRemaining = 30_000;
      idleArmed = canAutoFollow();
      resumeIdle();
    };
    const driver = { value: 0 };
    const state = { progress: 0 };

    const describeMode = () => {
      stage.dataset.visionMode = manual ? 'manual' : 'scroll';
      modeLabel.textContent = stillness.matches ? 'Mode manuel · mouvement réduit' : manual ? 'Progression manuelle' : 'Au fil du défilement';
      followButton.disabled = stillness.matches || options.scrollLinked === false;
      followButton.setAttribute('aria-pressed', String(!manual));
    };
    const draw = () => {
      const value = Math.max(0, Math.min(1, state.progress));
      stage.dataset.visionProgress = value.toFixed(4);
      const phase = value < .34 ? 'complexity' : value < .8 ? 'alignment' : 'coherence';
      stage.dataset.phase = phase;
      if (mobileQuery.matches) drawMobile(value); else drawDesktop(value);
      range.value = String(Math.round(value * 1000));
      readout.textContent = `${Math.round(value * 100)} %`;
      // Coarse phase announcements only. No screen-reader stream on animation frames.
      if (phase !== lastPhase) {
        stateButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.visionState === phase)));
        stage.querySelectorAll<HTMLElement>('[data-copy]').forEach(copy => copy.setAttribute('aria-hidden', String(copy.dataset.copy !== phase)));
        range.setAttribute('aria-valuetext', PHASE_TEXT[phase]);
        lastPhase = phase;
      }
      onProgress.current?.(value);
    };
    // The timeline is the one source of geometric progress; it has no autoplay loop.
    const timeline = gsap.timeline({ paused: true, onUpdate: draw })
      .addLabel('complexity', 0).addLabel('alignment', .34).addLabel('coherence', .8)
      .to(state, { progress: 1, duration: 1, ease: 'none' }, 0);

    const seek = (value: number, immediate = false) => {
      manual = true;
      describeMode();
      seeking?.kill();
      const destination = Math.max(0, Math.min(1, value));
      if (immediate || stillness.matches || !visible || background) {
        driver.value = destination;
        timeline.progress(destination, true);
        draw();
      } else {
        driver.value = timeline.progress();
        seeking = gsap.to(driver, { value: destination, duration: .75, ease: 'power2.inOut', onUpdate: () => timeline.progress(driver.value), onComplete: () => { status.textContent = PHASE_TEXT[stage.dataset.phase || 'complexity']; } });
      }
    };
    const followScroll = () => {
      if (stillness.matches || options.scrollLinked === false) return;
      pauseIdle(); idleArmed = false; nativeOnRelease = false;
      seeking?.kill(); manual = false; describeMode();
      trigger?.update();
      lastScrollProgress = trigger?.progress ?? lastScrollProgress;
      if (visible && !background) timeline.progress(lastScrollProgress, true);
      draw();
      range.setAttribute('aria-valuetext', PHASE_TEXT[stage.dataset.phase || 'complexity']);
    };
    api.current = { seek, followScroll };
    const readScrollProgress = (self: ScrollTrigger) => {
      lastScrollProgress = self.progress;
      if (!manual && visible && !background) timeline.progress(self.progress);
    };
    if (options.scrollLinked !== false) {
      trigger = ScrollTrigger.create({
        // Use the artwork's center: mobile copy is taller than one viewport,
        // while the whole transformation must finish with the gears in view.
        trigger: stage.querySelector('.bvs-art') || stage,
        start: 'center 78%',
        end: 'center 42%',
        // No pin, no Observer, no scroller proxy, no writing the page's scroll position.
        onUpdate: readScrollProgress,
        onRefresh: readScrollProgress,
      });
      readScrollProgress(trigger);
    }

    const onInput = () => { seek(Number(range.value) / 1000, true); recordManualInteraction(); range.setAttribute('aria-valuetext', `${PHASE_TEXT[stage.dataset.phase || 'complexity']} · ${Math.round(Number(range.value) / 10)} pour cent`); status.textContent = ''; };
    const onCommit = () => { status.textContent = PHASE_TEXT[stage.dataset.phase || 'complexity']; };
    const onReset = () => seek(0);
    const onState = (event: Event) => { const button = event.currentTarget as HTMLButtonElement; seek(Number(button.dataset.visionAt)); recordManualInteraction(); };
    const onResizeMode = () => { if (mobileQuery.matches) drawMobile(timeline.progress()); else drawDesktop(timeline.progress()); };
    const isManualControl = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-vision-range],[data-vision-state]');
    const resumeAfterHold = () => {
      if (nativeOnRelease && visible && !background && !controlsHeld() && canAutoFollow()) followScroll();
      else resumeIdle();
    };
    const onPointerDown = (event: PointerEvent) => { if (isManualControl(event.target)) { heldPointers.add(event.pointerId); pauseIdle(); } };
    const onPointerUp = (event: PointerEvent) => { heldPointers.delete(event.pointerId); resumeAfterHold(); };
    const controlKeys = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown',' ','Enter']);
    const onKeyDown = (event: KeyboardEvent) => { if (isManualControl(event.target) && controlKeys.has(event.key)) { heldKeys.add(event.code || event.key); pauseIdle(); } };
    const onKeyUp = (event: KeyboardEvent) => { heldKeys.delete(event.code || event.key); resumeAfterHold(); };
    const onBlur = () => { heldPointers.clear(); heldKeys.clear(); resumeAfterHold(); };
    const onStillness = () => {
      if (stillness.matches) { pauseIdle(); idleArmed = false; nativeOnRelease = false; seeking?.kill(); manual = true; }
      describeMode();
    };
    const onVisibility = () => {
      background = document.hidden;
      if (background) { pauseIdle(); seeking?.pause(); heldPointers.clear(); heldKeys.clear(); }
      else if (visible) {
        if (nativeOnRelease && canAutoFollow()) followScroll();
        else { if (manual) seeking?.resume(); else timeline.progress(lastScrollProgress); resumeIdle(); }
      }
    };
    const observer = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      const wasVisible = visible;
      visible = !!entry?.isIntersecting;
      const reentered = hasEnteredViewport && !wasVisible && visible;
      if (visible) hasEnteredViewport = true;
      if (!visible) { pauseIdle(); seeking?.pause(); }
      else if (reentered && canAutoFollow()) {
        nativeOnRelease = true;
        resumeAfterHold();
      } else if (!background) {
        if (manual) seeking?.resume(); else timeline.progress(lastScrollProgress);
        resumeIdle();
      }
    }, { rootMargin: '0px', threshold: 0 });
    observer.observe(stage);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    range.addEventListener('input', onInput);
    range.addEventListener('change', onCommit);
    stage.querySelector('[data-vision-reset]')!.addEventListener('click', onReset);
    followButton.addEventListener('click', followScroll);
    stateButtons.forEach(button => button.addEventListener('click', onState));
    stillness.addEventListener('change', onStillness);
    mobileQuery.addEventListener('change', onResizeMode);
    document.addEventListener('visibilitychange', onVisibility);
    describeMode(); draw();

    return () => {
      api.current = null;
      pauseIdle(); idleArmed = false;
      observer.disconnect();
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      trigger?.kill();
      seeking?.kill();
      timeline.kill();
      range.removeEventListener('input', onInput);
      range.removeEventListener('change', onCommit);
      stage.querySelector('[data-vision-reset]')?.removeEventListener('click', onReset);
      followButton.removeEventListener('click', followScroll);
      stateButtons.forEach(button => button.removeEventListener('click', onState));
      stillness.removeEventListener('change', onStillness);
      mobileQuery.removeEventListener('change', onResizeMode);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, { scope: root, dependencies: [options.scrollLinked], revertOnUpdate: true });

  React.useEffect(() => { if (options.progress !== undefined) api.current?.seek(options.progress, true); }, [options.progress]);
  return api;
}
