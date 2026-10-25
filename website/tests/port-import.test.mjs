import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const built=await build({entryPoints:['src/components/bump-anatomy/port/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createPort,STATES,CARGO,NEEDS}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
test('the eleven supplied Port files keep their recorded source hashes',()=>{
 const manifest=JSON.parse(readFileSync('src/components/bump-port-source.json','utf8'));assert.equal(Object.keys(manifest.sha256).length,11);
 for(const[file,hash]of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(readFileSync('src/components/bump-anatomy/'+file)).digest('hex'),hash,file);
});
test('the port represents both founders, Quebec, three services and the project conversation',()=>{
 const port=createPort(),readings=[];for(const state of STATES){port.steps.select(state);port.steps.tick(1,true);readings.push(port.readout());}
 assert.match(readings[0],/2 fondateurs/);assert.match(readings[1],/Montréal/);assert.match(readings[2],/aujourd'hui : PME du Québec/);assert.match(readings[4],/besoin, enjeux, résultat visé/);
 assert.deepEqual(NEEDS.map(n=>n.service),['Automatisation','Logiciel sur mesure','Cybersécurité']);assert.deepEqual([0,1,2].map(i=>CARGO.filter(c=>c===i).length),[2,2,2]);
});
