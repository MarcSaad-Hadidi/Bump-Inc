import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/components/bump-anatomy/security-engine/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createSecurityEngine,statusesAt,planAt,DOMAINS}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('the twelve delivered security files, including geometry and live renderer, remain intact',()=>{
 const m=JSON.parse(readFileSync('src/components/bump-security-source.json','utf8'));assert.equal(Object.keys(m.sha256).length,12);
 for(const[f,h]of Object.entries(m.sha256))assert.equal(createHash('sha256').update(readFileSync('src/components/bump-anatomy/'+f)).digest('hex'),h,f);
});
test('six domains move from partial findings through a correlated risk to verified protection',()=>{
 assert.equal(DOMAINS.length,6);assert.equal(statusesAt(3).filter(x=>x==='conforme').length,5);assert.equal(statusesAt(4)[0],'correle');assert.equal(statusesAt(4)[3],'correle');assert.equal(statusesAt(5)[3],'risque');assert.equal(statusesAt(7)[3],'corrige');assert.deepEqual(planAt(6),[1,1,1,1]);assert.deepEqual(planAt(7),[2,2,2,2]);
});
test('all nine stages are inspectable and a new run resets the real state',()=>{
 const e=createSecurityEngine();for(let i=0;i<9;i++){e.steps.select(i);e.steps.tick(1,true);assert.ok(e.readout());assert.match(e.inspect(3),/Données & accès/);}assert.match(e.readout(),/Périmètre maîtrisé/);e.steps.reset();assert.equal(e.steps.get().index,0);assert.equal(e.steps.get().position,0);
});
