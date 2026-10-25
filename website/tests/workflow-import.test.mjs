import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const result=await build({entryPoints:['src/components/bump-anatomy/workflow/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createWorkflow,CARDS}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('every supplied source file remains identical to the user archive',()=>{
 const manifest=JSON.parse(readFileSync('src/components/bump-anatomy-source.json','utf8'));
 assert.equal(Object.keys(manifest.sha256).length,11);
 for(const [file,hash]of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(readFileSync('src/components/bump-anatomy/'+file)).digest('hex'),hash,file);
});
test('the approval gate blocks both next and direct result jumps',()=>{
 const flow=createWorkflow();
 assert.equal(flow.steps.select('resultat'),false);
 assert.equal(flow.steps.select('validation'),true);
 assert.equal(flow.steps.next(),false);
 assert.equal(flow.steps.select('resultat'),false);
 assert.equal(flow.accept(),true);
 assert.equal(flow.steps.get().id,'transmission');
 assert.equal(flow.steps.select('resultat'),true);
});
test('refusal returns to preparation and the completed result records its revision',()=>{
 const flow=createWorkflow();flow.steps.select('validation');
 assert.equal(flow.refuse(),true);assert.equal(flow.steps.get().id,'preparation');
 assert.equal(flow.steps.select('resultat'),false);
 flow.steps.select('validation');flow.accept();flow.steps.next();
 assert.match(flow.readout(),/transmise après validation \(1 révision\)/);
});
test('all three fictional scenarios reset their gate and card copy',()=>{
 const flow=createWorkflow();flow.steps.select('validation');flow.accept();
 for(const [kind,client]of [['facture','Imprimerie Nord'],['support','Clinique Saint-Denis'],['devis','Boulangerie Lavoie']]){
  flow.insert(kind);assert.equal(flow.steps.get().id,'reception');assert.equal(flow.state.decision,'pending');assert.equal(flow.state.revisions,0);assert.equal(CARDS[kind].client[0],client);
 }
});
