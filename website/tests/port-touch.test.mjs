import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {installTouchInspection} from '../src/bump/ui/touchInspection.js';

const built = await build({entryPoints: ['src/bump/machines/suppliedPortPresentation.js'], bundle: true, platform: 'node', format: 'esm', write: false});
const {mountPortPresentation, PORT_CONTAINERS} = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));

test('all original and restocked cargoes latch their actual explanation on touch and release on another tap or swipe', async () => {
  const saved = new Map(), set = (key, value) => {saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {value, configurable: true, writable: true});};
  class Node extends EventTarget {
    constructor() {super(); this.dataset = {}; this.style = {}; this.attrs = {}; this.children = []; this.parentElement = null;
      this.hidden = false; this.textContent = ''; this.offsetWidth = 160; this.offsetHeight = 60; this.handlers = new Map();}
    setAttribute(key, value) {this.attrs[key] = value; if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;}
    hasAttribute(key) {return key in this.attrs;} removeAttribute(key) {delete this.attrs[key];}
    append(...nodes) {for (const node of nodes) {node.parentElement = this; this.children.push(node);}}
    replaceChildren(...nodes) {this.children = []; this.append(...nodes);} remove() {}
    closest(selector) {for (let node = this; node; node = node.parentElement) {
      if (selector === '[data-bump-info]' && node.hasAttribute('data-bump-info')) return node;
      if (node === root && (selector === '[data-bump-transport]' || selector.includes('.bump-port-import'))) return node;
    } return null;}
    contains(node) {for (; node; node = node.parentElement) if (node === this) return true; return false;}
    getBBox() {return {x: 20, y: 30, width: 80, height: 50};}
    getBoundingClientRect() {return {left: 100, top: 100, width: 800, height: 500};}
    addEventListener(type, fn, options) {super.addEventListener(type, fn, options); this.handlers.set(type, [...(this.handlers.get(type) || []), fn]);}
    querySelector() {return null;} querySelectorAll() {return [];}
  }
  const root = new Node(), stage = new Node(), svg = new Node(), readout = new Node(), fields = new Map();
  root.append(stage); stage.append(svg);
  const cargoes = Array.from({length: 12}, (_, i) => {
    const cargo = new Node(), part = new Node(); cargo.dataset[i < 6 ? 'cargo' : 'portRestock'] = String(i % 6);
    part.dataset.need = String(Math.floor(i % 6 / 2)); cargo.append(part); cargo.querySelector = () => part; svg.append(cargo); return {cargo, part};
  });
  svg.querySelectorAll = selector => selector === '[data-cargo],[data-port-restock]' ? cargoes.map(entry => entry.cargo) : [];
  stage.querySelector = () => svg;
  root.querySelector = selector => selector === '.iso-stage' ? stage : selector === '[data-readout]' ? readout :
    (fields.has(selector) ? fields.get(selector) : (fields.set(selector, new Node()), fields.get(selector)));
  const doc = new Node(), win = new Node(); doc.documentElement = new Node();
  doc.createElement = doc.createElementNS = () => new Node();
  win.PointerEvent = class extends Event {constructor(type, init) {super(type, init); this.pointerType = init.pointerType; this.clientX = init.clientX; this.clientY = init.clientY;}};
  let removePresentation, removeTouch;
  const fire = (type, target, extra = {}) => {let blocked = false;
    for (const fn of doc.handlers.get(type) || []) fn({pointerType: 'touch', target, clientX: 20, clientY: 30,
      stopImmediatePropagation() {blocked = true;}, ...extra}); return blocked;};
  try {
    set('document', doc); set('window', win); set('MutationObserver', class {observe() {} disconnect() {}});
    removePresentation = mountPortPresentation(root); removeTouch = installTouchInspection(doc, win);
    const tip = root.children.find(node => node.className?.includes('bump-port-tooltip'));
    for (let i = 0; i < cargoes.length; i++) {
      const {part} = cargoes[i], label = part.children[0];
      assert.ok(part.hasAttribute('data-bump-info'), 'both cargo sets must join the shared registry');
      fire('pointerdown', label); await Promise.resolve();
      assert.equal(root.dataset.bumpTouchInspected, 'true'); assert.equal(root.dataset.bumpDemoInspecting, 'true');
      assert.equal(tip.hidden, false); assert.equal(root.dataset.portInspect, String(i % 6));
      assert.ok(tip.children[0].textContent.startsWith(PORT_CONTAINERS[i % 6][0]));
      const blocked = fire('pointerleave', label);
      if (!blocked) part.dispatchEvent(new win.PointerEvent('pointerleave', {pointerType: 'touch'}));
      assert.equal(blocked, true); assert.equal(tip.hidden, false, 'lifting the finger retains the real tooltip');
      fire('pointerdown', label); await Promise.resolve();
      assert.equal(tip.hidden, true); assert.equal(root.dataset.bumpTouchInspected, undefined);
      assert.equal(root.dataset.bumpDemoInspecting, 'false');
    }
    fire('pointerdown', cargoes[0].part); await Promise.resolve(); fire('pointermove', cargoes[0].part, {clientX: 50});
    assert.equal(tip.hidden, true); assert.equal(root.dataset.bumpDemoInspecting, 'false');
  } finally {
    removeTouch?.(); removePresentation?.();
    for (const [key, descriptor] of saved) {if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];}
  }
});
