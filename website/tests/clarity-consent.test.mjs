import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  CLARITY_ID, CONSENT_KEY,
  isBumpProductionHost, readAnalyticsChoice, saveAnalyticsChoice,
  loadClarity, revokeClarity,
} from '../src/bump/ui/clarityConsentCore.js';

const source = readFileSync(new URL('../src/bump/ui/BumpClarityConsent.js', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/reference-shell.html', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/bump/ui/BumpNav.js', import.meta.url), 'utf8');

function harness({hostname = 'bumpconsultation.ca', lang = 'fr', stored = null} = {}) {
  const values = new Map(stored == null ? [] : [[CONSENT_KEY, stored]]);
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  let reloads = 0;

  function makeHead() {
    return {
      children: [],
      appendChild(node) {
        this.children.push(node);
        node.isConnected = true;
        node.remove = () => {
          const index = this.children.indexOf(node);
          if (index >= 0) this.children.splice(index, 1);
          node.isConnected = false;
        };
      },
    };
  }
  const document = {
    head: makeHead(), documentElement: {lang},
    createElement(name) { return {tagName: name.toUpperCase(), dataset: {}, isConnected: false}; },
  };
  const window = {
    location: {hostname, reload() { reloads++; }},
    localStorage: storage,
  };
  const React = {
    Fragment: 'React.Fragment',
    useState(initial) {
      const index = stateCursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => {
        state[index] = typeof value === 'function' ? value(state[index]) : value;
      }];
    },
    useEffect(callback, deps) {
      const index = effectCursor++;
      const previous = effectDeps[index];
      if (previous && deps.every((value, i) => Object.is(value, previous[i]))) return;
      pendingEffects.push({index, callback, deps});
    },
  };
  const JSX = {
    jsxs(tag, props) { return {tag, props}; },
  };
  const state = [], effectDeps = [], cleanup = [];
  let stateCursor = 0, effectCursor = 0, pendingEffects = [];

  // Only remove the module imports/exports, retaining the actual production
  // component function, effects and React-owned render tree for lifecycle tests.
  const transformed = source
    .replace(/^import \{r as React, j as JSX\} from '\/runtime\/assets\/components-BdJai906\.js';\s*/, '')
    .replace(/import \{[\s\S]*?\} from '\.\/clarityConsentCore\.js';\s*/, '')
    .replace('export default function BumpClarityConsent()', 'function BumpClarityConsent()')
    + '\nglobalThis.BumpClarityConsent = BumpClarityConsent;';
  assert.doesNotMatch(transformed, /^import /m, 'all source imports removed in test harness');
  const context = {window, document, React, JSX, isBumpProductionHost,
    readAnalyticsChoice, saveAnalyticsChoice, loadClarity, revokeClarity};
  runInNewContext(transformed, context);

  function render() {
    stateCursor = 0; effectCursor = 0; pendingEffects = [];
    const tree = context.BumpClarityConsent();
    for (const {index, callback, deps} of pendingEffects) {
      cleanup[index]?.();
      cleanup[index] = callback();
      effectDeps[index] = deps;
    }
    return tree;
  }

  function lifecycleReset() {
    for (const dispose of cleanup) dispose?.();
    cleanup.length = 0;
    effectDeps.length = 0;
  }

  function controls(tree) {
    const [notice, settings] = tree.props.children;
    const buttons = notice.props.children[3].props.children;
    return {notice, settings, deny: buttons[0], allow: buttons[1]};
  }

  return {
    window, document, values, render, lifecycleReset, controls,
    get reloads() { return reloads; },
    replaceHead() { document.head = makeHead(); },
  };
}

test('Clarity is not loaded for preview and localhost hostnames', () => {
  for (const hostname of ['localhost', 'bump-consultation.shippingdrop76.workers.dev', 'demo.example']) {
    const ui = harness({hostname, stored: 'granted'});
    assert.equal(isBumpProductionHost(hostname), false);
    assert.equal(ui.render(), null);
    assert.equal(ui.document.head.children.length, 0);
    assert.equal(ui.window.clarity, undefined);
  }
});

