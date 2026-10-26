#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {build} from "esbuild";
import {publicOrigin} from "./hosting-config.mjs";
import {contentAssetPaths} from "../src/bump/seo/render.js";
import {runtimeChunks} from "./runtime-chunks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const index = path.join(dist, "client", "index.html");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");

for (const file of [index, worker, hosting]) {
  if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
}

mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
// Sites serves matching client files before invoking a Worker. Embed small
// generated text so no ASSETS binding is required; paintings/media stay static.
const files = Object.fromEntries(contentAssetPaths().map(file => [file, readFileSync(path.join(dist, 'client', file), 'utf8')]));
// Native Sites may route a newly hashed chunk to the Worker even when the
// client archive contains it. Retain an exact-byte fallback for that graph.
Object.assign(files, runtimeChunks(path.join(dist, 'client')));
await build({stdin: {contents: 'import {createWorker} from "./worker/index.js"; export default createWorker(' + JSON.stringify(files) + ');', resolveDir: root, sourcefile: 'bump-content-worker.js'}, outfile: path.join(dist, "server", "index.js"), bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true, define: {__BUMP_PUBLIC_ORIGIN__: JSON.stringify(publicOrigin())}});
copyFileSync(hosting, path.join(dist, ".openai", "hosting.json"));

console.log("Prepared Sites build: dist/server/index.js and dist/.openai/hosting.json");
