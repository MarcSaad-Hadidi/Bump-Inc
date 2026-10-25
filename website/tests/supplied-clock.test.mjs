import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {BUMP_PLAYBACK_RATE,motionSeconds} from '../src/bump/ui/playback.js';

// Replace only the original RAF driver. Test the real host clock adapters,
// settled-arrival observer and elapsed-time accumulation together.
const compiled=await build({entryPoints:['src/bump/machines/suppliedRuntime.ts','src/bump/machines/methodRuntime.ts','src/bump/machines/visionRuntime.ts','src/bump/machines/workflowRuntime.ts','src/bump/machines/securityRuntime.ts'],bundle:true,platform:'node',format:'esm',write:false,outdir:'/tmp/bump-clock-tests',plugins:[{name:'virtual-native-raf',setup(b){
 b.onResolve({filter:/components\/bump-anatomy\/shared\/runtime$/},()=>({path:'driver',namespace:'test-driver'}));
 b.onLoad({filter:/.*/,namespace:'test-driver'},()=>({contents:'export function createLoop(stage,tick){globalThis.__bumpClockTicks.push(tick);return {kick(){},calm(){return false},destroy(){}}}'}));
}}]});
const modules=await Promise.all(compiled.outputFiles.map(async file=>[file.path,await import('data:text/javascript;base64,'+Buffer.from(file.text).toString('base64'))]));

test('all supplied clocks use the calmer actual motion while preserving arrival and reading time',()=>{
 const originals=new Map(),set=(k,v)=>{originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});};
 const document=new EventTarget(),window=new EventTarget(),state={bumpOpening:'scene',bumpAssistedScroll:'true',bumpScrollMoving:'true'},cleanups=[];
 document.documentElement={dataset:state};document.hidden=false;
 try{
  set('document',document);set('window',window);set('innerHeight',900);set('__bumpClockTicks',[]);
  set('IntersectionObserver',class{observe(){}disconnect(){}});set('MutationObserver',class{observe(){}disconnect(){}});
  const observed=[];
  for(const [path,module]of modules){
   const stage=Object.assign(new EventTarget(),{dataset:{},closest(){return this;},getBoundingClientRect:()=>({top:110,bottom:810,width:800,height:700})}),values=[];
   const loop=module.createLoop(stage,(dt,clock)=>{values.push([dt,clock]);return true;});cleanups.push(()=>loop.destroy());
   const tick=globalThis.__bumpClockTicks.at(-1);assert.equal(tick(10,1000,false),false);assert.equal(values.length,0);
   const stageRate=path.endsWith('methodRuntime.js')||path.endsWith('visionRuntime.js')?1:path.endsWith('workflowRuntime.js')?1.4:path.endsWith('securityRuntime.js')?1.3:BUMP_PLAYBACK_RATE,motionRate=path.endsWith('workflowRuntime.js')?1.4:path.endsWith('securityRuntime.js')?1.3:BUMP_PLAYBACK_RATE;
   observed.push({stage,tick,values,stageRate,motionRate});
  }
  state.bumpScrollMoving='false';window.dispatchEvent(new Event('bump:scroll-settled'));
  for(const{tick,values,stageRate,motionRate}of observed){tick(1/60,999,false);assert.ok(Math.abs(values[0][0]-motionRate/60)<1e-12,'Every supplied model follows its requested motion rate');assert.ok(Math.abs(values[0][1]-stageRate/60)<1e-12);}
  for(const {stage,tick,values}of observed){stage.dataset.bumpDemoPaused='true';stage.dispatchEvent(new Event('bump:demo-pause'));tick(10,2000,false);assert.equal(values.length,1,'Manual pause freezes the native clock in place');stage.dataset.bumpDemoPaused='false';stage.dispatchEvent(new Event('bump:demo-pause'));}
  for(const {stage,tick,values}of observed){stage.dataset.bumpDemoInspecting='true';stage.dispatchEvent(new Event('bump:demo-inspection'));tick(10,3000,false);assert.equal(values.length,1,'Cursor inspection freezes every native model without advancing its clock');stage.dataset.bumpDemoInspecting='false';stage.dispatchEvent(new Event('bump:demo-inspection'));}
  state.bumpScrollMoving='true';window.dispatchEvent(new Event('bump:scroll-settled'));
  for(const{tick,values}of observed){tick(20,5000,false);assert.equal(values.length,1);}
  state.bumpScrollMoving='false';window.dispatchEvent(new Event('bump:scroll-settled'));
  for(const{tick,values,stageRate}of observed){tick(1/60,6000,false);assert.ok(Math.abs(values[1][1]-stageRate/30)<1e-12,'No hidden-time catch-up after scrolling');}
 }finally{cleanups.forEach(stop=>stop());for(const[k,v]of originals){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
test('software, security, cursors and CSS share the calmer wall clock',()=>{
 assert.ok(motionSeconds(8)>6.9&&motionSeconds(8)<7);assert.ok(6/BUMP_PLAYBACK_RATE>5);
});
