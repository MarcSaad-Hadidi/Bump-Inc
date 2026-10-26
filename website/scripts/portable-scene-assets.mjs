import {readFileSync, writeFileSync} from 'node:fs';

// The captured renderer originally received absolute CDN URLs. Portable builds
// deliberately use this host, so its texture lookup needs an explicit URL base.
export function preparePortableSceneAssets() {
  const file = 'public/runtime/assets/Background-DpyJh-o1.js';
  const source = readFileSync(file, 'utf8');
  const legacy = 'new URL(n.url).pathname';
  const portable = 'new URL(n.url,window.location.href).pathname';
  if (source.includes(portable) && !source.includes(legacy)) return;
  if (source.split(legacy).length !== 2) {
    throw new Error('The native texture URL lookup changed; inspect before adapting it.');
  }
  writeFileSync(file, source.replace(legacy, portable));
}
