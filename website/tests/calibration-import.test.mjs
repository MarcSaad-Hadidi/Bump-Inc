import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/components/bump-anatomy/calibration/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createLab,STATES,STEP_TEXT,SETTINGS,BEST}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('the delivered Method geometry, live loop, model and shared kit remain intact',()=>{
 const m=JSON.parse(readFileSync('src/components/bump-calibration-source.json','utf8'));assert.equal(Object.keys(m.sha256).length,11);
 for(const[f,h]of Object.entries(m.sha256))assert.equal(createHash('sha256').update(readFileSync('src/components/bump-anatomy/'+f)).digest('hex'),h,f);
});
test('the five laboratory stages tell the complete audit to maintenance story',()=>{
 const lab=createLab();
 assert.match(lab.readout(),/vibration 3,2 mm\/s · seuil 1,0/);
 lab.steps.next();assert.match(lab.readout(),/masse mal placée/);
 lab.steps.next();assert.equal(lab.tryTrial('C'),true);assert.match(lab.readout(),/essai C · 0,4 mm\/s prévu · retenu/);
 lab.steps.next();assert.match(lab.readout(),/contrepoids posé · 0,4 mm\/s · vérifié/);
 lab.steps.next();assert.equal(lab.readout(),'suivi continu · ajustements au besoin');
 lab.steps.reset();assert.equal(lab.steps.get().index,0);assert.match(lab.readout(),/vibration 3,2/);
 assert.equal(STATES.length,5);for(const s of STATES)assert.ok(STEP_TEXT[s]);
});
test('physical trial choices remain local to Proposition and compare genuine values',()=>{
 const lab=createLab();assert.equal(lab.tryTrial('A'),false);lab.steps.select('proposition');
 for(const setting of SETTINGS){assert.equal(lab.tryTrial(setting.id),true);assert.equal(lab.vibration(),setting.vibration);}
 assert.equal(BEST,'C');lab.steps.select('maintenance');assert.equal(lab.tryTrial('A'),false);assert.equal(lab.vibration(),.4);
});
