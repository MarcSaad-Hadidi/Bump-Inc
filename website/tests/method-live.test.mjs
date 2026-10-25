import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {build} from 'esbuild';

// Exercise the original live renderer and geometry calculations. Only its RAF
// driver is replaced by a virtual clock; no model or animation logic is mocked.
const compiled=await build({entryPoints:['src/components/bump-anatomy/methode/live.ts','src/components/bump-anatomy/methode/art.generated.ts','src/bump/machines/methodRuntime.ts'],bundle:true,platform:'node',format:'esm',write:false,outdir:'/tmp/bump-method-tests',plugins:[{name:'virtual-frame',setup(b){
 b.onResolve({filter:/^\.\.\/shared\/runtime$/},()=>({path:'driver',namespace:'test-driver'}));
 b.onLoad({filter:/.*/,namespace:'test-driver'},()=>({resolveDir:process.cwd(),contents:`export * from ${JSON.stringify(resolve('src/components/bump-anatomy/shared/runtime.ts'))};export function createLoop(stage,tick){globalThis.__bumpMethodTick=tick;return {kick(){},calm(){return false},destroy(){}};}`}));
}}]});
const modules=await Promise.all(compiled.outputFiles.map(f=>import('data:text/javascript;base64,'+Buffer.from(f.text).toString('base64'))));
const {mount}=modules.find(m=>m.mount),{DATA}=modules.find(m=>m.DATA),{METHOD_PLAYBACK_RATE:RATE,METHOD_STAGE_RATE:STAGE_RATE}=modules.find(m=>m.METHOD_PLAYBACK_RATE);
class Node extends EventTarget{
 constructor(selector=''){super();this.selector=selector;this.dataset={};this.style={};this.attrs={};this.nodes=new Map();this.textContent='';}
 querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node(selector));return this.nodes.get(selector);}
 querySelectorAll(selector){const count=selector==='[data-step]'?5:selector.includes('step-lamp')||selector==='[data-log]'?5:selector.includes('knob-')?3:selector==='.iso-shade'?4:0;return Array.from({length:count},(_,i)=>{const n=this.querySelector(selector+'-'+i);if(selector==='[data-step]')n.dataset.step=String(i);return n;});}
 closest(){return this.querySelector('item');}
 setAttribute(name,value){this.attrs[name]=value;}getAttribute(name){return this.attrs[name]??null;}
 toggleAttribute(name,on){if(on)this.attrs[name]='';else delete this.attrs[name];}
}
test('the delivered loop shows all five readings, lifts/reseats the glass and returns to Audit with the accelerated motion clock',()=>{
 const root=new Node(),readout=root.querySelector('[data-readout]'),seen=[],stage=root.querySelector('.iso-stage'),svg=stage.querySelector('svg');let clock=0;
 const cleanup=mount(root,DATA),tick=globalThis.__bumpMethodTick,glass=svg.querySelector('[data-part="bell-front"]');let lifted=false,reseated=false;
 try{
  for(let i=0;i<1600;i++){clock+=STAGE_RATE/30;tick(RATE/30,clock,false);seen.push(readout.textContent);if(glass.getAttribute('transform'))lifted=true;else if(lifted)reseated=true;}
  for(const text of ['vibration 3,2 mm/s · seuil 1,0','cause : masse mal placée sur le rotor','essai C · 0,4 mm/s prévu · retenu','contrepoids posé · 0,4 mm/s · vérifié','suivi continu · ajustements au besoin'])assert.ok(seen.includes(text),text);
  assert.ok(lifted&&reseated);const maintenance=seen.indexOf('suivi continu · ajustements au besoin');assert.ok(seen.slice(maintenance).includes('vibration 3,2 mm/s · seuil 1,0'));
  const key=new Event('keydown',{cancelable:true});Object.defineProperty(key,'key',{value:'3'});stage.dispatchEvent(key);
  for(let i=0;i<60;i++){clock+=STAGE_RATE/30;tick(RATE/30,clock,false);}
  assert.ok(root.querySelectorAll('[data-step]')[2].getAttribute('data-current')!==null,'real input holds the selected phase');
  assert.equal(tick(1/60,clock,true),false,'reduced motion requests no further animation frame');
 }finally{cleanup();delete globalThis.__bumpMethodTick;}
});
