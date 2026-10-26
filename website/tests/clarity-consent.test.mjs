import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script = readFileSync(new URL('../public/runtime/clarity-consent.js', import.meta.url), 'utf8');

function start({hostname = 'bumpconsultation.ca', lang = 'fr', stored = null} = {}) {
  const values = new Map(stored == null ? [] : [['bump.clarity.analytics-consent.v1', stored]]);
  const injected = [];
  let reloads = 0;

  function node(tag) {
    return {
      tagName: tag.toUpperCase(), className: '', textContent: '', hidden: false,
      children: [], listeners: {}, attributes: {}, parentNode: null,
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, handler) { this.listeners[name] = handler; },
      append(...children) {
        for (const child of children) {
          child.parentNode = this;
          this.children.push(child);
        }
      },
    };
  }

  const body = node('body');
  const head = node('head');
  head.insertBefore = function (element, before) {
    assert.equal(before, firstScript);
    element.parentNode = this;
    injected.push(element);
  };
  const firstScript = node('script');
  head.append(firstScript);
  const document = {
    body, head, documentElement: {lang},
    createElement: node,
    getElementsByTagName(name) { return name === 'script' ? [firstScript] : []; },
  };
  const window = {
    location: {hostname, reload() { reloads++; }},
    localStorage: {
      getItem(key) { return values.get(key) ?? null; },
      setItem(key, value) { values.set(key, value); },
    },
  };
  runInNewContext(script, {window, document});

  return {
    window, body, injected, values,
    get reloads() { return reloads; },
    get notice() { return body.children[0]; },
    get settings() { return body.children[1]; },
    get refuse() { return body.children[0].children[3].children[0]; },
    get allow() { return body.children[0].children[3].children[1]; },
  };
}

test('Clarity is opt-in and refusing sends no tracker requests', () => {
  const site = start();
  assert.equal(site.notice.attributes.role, 'dialog');
  assert.equal(site.notice.hidden, false);
  assert.equal(site.settings.hidden, true);
  assert.equal(site.injected.length, 0);
  assert.equal(site.window.clarity, undefined);
  site.refuse.listeners.click();
  assert.equal(site.values.get('bump.clarity.analytics-consent.v1'), 'denied');
  assert.equal(site.injected.length, 0);
  assert.equal(site.settings.hidden, false);
  const revisit = start({stored: 'denied'});
  assert.equal(revisit.notice.hidden, true);
  assert.equal(revisit.injected.length, 0);
  revisit.settings.listeners.click();
  assert.equal(revisit.notice.hidden, false);
});

test('explicit opt-in loads only the provided Clarity project with analytics consent', () => {
  const site = start();
  site.allow.listeners.click();
  assert.equal(site.values.get('bump.clarity.analytics-consent.v1'), 'granted');
  assert.equal(site.injected.length, 1);
  assert.equal(site.injected[0].src, 'https://www.clarity.ms/tag/z3i6jyq003');
  assert.equal(site.injected[0].async, true);
  assert.equal(site.window.clarity.q[0][0], 'consentv2');
  assert.deepEqual(JSON.parse(JSON.stringify(site.window.clarity.q[0][1])), {
    ad_Storage: 'denied', analytics_Storage: 'granted',
  });
  site.settings.listeners.click();
  site.allow.listeners.click();
  assert.equal(site.injected.length, 1, 're-accepting must not install a duplicate tracker');
});

test('revoking analytics changes consent and reloads to stop the existing tracker', () => {
  const site = start({stored: 'granted', lang: 'en'});
  assert.equal(site.injected.length, 1);
  assert.equal(site.notice.hidden, true);
  assert.equal(site.notice.children[0].textContent, 'Help us improve Bump');
  site.settings.listeners.click();
  site.refuse.listeners.click();
  assert.equal(site.values.get('bump.clarity.analytics-consent.v1'), 'denied');
  assert.equal(site.reloads, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(site.window.clarity.q.at(-1))), [
    'consentv2', {ad_Storage: 'denied', analytics_Storage: 'denied'},
  ]);
});

test('Clarity is not installed on preview, local, or unrelated domains', () => {
  for (const hostname of ['bump-consultation.shippingdrop76.workers.dev', 'localhost', 'external.example']) {
    const site = start({hostname, stored: 'granted'});
    assert.equal(site.injected.length, 0);
    assert.equal(site.body.children.length, 0);
  }
});

test('the shared French/English HTML shell loads the consent UI and allows Clarity connections', () => {
  const html = readFileSync(new URL('../src/reference-shell.html', import.meta.url), 'utf8');
  assert.match(html, /src="\/runtime\/clarity-consent\.js"/);
  assert.match(html, /href="\/runtime\/clarity-consent\.css"/);
  assert.match(html, /connect-src[^"]*https:\/\/\*\.clarity\.ms[^"]*https:\/\/c\.bing\.com/);
  assert.equal((html.match(/\/runtime\/clarity-consent\.js/g) ?? []).length, 1);
});
