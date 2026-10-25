import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transform} from 'esbuild';
import {observeDemoReady} from '../src/bump/ui/demoReady.js';

for (const [name, model, mount, copy] of [
  ['Method', 'MethodLab', 'mountMethodAnnotations', 'methodExplanations'],
  ['Vision', 'VisionBench', 'mountVisionPresentation', 'VISION_COPY'],
  ['Port', 'BumpPort', 'mountPortPresentation', 'PORT_COPY'],
]) {
  test(`${name} retains its model key through tab suspension and remounts only after settled viewport re-entry`, async () => {
    const original = new Map(), set = (key, value) => {
      original.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});
    };
    const root = {dataset: {bumpOpening: 'scene', bumpAssistedScroll: 'true', bumpScrollMoving: 'false'}};
    const document = new EventTarget(), window = new EventTarget(), media = new EventTarget();
    document.documentElement = root; document.hidden = false; media.matches = false;
    let box = {top: 100, bottom: 850, width: 800, height: 750}, active = false, revisions = 0;
    const node = {dataset: {}, getBoundingClientRect: () => box}, observers = [], cleanups = [];
    const React = {
      useRef: () => ({current: node}), useState: () => [false, value => {active = value;}],
      useReducer: () => [0, () => revisions++],
      useEffect: callback => cleanups.push(callback()), createElement: () => null,
    };
    try {
      set('document', document); set('window', window); set('innerHeight', 900);
      set('IntersectionObserver', class { constructor(callback) {observers.push(callback);} observe() {} disconnect() {} });
      set('MutationObserver', class { constructor(callback) {observers.push(callback);} observe() {} disconnect() {} });
      const source = readFileSync(`src/bump/machines/Supplied${name}.jsx`, 'utf8')
        .replace(/^import .*;\n/gm, '').replace('export default function', 'function');
      const compiled = await transform(source, {loader: 'jsx', target: 'es2022'});
      const component = runInNewContext(compiled.code + `;Supplied${name}`, {
        React, observeDemoReady, matchMedia: () => media, [model]: () => null,
        [mount]: () => () => {}, [copy]: [['title', 'detail']], METHOD_PLAYBACK_RATE: 1.15,
      });
      component(); assert.equal(active, true); assert.equal(revisions, 0);
      document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
      assert.equal(active, false);
      document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
      assert.equal(active, true); assert.equal(revisions, 0, 'same React key preserves model time and controls');
      // A scroll readiness change alone is not a physical departure either.
      root.dataset.bumpScrollMoving = 'true'; observers[1]();
      root.dataset.bumpScrollMoving = 'false'; observers[1]();
      assert.equal(revisions, 0);
      box = {top: 1000, bottom: 1750, width: 800, height: 750}; observers[0]();
      root.dataset.bumpScrollMoving = 'true';
      box = {top: 100, bottom: 850, width: 800, height: 750}; observers[0]();
      assert.equal(revisions, 0, 'approach must not remount early');
      root.dataset.bumpScrollMoving = 'false'; window.dispatchEvent(new Event('bump:scroll-settled'));
      assert.equal(revisions, 1); observers[0](); assert.equal(revisions, 1);
      media.matches = true; media.dispatchEvent(new Event('change'));
      assert.equal(revisions, 2, 'explicit reduced-motion changes still refresh the model');
    } finally {
      for (const cleanup of cleanups) cleanup?.();
      for (const [key, descriptor] of original) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
      }
    }
  });
}
