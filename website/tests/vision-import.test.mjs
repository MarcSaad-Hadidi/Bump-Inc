import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/components/bump-anatomy/vision/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createVision,STATES,NEEDS,PISTES,STATUS,fedBy}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('all eleven supplied Vision files remain identical, including live optics and artwork',()=>{
 const m=JSON.parse(readFileSync('src/components/bump-vision-source.json','utf8'));assert.equal(Object.keys(m.sha256).length,11);
 for(const[f,h]of Object.entries(m.sha256))assert.equal(createHash('sha256').update(readFileSync('src/components/bump-anatomy/'+f)).digest('hex'),h,f);
});
test('all real needs feed research directions with no available product or launch date',()=>{
 assert.equal(NEEDS.length,5);assert.equal(PISTES.length,3);assert.match(STATUS,/pas disponible/);assert.match(STATUS,/sans date/);
 NEEDS.forEach((_,i)=>assert.ok(fedBy(i).length));assert.deepEqual(PISTES.map(p=>p.needs.length),[2,2,1]);
});
test('the optical bench exposes four native phases, three research focuses, and resets',()=>{
 const v=createVision();for(const s of STATES){v.steps.select(s);v.steps.tick(1,true);assert.ok(v.readout());}
 for(let i=0;i<3;i++){assert.match(v.readout(i),new RegExp(PISTES[i].label));assert.match(v.readout(i),/en recherche/);assert.match(v.inspect(i),/en recherche/);}
 v.steps.reset();assert.equal(v.readout(),'5 besoins réels · lumière dispersée');
});
