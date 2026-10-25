import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

function fixture(options = {}) {
  const refs = [], effects = [], timers = new Map(), microtasks = [];
  let refIndex = 0, effectIndex = 0, pending = [], now = 1000, id = 0, replays = 0;
  const node = new EventTarget(), document = new EventTarget();
  node.dataset = {}; node.contains = () => false; document.activeElement = null; document.hidden = false;
  const React = {
    useRef(value) { const index = refIndex++; return refs[index] ||= {current: value}; },
    useEffect(callback, deps) { pending.push({index: effectIndex++, callback, deps}); },
  };
  const source = readFileSync('src/bump/ui/useIdleReplay.js', 'utf8').replace(/^import .*;\n/, '').replace('export function', 'function');
  const hook = runInNewContext(source + ';useIdleReplay', {React, document, performance: {now: () => now},
    setTimeout(callback, delay) { const key = ++id; timers.set(key, {callback, at: now + delay}); return key; },
    clearTimeout(key) { timers.delete(key); }, queueMicrotask(callback) { microtasks.push(callback); }});
  const props = {root: {current: node}, visible: true, intersecting: true, foreground: true,
    reduced: false, finished: false, onReplay: () => replays++, ...options};
  const flush = () => { while (microtasks.length) microtasks.shift()(); };
  function render(changes = {}) {
    Object.assign(props, changes); refIndex = effectIndex = 0; pending = []; hook(props);
    for (const {index, callback, deps} of pending) {
      const previous = effects[index];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) continue;
      previous?.cleanup?.(); effects[index] = {deps, cleanup: callback()};
    }
    flush();
  }
  render();
  return {node, render, get replays() { return replays; },
    get nextDeadline() { return Math.min(...[...timers.values()].map(timer => timer.at)); },
    visibility(hidden) { document.hidden = hidden; document.dispatchEvent(new Event('visibilitychange'));
      render({visible: !hidden, foreground: !hidden}); },
    advance(ms) { now += ms; let entry;
      while ((entry = [...timers.entries()].find(([, timer]) => timer.at <= now))) {
        timers.delete(entry[0]); entry[1].callback(); flush();
      }
    },
    dispose() { for (const effect of effects) effect?.cleanup?.(); },
  };
}

test('returning to the browser tab resumes a running demo without replaying it', () => {
  const demo = fixture();
  try {
    demo.visibility(true); demo.advance(12000); demo.visibility(false);
    assert.equal(demo.replays, 0); assert.equal(demo.nextDeadline, Infinity);
  } finally { demo.dispose(); }
});

test('background suspension preserves the visitor interaction grace before the ordinary idle replay', () => {
  const demo = fixture({finished: true});
  try {
    demo.advance(100); demo.node.dispatchEvent(new Event('click'));
    demo.visibility(true); demo.advance(10000); demo.visibility(false);
    assert.equal(demo.replays, 0); assert.equal(demo.nextDeadline, 41100);
    demo.advance(29999); assert.equal(demo.replays, 0);
    demo.advance(1); assert.equal(demo.replays, 1);
  } finally { demo.dispose(); }
});

test('a real viewport exit waits for settled re-entry and replays exactly once', () => {
  const demo = fixture();
  try {
    demo.render({visible: false, intersecting: false});
    demo.render({visible: false, intersecting: true});
    assert.equal(demo.replays, 0);
    demo.render({visible: true}); assert.equal(demo.replays, 1);
    demo.render({visible: true}); assert.equal(demo.replays, 1);
  } finally { demo.dispose(); }
});

test('viewport re-entry respects an explicit pause', () => {
  const demo = fixture({manualPaused: true});
  try {
    demo.render({visible: false, intersecting: false});
    demo.render({visible: true, intersecting: true});
    assert.equal(demo.replays, 0); assert.equal(demo.nextDeadline, Infinity);
  } finally { demo.dispose(); }
});

