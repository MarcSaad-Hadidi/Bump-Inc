import test from 'node:test';
import assert from 'node:assert/strict';
import {parse} from 'parse5';
import {createDiagramPlayer, FLOW_DURATIONS} from '../src/bump/seo/diagram-motion.js';
import {expertiseLinks} from '../src/bump/seo/navigation.js';
import {listPages, pageFor} from '../src/bump/seo/pages.js';
import {renderHtml} from '../src/bump/seo/render.js';

function clockHarness(count = 3) {
  let time = 0, nextId = 0;
  const timers = new Map();
  const items = count => Array.from({length: count}, () => {
    const classes = new Set();
    return {classes, classList: {toggle(name, value) {value ? classes.add(name) : classes.delete(name);}}};
  });
  const steps = items(count), sources = items(3);
  const figure = {dataset: {}, querySelectorAll(selector) {return selector.includes('steps') ? steps : selector.includes('sources') ? sources : [];}};
  const player = createDiagramPlayer(figure, {
    clock: {now: () => time},
    schedule(fn, delay) {const id = ++nextId; timers.set(id, {fn, at: time + delay}); return id;},
    cancel(id) {timers.delete(id);},
  });
  const advance = duration => {
    const end = time + duration;
    while (true) {
      const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      timers.delete(next[0]); time = next[1].at; next[1].fn();
    }
    time = end;
  };
  return {player, figure, steps, sources, timers, advance};
}

test('the diagram runs one ordered, repeating journey only while visible', () => {
  const ui = clockHarness();
  ui.advance(20000); assert.equal(ui.figure.dataset.flowPhase, '0'); assert.equal(ui.timers.size, 0);
  ui.player.setVisible(true);
  ui.advance(FLOW_DURATIONS[0]);
  assert.equal(ui.figure.dataset.flowPhase, '1'); assert(ui.steps[0].classes.has('is-active'));
  assert(ui.sources.every(source => source.classes.has('is-connected')));
  ui.advance(FLOW_DURATIONS[1]); assert.equal(ui.figure.dataset.flowPhase, '2');
  assert(ui.steps[0].classes.has('is-done')); assert(ui.steps[1].classes.has('is-active'));
  ui.advance(FLOW_DURATIONS[2] + FLOW_DURATIONS[3]);
  assert.equal(ui.figure.dataset.flowPhase, '4'); assert(ui.steps.every(step => step.classes.has('is-done')));
  ui.advance(FLOW_DURATIONS[4]); assert.equal(ui.figure.dataset.flowPhase, '0');
  ui.player.setVisible(false); ui.advance(60000); assert.equal(ui.timers.size, 0);
  ui.player.setVisible(true); assert.equal(ui.figure.dataset.flowPhase, '0');
  ui.player.destroy(); assert.equal(ui.timers.size, 0);
});

test('inspection and a hidden document preserve the remaining stage time; reduced motion stays complete', () => {
  const ui = clockHarness(); ui.player.setVisible(true); ui.advance(600);
  ui.player.setInspecting(true); ui.advance(30000); assert.equal(ui.figure.dataset.flowPhase, '0');
  ui.player.setHidden(true); ui.player.setInspecting(false); ui.advance(30000); assert.equal(ui.timers.size, 0);
  ui.player.setHidden(false); ui.advance(999); assert.equal(ui.figure.dataset.flowPhase, '0');
  ui.advance(1); assert.equal(ui.figure.dataset.flowPhase, '1');
  ui.player.setReduced(true); assert.equal(ui.figure.dataset.flowPhase, '4'); assert.equal(ui.timers.size, 0);
  ui.player.setVisible(false); ui.player.setVisible(true); ui.advance(30000);
  assert.equal(ui.figure.dataset.flowPhase, '4'); assert.equal(ui.timers.size, 0);
  ui.player.setReduced(false); assert.equal(ui.figure.dataset.flowPhase, '0'); assert.equal(ui.timers.size, 1);
  ui.player.destroy(); ui.player.setVisible(true); assert.equal(ui.timers.size, 0);
});

test('the method notebook visits all five steps, then completes and repeats', () => {
  const ui = clockHarness(5); ui.player.setVisible(true); ui.advance(1600);
  for (let phase = 1; phase <= 5; phase++) {
    assert.equal(ui.figure.dataset.flowPhase, String(phase));
    assert(ui.steps[phase - 1].classes.has('is-active'));
    assert.equal(ui.figure.dataset.flowComplete, 'false');
    ui.advance(2400);
  }
  assert.equal(ui.figure.dataset.flowComplete, 'true');
  assert(ui.steps.every(step => step.classes.has('is-done')));
  ui.advance(2800); assert.equal(ui.figure.dataset.flowPhase, '0');
  ui.player.setReduced(true); assert.equal(ui.figure.dataset.flowComplete, 'true');
  assert.equal(ui.timers.size, 0); ui.player.destroy();
});

const walk = node => [node, ...(node.childNodes || []).flatMap(walk)];
const attrs = node => Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
test('every editorial header exposes all four canonical service pages in its native dropdown, in both languages', () => {
  for (const locale of ['fr', 'en']) {
    for (const item of expertiseLinks(locale)) assert.equal(item.path, pageFor(item.id, locale).path);
  }
  for (const page of listPages().filter(page => page.type !== 'home')) {
    const tree = walk(parse(renderHtml(page, 'https://bump.example')));
    const menu = tree.find(node => node.tagName === 'details' && attrs(node).class === 'seo-expertise-menu');
    assert(menu, page.path);
    const anchors = walk(menu).filter(node => node.tagName === 'a').map(attrs);
    assert.deepEqual(anchors.map(anchor => anchor.href), [...expertiseLinks(page.locale).map(item => item.path), pageFor('expertise', page.locale).path]);
    const current = anchors.filter(anchor => anchor['aria-current'] === 'page');
    assert.equal(current.length, page.type === 'service' ? 1 : 0);
    assert(tree.some(node => node.tagName === 'figure' && 'data-seo-flow' in attrs(node)));
    assert(tree.some(node => node.tagName === 'script' && attrs(node).src === '/bump/seo/pages.js' && attrs(node).type === 'module'));
  }
});