test('the React component runs only after the document head is replaced', () => {
  const ui = harness();
  ui.replaceHead(); // Mimic createRoot(document).render(...), then BumpNav mounts.
  const tree = ui.render();
  const {notice, settings, allow, deny} = ui.controls(tree);
  assert.equal(notice.props.hidden, false);
  assert.equal(settings.props.hidden, true);
  assert.equal(ui.document.head.children.length, 1);
  assert.equal(ui.document.head.children[0].href, '/runtime/clarity-consent.css');
  assert.equal(ui.window.clarity, undefined);
  deny.props.onClick();
  const refused = ui.controls(ui.render());
  assert.equal(refused.notice.props.hidden, true);
  assert.equal(refused.settings.props.hidden, false);
  assert.equal(ui.values.get(CONSENT_KEY), 'denied');
  assert.equal(ui.document.head.children.length, 1);
  assert.equal(ui.window.clarity, undefined);
  assert.equal(allow.props.children[0], 'Autoriser les statistiques');
});

test('opt-in starts Clarity once; revocation removes third-party tracking via reload', () => {
  const ui = harness({lang:'en'});
  let controls = ui.controls(ui.render());
  assert.equal(controls.notice.props.children[0].props.children[0], 'Help us improve Bump');
  controls.allow.props.onClick();
  controls = ui.controls(ui.render());
  assert.equal(ui.values.get(CONSENT_KEY), 'granted');
  assert.equal(controls.notice.props.hidden, true);
  assert.equal(controls.settings.props.hidden, false);
  const scripts = ui.document.head.children.filter(n => n.tagName === 'SCRIPT');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://www.clarity.ms/tag/' + CLARITY_ID);
  assert.equal(scripts[0].async, true);
  assert.equal(ui.window.clarity.q[0][0], 'consentv2');
  assert.deepEqual(JSON.parse(JSON.stringify(ui.window.clarity.q[0][1])), {
    ad_Storage:'denied', analytics_Storage:'granted',
  });

  controls.settings.props.onClick();
  controls = ui.controls(ui.render());
  assert.equal(controls.notice.props.hidden, false);
  controls.allow.props.onClick();
  ui.render();
  assert.equal(ui.document.head.children.filter(n => n.tagName === 'SCRIPT').length, 1);

  controls = ui.controls(ui.render());
  controls.settings.props.onClick();
  controls = ui.controls(ui.render());
  controls.deny.props.onClick();
  assert.equal(ui.values.get(CONSENT_KEY), 'denied');
  assert.equal(ui.reloads, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(Array.from(ui.window.clarity.q.at(-1)))), [
    'consentv2', {ad_Storage:'denied', analytics_Storage:'denied'},
  ]);
});

test('returning users can revoke after React StrictMode effect remount', () => {
  const ui = harness({stored:'granted'});
  const first = ui.controls(ui.render());
  assert.equal(first.settings.props.hidden, false);
  assert.equal(ui.document.head.children.filter(n => n.tagName === 'SCRIPT').length, 1);
  ui.lifecycleReset();
  ui.render();
  assert.equal(ui.document.head.children.filter(n => n.tagName === 'LINK').length, 1);
  assert.equal(ui.document.head.children.filter(n => n.tagName === 'SCRIPT').length, 1);
  const {settings} = ui.controls(ui.render());
  settings.props.onClick();
  ui.controls(ui.render()).deny.props.onClick();
  assert.equal(ui.reloads, 1);
});

test('analytics storage unavailability never implies permission', () => {
  assert.equal(readAnalyticsChoice({getItem() { throw new Error('denied'); }}), null);
  assert.equal(readAnalyticsChoice({getItem() { return 'invalid'; }}), null);
  assert.equal(readAnalyticsChoice({getItem() { return 'granted'; }}), 'granted');
  assert.doesNotThrow(() => saveAnalyticsChoice({setItem() { throw new Error('denied'); }}, 'denied'));
});

test('consent source and stylesheet are owned by the navigation React lifecycle', () => {
  assert.match(nav, /import BumpClarityConsent from '\.\/BumpClarityConsent\.js'/);
  assert.match(nav, /h\(BumpClarityConsent,\{\}\)/);
  assert.match(source, /React\.useEffect/);
  assert.match(source, /document\.head\.appendChild\(link\)/);
  assert.doesNotMatch(shell, /\/runtime\/clarity-consent\.js/);
  assert.doesNotMatch(shell, /\/runtime\/clarity-consent\.css/);
  assert.match(shell, /connect-src[^"]*https:\/\/\*\.clarity\.ms[^"]*https:\/\/c\.bing\.com/);
  const css = readFileSync(new URL('../src/bump/ui/clarity-consent.css', import.meta.url), 'utf8');
  assert.match(css, /\.bump-clarity-notice/);
  const build = readFileSync(new URL('../scripts/build-bump-ui.mjs', import.meta.url), 'utf8');
  assert.match(build, /copyFileSync\('src\/bump\/ui\/clarity-consent\.css'/);
});