// Exercise each real caller as well as the shared hook: an optional-looking
// viewport signal must not silently disappear when another caller is updated.
for (const [name, path, call] of [
  ['software', 'src/bump/software/demos/useScenario.js', 'useScenario(checkpoints, 10000, 1)'],
  ['security', 'src/bump/security/useSecurityScenario.js', 'useSecurityScenario(1, checkpoints, 10000)'],
  ['workflow', 'src/bump/workflow/useWorkflowJourney.js', 'useWorkflowJourney(stages, root)'],
]) {
  test(`${name} preserves tab state and replays after a real viewport return`, () => {
    const slots = [], effects = [], observers = [], microtasks = [];
    let slot = 0, effect = 0, pending = [], dirty = false, replays = 0;
    let bounds = {top: 100, bottom: 850, width: 800, height: 750};
    const node = new EventTarget(), document = new EventTarget(), window = new EventTarget();
    node.dataset = {}; node.contains = () => false; node.getAnimations = () => [];
    node.getBoundingClientRect = () => bounds;
    document.activeElement = null; document.hidden = false;
    document.documentElement = {dataset: {bumpOpening: 'scene', bumpAssistedScroll: 'true', bumpScrollMoving: 'false'}};
    const React = {
      useRef(value) { const i = slot++; return slots[i] ||= {current: value}; },
      useState(initial) {
        const i = slot++;
        if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
        return [slots[i], value => { const next = typeof value === 'function' ? value(slots[i]) : value;
          if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; } }];
      },
      useEffect(callback, deps) { pending.push({index: effect++, callback, deps}); },
      useSyncExternalStore() { return null; },
    };
    if (name !== 'workflow') slots[0] = {current: node};
    const strip = path => readFileSync(path, 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
    const context = {React, ...React, document, window, getBumpViewportHeight: () => 900,
      performance: {now: () => 1000}, setTimeout: () => 1, clearTimeout() {},
      queueMicrotask: callback => microtasks.push(callback),
      matchMedia: () => ({matches: false, addEventListener() {}, removeEventListener() {}}),
      IntersectionObserver: class { constructor(callback) { observers.push(callback); } observe() {} disconnect() {} },
      MutationObserver: class { observe() {} disconnect() {} },
      useDemoTurn: () => ({turn: false, canRestart: true}),
      useMotionValue(value) { return React.useRef({get: () => value, set(next) { value = next; }, on: () => () => {}}).current; },
      animate: () => ({stop() {}}), BUMP_SCENARIO_RATE: 1, BUMP_PLAYBACK_RATE: 1,
      checkpoints: [1000, 5000], stages: [{duration: 1000}, {duration: 1000}, {duration: 1000}, {duration: 1000}],
      root: {current: node}, recordReplay: () => replays++,
    };
    const renderHook = runInNewContext(
      strip('src/bump/ui/demoReady.js') + '\n' +
      strip('src/bump/ui/useIdleReplay.js').replace('function useIdleReplay', 'function idleReplay') + '\n' +
      'function useIdleReplay(options) { return idleReplay({...options, onReplay: () => {recordReplay(); options.onReplay();}}); }\n' +
      strip(path) + `; () => ${call}`, context);
    function render() {
      let renders = 0;
      do {
        assert.ok(++renders < 20, 'caller state should settle');
        dirty = false; slot = effect = 0; pending = []; renderHook();
        for (const {index, callback, deps} of pending) {
          const previous = effects[index];
          if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) continue;
          previous?.cleanup?.(); effects[index] = {deps, cleanup: callback()};
        }
        while (microtasks.length) microtasks.shift()();
      } while (dirty);
    }
    try {
      render();
      observers[0]([{isIntersecting: true, intersectionRatio: 1}]); render();
      document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); render();
      document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); render();
      assert.equal(replays, 0, 'background suspension must resume the same sequence');
      bounds = {top: 1000, bottom: 1750, width: 800, height: 750};
      observers[0]([{isIntersecting: false, intersectionRatio: 0}]); render();
      bounds = {top: 100, bottom: 850, width: 800, height: 750};
      observers[0]([{isIntersecting: true, intersectionRatio: 1}]); render();
      assert.equal(replays, 1, 'a real section return must replay exactly once');
      render(); assert.equal(replays, 1);
    } finally { for (const entry of effects) entry?.cleanup?.(); }
  });
}
