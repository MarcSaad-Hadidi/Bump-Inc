import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  CLARITY_ID, CONSENT_KEY, DENIAL_KEY, ANALYTICS_PREFERENCES_EVENT,
  isBumpProductionHost, readAnalyticsChoice, saveAnalyticsChoice,
  loadClarity, revokeClarity,
} from '../src/bump/ui/clarityConsentCore.js';

const source = readFileSync(new URL('../src/bump/ui/BumpClarityConsent.js', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/reference-shell.html', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/bump/ui/BumpNav.js', import.meta.url), 'utf8');

function harness({hostname = 'bumpconsultation.ca', lang = 'fr', stored = null} = {}) {
  const values = new Map(stored == null ? [] : [[CONSENT_KEY, stored]]);
  const sessionValues = new Map();
  let rejectLocalWrites = false, rejectSessionWrites = false;
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      if (rejectLocalWrites) throw new Error('localStorage read-only');
      values.set(key, value);
    },
  };
  const sessionStorage = {
    getItem(key) { return sessionValues.get(key) ?? null; },
    setItem(key, value) {
      if (rejectSessionWrites) throw new Error('sessionStorage blocked');
      sessionValues.set(key, value);
    },
    removeItem(key) {
      if (rejectSessionWrites) throw new Error('sessionStorage blocked');
      sessionValues.delete(key);
    },
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
  const listeners = new Map();
  const window = {
    location: {hostname, reload() { reloads++; }},
    localStorage: storage,
    sessionStorage,
    addEventListener(name, listener) {
      const handlers = listeners.get(name) || new Set();
      handlers.add(listener);
      listeners.set(name, handlers);
    },
    removeEventListener(name, listener) { listeners.get(name)?.delete(listener); },
    dispatchEvent(event) {
      for (const callback of [...(listeners.get(event.type) || [])]) callback(event);
    },
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
    readAnalyticsChoice, saveAnalyticsChoice, loadClarity, revokeClarity,
    ANALYTICS_PREFERENCES_EVENT};
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
    const [notice] = tree.props.children;
    assert.equal(tree.props.children.length, 1, 'no floating settings button');
    const buttons = notice.props.children[3].props.children;
    return {notice, deny: buttons[0], allow: buttons[1]};
  }

  return {
    window, document, values, sessionValues, render, lifecycleReset, controls,
    openPreferences() { window.dispatchEvent({type: ANALYTICS_PREFERENCES_EVENT}); },
    blockLocalWrites() { rejectLocalWrites = true; },
    blockSessionWrites() { rejectSessionWrites = true; },
    restoreWrites() { rejectLocalWrites = false; rejectSessionWrites = false; },
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
  const {notice, allow, deny} = ui.controls(tree);
  assert.equal(notice.props.hidden, false);
  assert.equal(ui.document.head.children.length, 1);
  assert.equal(ui.document.head.children[0].href, '/runtime/clarity-consent.css');
  assert.equal(ui.window.clarity, undefined);
  deny.props.onClick();
  const refused = ui.controls(ui.render());
  assert.equal(refused.notice.props.hidden, true);
  assert.equal(refused.notice.props.hidden, true, 'dismiss the entire panel on refusal');
  ui.openPreferences();
  assert.equal(ui.controls(ui.render()).notice.props.hidden, false, 'menu can reopen the panel');
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
  assert.equal(controls.notice.props.hidden, true, 'no persistent overlay after acceptance');
  const scripts = ui.document.head.children.filter(n => n.tagName === 'SCRIPT');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://www.clarity.ms/tag/' + CLARITY_ID);
  assert.equal(scripts[0].async, true);
  assert.equal(ui.window.clarity.q[0][0], 'consentv2');
  assert.deepEqual(JSON.parse(JSON.stringify(ui.window.clarity.q[0][1])), {
    ad_Storage:'denied', analytics_Storage:'granted',
  });

  ui.openPreferences();
  controls = ui.controls(ui.render());
  assert.equal(controls.notice.props.hidden, false);
  controls.allow.props.onClick();
  ui.render();
  assert.equal(ui.document.head.children.filter(n => n.tagName === 'SCRIPT').length, 1);

  controls = ui.controls(ui.render());
  ui.openPreferences();
  controls = ui.controls(ui.render());
  controls.deny.props.onClick();
  assert.equal(ui.values.get(CONSENT_KEY), 'denied');
  assert.equal(ui.reloads, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(Array.from(ui.window.clarity.q.at(-2)))), [
    'consentv2', {ad_Storage:'denied', analytics_Storage:'denied'},
  ]);
  assert.equal(ui.window.clarity.q.at(-1)[0], 'stop');
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
  ui.openPreferences();
  ui.controls(ui.render()).deny.props.onClick();
  assert.equal(ui.reloads, 1);
});

test('analytics storage unavailability never implies permission', () => {
  assert.equal(readAnalyticsChoice({getItem() { throw new Error('denied'); }}), null);
  assert.equal(readAnalyticsChoice({getItem() { return 'invalid'; }}), null);
  assert.equal(readAnalyticsChoice({getItem() { return 'granted'; }}), null);
  assert.equal(readAnalyticsChoice({getItem() { return 'granted'; }, setItem() {}}), 'granted');
  assert.equal(saveAnalyticsChoice({setItem() { throw new Error('denied'); }}, 'denied'), false);
});

