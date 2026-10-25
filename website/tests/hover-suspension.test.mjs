import test from 'node:test';
import assert from 'node:assert/strict';
import {mountHoverDemonstration} from '../src/bump/ui/hoverDemonstration.js';

function fixture() {
  const saved = new Map(), timers = new Map(), observers = [];
  let now = 0, id = 0, inView = true, visits = 0;
  const set = (key, value) => {saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});};
  class Node extends EventTarget {
    constructor() {super(); this.dataset = {}; this.style = {}; this.children = []; this.handlers = new Map();}
    append(node) {this.children.push(node);} remove() {} setAttribute() {} removeAttribute() {}
    closest(selector) {return selector === '[data-bump-transport]' ? root : this === part && selector.includes('[data-bump-info]') ? part : null;}
    getBoundingClientRect() {return {left: 100, top: inView ? 100 : 2000, bottom: inView ? 800 : 2700, width: 800, height: 700};}
    addEventListener(type, fn, options) {super.addEventListener(type, fn, options);
      this.handlers.set(type, [...(this.handlers.get(type) || []), fn]);}
  }
  const root = new Node(), part = new Node(), document = new EventTarget(), window = new EventTarget(), media = new EventTarget();
  root.querySelector = () => null; root.querySelectorAll = () => [part];
  part.addEventListener('pointerenter', () => visits++);
  document.hidden = false; document.documentElement = {dataset: {bumpOpening: 'scene', bumpAssistedScroll: 'true', bumpScrollMoving: 'false'}};
  document.createElement = () => new Node(); media.matches = false;
  set('document', document); set('window', window); set('innerHeight', 900); set('matchMedia', () => media); set('performance', {now: () => now});
  set('setTimeout', (fn, ms) => {timers.set(++id, {at: now + ms, fn}); return id;});
  set('clearTimeout', key => timers.delete(key));
  set('requestAnimationFrame', fn => {timers.set(++id, {at: now + 16, fn}); return id;});
  set('cancelAnimationFrame', key => timers.delete(key));
  set('CustomEvent', class extends Event {constructor(type, init) {super(type, init); this.detail = init?.detail;}});
  set('PointerEvent', class extends Event {constructor(type, init) {super(type, init); this.pointerType = init.pointerType;}});
  set('IntersectionObserver', class {constructor(fn) {observers.push(fn);} observe() {} disconnect() {}});
  set('MutationObserver', class {observe() {} disconnect() {}});
  const stop = mountHoverDemonstration(root, 'workflow');
  return {root, part, get visits() {return visits;},
    advance(ms) {const end = now + ms;
      for (let i = 0; i < 1000; i++) {const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn();} now = end;},
    tab(hidden) {document.hidden = hidden; document.dispatchEvent(new Event('visibilitychange'));},
    view(value) {inView = value; observers[0]();},
    user(type, target = root) {for (const fn of root.handlers.get(type) || []) fn({isTrusted: true, type, target});},
    dispose() {stop(); for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }},
  };
}

test('tab suspension preserves all remaining input grace before the hover tour', () => {
  const f = fixture(); try {
    f.advance(100); f.user('keydown'); f.advance(2000);
    f.tab(true); f.advance(10000); f.tab(false);
    f.advance(27999); assert.equal(f.visits, 0); assert.equal(f.root.dataset.bumpDemoInspecting, 'false');
    f.advance(1); assert.equal(f.visits, 0); f.advance(380); assert.equal(f.visits, 1);
  } finally {f.dispose();}
});

test('a completed hover tour stays completed after returning to the tab, and replays after a real section return', () => {
  const f = fixture(); try {
    f.advance(4000); assert.equal(f.visits, 1); assert.equal(f.root.dataset.bumpHoverComplete, 'true');
    f.tab(true); f.advance(10000); f.tab(false); f.advance(10000);
    assert.equal(f.visits, 1); assert.equal(f.root.dataset.bumpHoverComplete, 'true');
    f.view(false); f.view(true); f.advance(1180); assert.equal(f.visits, 2);
  } finally {f.dispose();}
});

test('a real hovered selection survives tab suspension and pointer movement cannot shorten click grace', () => {
  const f = fixture(); try {
    f.advance(100); f.user('pointerdown', f.part); f.user('pointermove', f.part);
    assert.equal(f.visits, 1, 'the real visitor opens their own explanation');
    f.tab(true); f.advance(10000); f.tab(false); f.advance(1000);
    assert.equal(f.visits, 1); assert.equal(f.root.dataset.bumpDemoInspecting, 'false');
    f.user('pointerout'); f.advance(28999); assert.equal(f.visits, 1);
    f.advance(1); f.advance(380); assert.equal(f.visits, 2);
  } finally {f.dispose();}
});
