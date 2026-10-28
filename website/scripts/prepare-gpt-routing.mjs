import {existsSync, rmSync, readdirSync, rmdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {contentAssetPaths} from '../src/bump/seo/render.js';

// Packaging for GPT Sites only. Node/Cloudflare keep the normal client tree.
// Native Sites gives existing static paths priority over its Worker, so content
// paths must be handled by the text already embedded in dist/server/index.js.
export function prepareGptRouting(directory = path.resolve('dist/client'), worker = path.resolve('dist/server/index.js')) {
  if (!existsSync(worker)) throw new Error('Build and verify the content Worker before preparing GPT routing.');
  const root = path.resolve(directory);
  for (const file of contentAssetPaths()) {
    const target = path.resolve(root, '.' + file);
    if (!target.startsWith(root + path.sep)) throw new Error('Content path outside the build.');
    rmSync(target, {force: true});
    let parent = path.dirname(target);
    while (parent !== root && parent.startsWith(root + path.sep) && existsSync(parent) && readdirSync(parent).length === 0) {
      rmdirSync(parent); parent = path.dirname(parent);
    }
  }
  console.log('Prepared GPT Sites routing: ' + contentAssetPaths().length + ' text paths served by the verified Worker; media retained.');
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) prepareGptRouting();
