import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {build} from 'esbuild';
const built=await build({entryPoints:['src/components/bump-anatomy/port/live.ts','src/components/bump-anatomy/port/art.generated.ts'],bundle:true,platform:'node',format:'esm',write:false,outdir:'/tmp/bump-port-tests',plugins:[{name:'virtual-native-raf',setup(b){
 b.onResolve({filter:/^\.\.\/shared\/runtime$/},()=>({path:'driver',namespace:'virtual'}));
 b.onLoad({filter:/.*/,namespace:'virtual'},()=>({resolveDir:process.cwd(),contents:`export * from ${JSON.stringify(resolve('src/components/bump-anatomy/shared/runtime.ts'))};export function createLoop(stage,tick){globalThis.__bumpPortTick=tick;return {kick(){},calm(){return false},destroy(){}};}`}));
}}]});
const modules=await Promise.all(built.outputFiles.map(file=>import('data:text/javascript;base64,'+Buffer.from(file.text).toString('base64'))));
const {mount}=modules.find(m=>m.mount),{DATA,FIGURE_HTML}=modules.find(m=>m.DATA);
class Node extends EventTarget{
 constructor(){super();this.dataset={};this.style={};this.attrs={};this.nodes=new Map();this.textContent='';}
 querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector);}
 querySelectorAll(selector){
  const match=selector.match(/^\[([^=\]]+)(?:="([^\"]+)")?\]$/),count=match?[...FIGURE_HTML.matchAll(new RegExp(' '+match[1]+(match[2]===undefined?'(?:="[^\"]*")?(?=[ >])':'="'+match[2]+'"'),'g'))].length:0;
  return Array.from({length:count},(_,i)=>{const n=this.querySelector(selector+'-'+i);if(selector==='[data-step]')n.dataset.step=String(i);if(selector==='[data-pick]')n.dataset.pick=String(i);return n;});
 }
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}toggleAttribute(k,on){if(on)this.attrs[k]='';else delete this.attrs[k];}
}
test('the native port arrives, loads all services, departs and repeats with working inspection',()=>{
 const root=new Node(),readout=root.querySelector('[data-readout]'),svg=root.querySelector('.iso-stage').querySelector('svg'),seen=[];const cleanup=mount(root,DATA),tick=globalThis.__bumpPortTick;let clock=0,sailed=false,returned=false;
 try{
  for(let frame=0;frame<1000;frame++){
   clock+=2/30;tick(2/30,clock,false);seen.push(readout.textContent);
   if(readout.textContent.startsWith('parlons'))sailed=true;if(sailed&&readout.textContent.startsWith('2 fondateurs'))returned=true;
  }
  for(const text of ['2 fondateurs · outils, équipes, opérations, contraintes','ancrés à Montréal · née au Québec',"aujourd'hui : PME du Québec · demain : au-delà des frontières",'Automatisation · pour un processus difficile à suivre','Logiciel sur mesure · pour un outil manquant','Cybersécurité · pour une question de sécurité','navire chargé · automatisation, logiciel sur mesure, cybersécurité','parlons de votre projet · besoin, enjeux, résultat visé'])assert.ok(seen.includes(text),text);
  assert.ok(returned,'The ship must return empty for the next cycle');
  const stage=root.querySelector('.iso-stage'),key=new Event('keydown',{cancelable:true});Object.defineProperty(key,'key',{value:'l'});stage.dispatchEvent(key);
  for(let i=0;i<40;i++){clock+=2/30;tick(2/30,clock,false);}assert.equal(readout.textContent,'Logiciel sur mesure · pour un outil manquant');
  assert.equal(tick(1/60,clock,true),false,'Reduced motion requests no additional frame');
 }finally{cleanup();delete globalThis.__bumpPortTick;}
});
