import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/components/bump-anatomy/vision/live.ts','src/components/bump-anatomy/vision/art.generated.ts','src/bump/machines/visionRuntime.ts'],bundle:true,platform:'node',format:'esm',write:false,outdir:'/tmp/bump-vision-tests',plugins:[{name:'virtual-frame',setup(b){
 b.onResolve({filter:/^\.\.\/shared\/runtime$/},()=>({path:'driver',namespace:'test-driver'}));
 b.onLoad({filter:/.*/,namespace:'test-driver'},()=>({resolveDir:process.cwd(),contents:`export * from ${JSON.stringify(resolve('src/components/bump-anatomy/shared/runtime.ts'))};export function createLoop(stage,tick){globalThis.__bumpVisionTick=tick;return {kick(){},calm(){return false},destroy(){}};}`}));
}}]});
const modules=await Promise.all(compiled.outputFiles.map(f=>import('data:text/javascript;base64,'+Buffer.from(f.text).toString('base64'))));
const {mount}=modules.find(m=>m.mount),{DATA}=modules.find(m=>m.DATA),{VISION_STAGE_RATE:RATE}=modules.find(m=>m.VISION_STAGE_RATE);
class Node extends EventTarget{
 constructor(){super();this.dataset={};this.style={};this.attrs={};this.nodes=new Map();this.textContent='';}
 querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector);}
 querySelectorAll(selector){const n=selector==='[data-step]'||selector==='[data-step-lamp]'?4:selector==='[data-need]'?5:selector==='.ray'?DATA.rays:selector==='[data-piste]'||selector==='[data-plaque]'||selector==='[data-glow]'||selector==='[data-proto]'?3:selector.startsWith('[data-beam=')||selector.startsWith('[data-branch=')?2:0;return Array.from({length:n},(_,i)=>{const e=this.querySelector(selector+'-'+i);if(selector==='[data-step]')e.dataset.step=String(i);return e;});}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}toggleAttribute(k,on){if(on)this.attrs[k]='';else delete this.attrs[k];}
}
test('native optics loop through four phases, highlight the correct needs and restart',()=>{
 const root=new Node(),readout=root.querySelector('[data-readout]'),svg=root.querySelector('.iso-stage').querySelector('svg'),seen=[];const cleanup=mount(root,DATA),tick=globalThis.__bumpVisionTick;let clock=0;
 try{
  for(let frame=0;frame<1100;frame++){
   clock+=RATE/30;tick(1.5/30,clock,false);seen.push(readout.textContent);
   for(const[label,count]of [['Workflow AI',2],['Developer AI',2],['Cyber AI',1]])if(readout.textContent.startsWith(label))assert.equal(svg.querySelectorAll('[data-need]').filter(e=>e.dataset.on==='white').length,count);
  }
  for(const text of ['5 besoins réels · lumière dispersée','alignement · 2 lentilles, 1 fente','faisceau cohérent · une seule direction','Workflow AI · née de 2 besoins réels · en recherche','Developer AI · née de 2 besoins réels · en recherche','Cyber AI · née de 1 besoin réel · en recherche'])assert.ok(seen.includes(text),text);
  const last=seen.indexOf('Cyber AI · née de 1 besoin réel · en recherche');assert.ok(seen.slice(last).includes('5 besoins réels · lumière dispersée'));
  const stage=root.querySelector('.iso-stage'),event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value:'w'});stage.dispatchEvent(event);
  for(let i=0;i<100;i++){clock+=RATE/30;tick(1.5/30,clock,false);}assert.match(readout.textContent,/Workflow AI/);
  assert.equal(tick(1/60,clock,true),false);
 }finally{cleanup();delete globalThis.__bumpVisionTick;}
});
