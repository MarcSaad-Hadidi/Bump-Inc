import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const result=await build({entryPoints:['src/components/bump-anatomy/vos-outils/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createToolkit,STATES,TOOLS}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('all twelve Vos outils files remain identical to the supplied archive',()=>{
 const manifest=JSON.parse(readFileSync('src/components/bump-vos-outils-source.json','utf8'));
 assert.equal(Object.keys(manifest.sha256).length,12);
 for(const[file,hash]of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(readFileSync('src/components/bump-anatomy/'+file)).digest('hex'),hash,file);
});
test('the shared Workflow palette only receives the upstream pulse addition',()=>{
 const workflow=JSON.parse(readFileSync('src/components/bump-anatomy-source.json','utf8'));
 const theme=readFileSync('src/components/bump-anatomy/shared/bump-theme.css','utf8');
 const original=theme.slice(0,theme.indexOf('\n/* 03 : impulsions'));
 assert.equal(createHash('sha256').update(original).digest('hex'),workflow.upstreamUpdates['shared/bump-theme.css'].previousSha256);
});
test('independent tools retain their own data before synchronization',()=>{
 const kit=createToolkit();assert.equal(STATES.length,6);assert.equal(TOOLS.length,5);
 assert.match(kit.readout(),/Excel bloqué/);assert.deepEqual(kit.versions(3),[14,9,11,7,3]);
 assert.equal(kit.toggleAdapter(3),false);
 kit.steps.select('connecte');assert.equal(kit.connected(3),true);assert.deepEqual(kit.synced(),[]);
});
test('removing Agenda isolates its data while the four other tools stay synchronized',()=>{
 const kit=createToolkit();kit.steps.select('synchronise');assert.deepEqual(kit.versions(3),[18,18,18,18,18]);
 assert.equal(kit.toggleAdapter(3),true);assert.equal(kit.connected(3),false);assert.equal(kit.synced().length,4);
 assert.deepEqual(kit.versions(4),[19,19,19,7,19]);assert.equal(kit.readout(),'Agenda sans adaptateur · 4 outils sur 5 ensemble');
 kit.toggleAdapter(3);assert.deepEqual(kit.versions(5),[20,20,20,20,20]);
});
test('a new loop clears every removed adapter and returns to the initial pose',()=>{
 const kit=createToolkit();kit.steps.select('unifie');kit.steps.tick(1,true);kit.toggleAdapter(3);kit.steps.pause();kit.reset();
 assert.equal(kit.steps.get().id,'isole');assert.equal(kit.steps.get().position,0);assert.equal(kit.steps.get().paused,false);assert.equal(kit.state.removed.size,0);
});
