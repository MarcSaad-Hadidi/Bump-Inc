// A small clock advances the existing semantic diagram; no canvas or frame loop.
export const FLOW_DURATIONS = [1600, 2400, 2800, 2400, 2800];

export function createDiagramPlayer(figure, {clock = performance, schedule = setTimeout, cancel = clearTimeout} = {}) {
  const steps = [...figure.querySelectorAll('.seo-flow-steps>li,[data-story-steps]>*')];
  const sources = [...figure.querySelectorAll('.seo-flow-sources>span,[data-story-sources]>*')];
  const durations = steps.length === 3 ? FLOW_DURATIONS : [1600,...steps.map(() => 2400),2800];
  const answers = [...figure.querySelectorAll('[data-story-answer-copy]')];
  let phase = 0, remaining = FLOW_DURATIONS[0], started = 0, timer = null;
  let visible = false, hidden = false, reduced = false, inspecting = false, disposed = false;
  const paint = () => {
    figure.dataset.flowPhase = String(phase);
    figure.dataset.flowComplete = String(phase === durations.length - 1);
    steps.forEach((step, index) => {
      step.classList.toggle('is-active', phase === index + 1);
      step.classList.toggle('is-done', phase > index + 1);
    });
    sources.forEach(source => source.classList.toggle('is-connected', phase > 0));
    answers.forEach((answer,index) => {
      const active = index === Math.min(Math.max(phase - 1,0),answers.length - 1);
      answer.classList.toggle('is-visible', active);
      answer.setAttribute('aria-hidden', String(!active));
    });
  };
  const stop = () => {
    if (timer !== null) {
      cancel(timer); timer = null;
      remaining = Math.max(0, remaining - (clock.now() - started));
    }
    figure.dataset.flowRunning = 'false';
  };
  const sync = () => {
    stop();
    if (disposed || !visible || hidden || reduced || inspecting) return;
    figure.dataset.flowRunning = 'true';
    started = clock.now();
    timer = schedule(() => {
      timer = null;
      phase = (phase + 1) % durations.length;
      remaining = durations[phase];
      paint(); sync();
    }, remaining);
  };
  paint();
  return {
    setVisible(value) {
      stop();
      if (value && !visible && !reduced) {phase = 0; remaining = FLOW_DURATIONS[0]; paint();}
      visible = value; sync();
    },
    setHidden(value) {hidden = value; sync();},
    setInspecting(value) {inspecting = value; sync();},
    setReduced(value) {
      stop(); reduced = value;
      phase = value ? durations.length - 1 : 0; remaining = durations[phase];
      paint(); sync();
    },
    destroy() {stop(); disposed = true;},
  };
}

export function installDiagramMotion(doc = document, win = window) {
  const figures = [...doc.querySelectorAll('[data-seo-flow]')];
  if (!figures.length) return () => {};
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = win.matchMedia('(hover: hover)');
  const cleanups = [], players = new Map();
  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };
  for (const figure of figures) {
    const player = createDiagramPlayer(figure);
    players.set(figure, player);
    player.setReduced(reduced.matches);
    player.setHidden(doc.hidden);
    let pointerInside = false, focusInside = false;
    const inspect = () => player.setInspecting(pointerInside || focusInside);
    listen(figure, 'pointerenter', event => {
      pointerInside = hover.matches && event.pointerType !== 'touch'; inspect();
    });
    listen(figure, 'pointerleave', () => {pointerInside = false; inspect();});
    listen(figure, 'focusin', () => {focusInside = true; inspect();});
    listen(figure, 'focusout', event => {focusInside = figure.contains(event.relatedTarget); inspect();});
    cleanups.push(() => player.destroy());
  }
  if ('IntersectionObserver' in win) {
    const observer = new win.IntersectionObserver(entries => {
      for (const entry of entries) players.get(entry.target)?.setVisible(entry.isIntersecting);
    }, {threshold: 0.15});
    figures.forEach(figure => observer.observe(figure));
    cleanups.push(() => observer.disconnect());
  } else players.forEach(player => player.setVisible(true));
  listen(doc, 'visibilitychange', () => players.forEach(player => player.setHidden(doc.hidden)));
  listen(reduced, 'change', () => players.forEach(player => player.setReduced(reduced.matches)));
  return () => cleanups.forEach(cleanup => cleanup());
}
