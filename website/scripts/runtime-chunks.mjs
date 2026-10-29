import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

// Only embed the current public shared-module graph. Historical immutable
// bundles and large scene/media assets continue to use static hosting.
export function runtimeChunks(clientDirectory) {
  const files = {};
  for (const prefix of ['/runtime/assets/', '/runtime/en/assets/']) {
    const directory = path.join(clientDirectory, prefix);
    const seen = new Set();
    function visit(name) {
      if (seen.has(name)) return;
      seen.add(name);
      const source = readFileSync(path.join(directory, name), 'utf8');
      if (/^bump-shared-[A-Z0-9]+\.js$/.test(name)) files[prefix + name] = source;
      for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["']\.\/(bump-shared-[A-Z0-9]+\.js)["']/g)) visit(match[1]);
    }
    for (const name of readdirSync(directory).filter(name => /^Bump.*\.js$/.test(name))) visit(name);
  }
  const seo = path.join(clientDirectory, 'runtime/seo');
  for (const name of readdirSync(seo).filter(name=>name.endsWith('.js'))) files['/runtime/seo/'+name]=readFileSync(path.join(seo,name),'utf8');
  return files;
}