test('consent source and stylesheet are owned by the navigation React lifecycle', () => {
  assert.match(nav, /import BumpClarityConsent from '\.\/BumpClarityConsent\.js'/);
  assert.match(nav, /h\(BumpClarityConsent,\{\}\)/);
  assert.match(nav, /bump-analytics-menu-button/);
  assert.match(nav, /ANALYTICS_PREFERENCES_EVENT/);
  assert.doesNotMatch(source, /className: 'bump-clarity-settings'/);
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

test('revocation survives read-only persistent storage via a session denial marker', () => {
  const ui = harness({stored:'granted'});
  ui.render(); // Returning consent is loaded before browser storage becomes read-only.
  assert.equal(ui.document.head.children.filter(n => n.tagName === 'SCRIPT').length, 1);
  ui.blockLocalWrites();
  ui.openPreferences();
  ui.controls(ui.render()).deny.props.onClick();
  assert.equal(ui.values.get(CONSENT_KEY), 'granted', 'old grant cannot be overwritten');
  assert.equal(ui.sessionValues.get(DENIAL_KEY), 'denied');
  assert.equal(readAnalyticsChoice(ui.window.localStorage, ui.window.sessionStorage), 'denied');
  assert.equal(ui.reloads, 1, 'reload is safe because session denial was stored');
  assert.equal(ui.window.clarity.q.at(-1)[0], 'stop');
});

test('failed writes never reload into a stale grant and stop collection immediately', () => {
  const ui = harness({stored:'granted'});
  ui.render();
  ui.blockLocalWrites();
  ui.blockSessionWrites();
  ui.openPreferences();
  ui.controls(ui.render()).deny.props.onClick();
  assert.equal(ui.reloads, 0, 'no reload without a durable refusal marker');
  assert.equal(ui.values.get(CONSENT_KEY), 'granted');
  assert.equal(ui.window.clarity.q.at(-1)[0], 'stop');
  assert.equal(ui.controls(ui.render()).notice.props.hidden, true);
  assert.equal(readAnalyticsChoice(ui.window.localStorage, ui.window.sessionStorage), null, 'read-only grants are not trusted after refresh');
});

test('explicit renewed opt-in safely restarts a stopped tracker after persistence recovers', () => {
  const ui = harness({stored: 'granted'});
  ui.render();
  ui.blockLocalWrites();
  ui.blockSessionWrites();
  ui.openPreferences();
  ui.controls(ui.render()).deny.props.onClick();
  assert.equal(ui.reloads, 0);
  assert.equal(ui.window.__bumpClarityStopped, true);
  assert.equal(loadClarity(ui.window, ui.document), false, 'stopped script is not reloaded in place');

  // The next consent can be persisted, so a clean page load may restart it.
  ui.restoreWrites();
  ui.openPreferences();
  ui.controls(ui.render()).allow.props.onClick();
  assert.equal(ui.values.get(CONSENT_KEY), 'granted');
  assert.equal(ui.reloads, 1, 'a fresh document starts Clarity after the new grant');
  assert.equal(ui.document.head.children.filter(node => node.tagName === 'SCRIPT').length, 1);
  const revisited = harness({stored: ui.values.get(CONSENT_KEY)});
  revisited.render();
  assert.equal(revisited.document.head.children.filter(node => node.tagName === 'SCRIPT').length, 1);
});

test('reaccepting without working storage fails closed and clearly explains the problem', () => {
  const ui = harness({stored: 'granted'});
  ui.render();
  ui.blockLocalWrites();
  ui.blockSessionWrites();
  ui.openPreferences();
  ui.controls(ui.render()).deny.props.onClick();
  assert.equal(ui.reloads, 0);
  ui.openPreferences();
  ui.controls(ui.render()).allow.props.onClick();
  const {notice} = ui.controls(ui.render());
  assert.equal(notice.props.hidden, false);
  assert.equal(notice.props.hidden, false);
  assert.equal(notice.props.children.at(-1).props.hidden, false);
  assert.equal(notice.props.children.at(-1).props.role, 'alert');
  assert.equal(ui.reloads, 0);
  assert.equal(ui.document.head.children.filter(node => node.tagName === 'SCRIPT').length, 1);
  assert.equal(ui.window.clarity.q.at(-1)[0], 'stop');
});

test('allowing analytics removes every floating consent control while preserving menu access', () => {
  const ui = harness();
  const initial = ui.controls(ui.render());
  assert.equal(initial.notice.props.hidden, false);
  initial.allow.props.onClick();
  const afterConsent = ui.controls(ui.render());
  assert.equal(afterConsent.notice.props.hidden, true);
  assert.equal(ui.values.get(CONSENT_KEY), 'granted');
  assert.equal(ui.document.head.children.filter(n => n.tagName === 'SCRIPT').length, 1);
  ui.openPreferences();
  const reopened = ui.controls(ui.render());
  assert.equal(reopened.notice.props.hidden, false);
  reopened.deny.props.onClick();
  assert.equal(ui.values.get(CONSENT_KEY), 'denied');
});

test('returning visitors do not see the floating settings pill', () => {
  for (const stored of ['granted', 'denied']) {
    const ui = harness({stored});
    assert.equal(ui.controls(ui.render()).notice.props.hidden, true);
    ui.openPreferences();
    assert.equal(ui.controls(ui.render()).notice.props.hidden, false);
  }
});
