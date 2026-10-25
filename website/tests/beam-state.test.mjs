import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';

test('batched restoration and visitor activation preserve both actual React tile updates', async () => {
  const built = await build({entryPoints: ['src/bump/vision/IntegrationBeam.tsx'], bundle: true, platform: 'node',
    format: 'cjs', write: false, external: ['react'], jsx: 'transform', jsxFactory: 'h', jsxFragment: 'Fragment'});
  const state = [], updates = []; let cursor = 0;
  // Apply queued state setters at the end of the activation batch, as React
  // does, while exercising the unmodified component's real onClick callbacks.
  const hooks = {
    useState(initial) {const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], update => updates.push([index, update])];},
    useRef: current => ({current}), useCallback: fn => fn, useId: () => 'beam-test', useEffect() {}, useLayoutEffect() {},
  };
  const module = {exports: {}};
  runInNewContext(built.outputFiles[0].text, {module, exports: module.exports,
    require(name) {assert.equal(name, 'react'); return hooks;},
    h: (type, props, ...children) => ({type, props, children: children.flat()}), Fragment: Symbol('Fragment'),
    window: {clearTimeout() {}, setTimeout: () => 1},
  });
  function render() {
    cursor = 0; const tree = module.exports.IntegrationBeam({left: [{name: 'CRM'}, {name: 'ERP'}]});
    const tiles = [], visit = node => {if (!node || typeof node !== 'object') return;
      if (node.props?.className === 'ui-ib__tool') tiles.push(node); for (const child of node.children || []) visit(child);};
    visit(tree); return tiles;
  }
  function flush() {for (const [index, update] of updates.splice(0)) state[index] = typeof update === 'function' ? update(state[index]) : update;}
  let tiles = render(); assert.deepEqual(tiles.map(tile => tile.props['aria-pressed']), [true, true]);
  tiles[0].props.onClick(); tiles[1].props.onClick(); flush();
  tiles = render(); assert.deepEqual(tiles.map(tile => tile.props['aria-pressed']), [false, false]);
  // A cleanup click restores CRM while the visitor's pending click resumes ERP.
  tiles[0].props.onClick(); tiles[1].props.onClick(); flush();
  assert.deepEqual(render().map(tile => tile.props['aria-pressed']), [true, true]);
});
