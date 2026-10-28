import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {scriptBlocks} from '../scripts/html-scripts.mjs';
import {createSiteServer} from '../scripts/serve-production.mjs';

const html = readFileSync(new URL('./fixtures/seo-review.html', import.meta.url), 'utf8');
const [{bodyStart, bodyEnd}] = scriptBlocks(html);
const script = html.slice(bodyStart, bodyEnd);
const routes = ['/', '/en', '/expertises', '/services/automatisation-processus',
  '/services/integration-ia', '/services/developpement-logiciel',
  '/services/cybersecurite', '/approche', '/a-propos', '/faq', '/en/services/ai-integration', '/cas-d-usage', '/en/use-cases'];

function harness(selectedIndex = 0, value = '/') {
  const navigations = [], attributes = new Map(), keys = [];
  const select = {selectedIndex, value};
  const frame = {
    set src(value) { navigations.push(value); },
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    contentWindow: {KeyboardEvent: class {constructor(type, options) {Object.assign(this, {type}, options);}}, dispatchEvent() {assert.fail('Window dispatch does not reach the document scroll handler');}},
    contentDocument: {body: {dispatchEvent(event) {assert.equal(event.bubbles, true);keys.push(event.key);}}},
  };
  const toggle = {getAttribute(name) {return attributes.get(name);}, setAttribute(name, value) {attributes.set(name, value);}};
  const elements = {frame, page: select, scripts: toggle, previous: {}, next: {}, report: {}};
  runInNewContext(script, {document: {getElementById(id) {return elements[id];}, querySelectorAll() {return [];}}});
  return {select, frame, navigations, attributes, keys, elements, toggle: () => toggle.onclick({currentTarget: toggle})};
}

test('review fixture never forwards tampered DOM text into iframe navigation', () => {
  for (const value of ['javascript:parent.changed=true', 'data:text/html,<script>alert(1)</script>',
    'https://other.example/', '//other.example/', '/\\other.example/', '\njavascript:alert(1)', '<img src=x onerror=alert(1)>']) {
    const ui = harness(1, value);
    ui.select.onchange(); ui.toggle(); ui.toggle();
    assert.deepEqual(ui.navigations, ['/en', '/en', '/en', '/en'], value);
  }
  for (const index of [-1, routes.length, 1.5, '__proto__']) {
    const ui = harness(index, 'javascript:alert(1)');
    ui.select.onchange(); ui.toggle();
    assert.deepEqual(ui.navigations, ['/', '/', '/']);
  }
});

test('review fixture preserves every authored page, script toggle and assisted key controls', () => {
  assert.deepEqual([...html.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]), routes);
  for (const [index, route] of routes.entries()) {
    const ui = harness(index, route);
    ui.select.onchange(); ui.toggle();
    assert.equal(ui.attributes.get('sandbox'), 'allow-same-origin');
    ui.toggle(); assert.equal(ui.attributes.has('sandbox'), false);
    assert.deepEqual(ui.navigations, [route, route, route, route]);
    ui.elements.previous.onclick(); ui.elements.next.onclick();
    assert.deepEqual(ui.keys, ['PageUp', 'PageDown']);
    ui.frame.onload(); assert.equal(ui.elements.report.textContent, 'Chargé');
  }
});

test('both review tools are available only through the development HTTP server', async t => {
  for (const development of [false, true]) {
    const server = createSiteServer(undefined, {development});
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = 'http://127.0.0.1:' + server.address().port;
    for (const [route, title] of [['/__seo-review', 'contrôle responsive'], ['/__mobile-review', 'vérification mobile']]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, development ? 200 : 404);
      const text = await response.text();
      if (development) {
        assert.match(response.headers.get('Content-Type'), /^text\/html/);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert(text.includes(title));
      } else assert(!text.includes('<iframe'), 'Production must not expose either tool');
      const head = await fetch(origin + route, {method: 'HEAD'});
      assert.equal(head.status, development ? 200 : 404); assert.equal(await head.text(), '');
      assert.equal((await fetch(origin + route, {method: 'POST'})).status, 405);
    }
  }
});
