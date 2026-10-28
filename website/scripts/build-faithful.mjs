import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import './sync-bump-content.mjs';
import {buildEnglishEdition} from './build-bump-english.mjs';
import {publicOrigin} from './hosting-config.mjs';
import {buildShareAssets} from './build-share-assets.mjs';
buildShareAssets();

import {buildSeo} from './build-seo.mjs';
buildEnglishEdition();
buildSeo();

const root = process.cwd();
// Default to this host. An export must never fetch its renderer/media from the
// original GPT Site. An explicit origin is useful for canonical/social metadata.
const origin = publicOrigin();
const output = path.join(root,'dist/client');
rmSync(output,{recursive:true,force:true});
mkdirSync(output,{recursive:true});
cpSync(path.join(root,'public'),output,{recursive:true});
writeFileSync(path.join(output,'index.html'),readFileSync('src/reference-shell.html','utf8').replaceAll('__RENAISSANCE_ORIGIN__',origin));
function localize(directory) {
  for(const entry of readdirSync(directory,{withFileTypes:true})) {
    const file = path.join(directory,entry.name);
    if(entry.isDirectory()) localize(file);
    else if(/\.(html|js|mjs|css|json|svg|txt)$/.test(entry.name)) {
      const source = readFileSync(file,'utf8');
      if(source.includes('__RENAISSANCE_ORIGIN__')) writeFileSync(file,source.replaceAll('__RENAISSANCE_ORIGIN__',origin));
    }
  }
}
localize(output);
console.log('Built faithful reference runtime with local scenes and assets.');
