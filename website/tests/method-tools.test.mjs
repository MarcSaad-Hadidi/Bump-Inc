import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,resolve} from 'node:path';
import {build} from 'esbuild';
import {translateModule} from '../scripts/build-bump-english.mjs';
import {pageFor} from '../src/bump/seo/pages.js';
import {renderHtml,renderMarkdown} from '../src/bump/seo/render.js';

// Run the delivered draw/state/step loop. Replace only RAF with a virtual clock.
const compiled=await build({entryPoints:['src/components/bump-anatomy/methode/live.ts','src/components/bump-anatomy/methode/art.generated.ts','src/components/bump-anatomy/methode/model.ts','src/bump/machines/methodToolsRuntime.ts'],bundle:true,platform:'node',format:'esm',write:false,outdir:'/tmp/bump-method-tools-tests',plugins:[{name:'virtual-frame',setup(b){
 b.onResolve({filter:/^(?:\.\.\/shared\/runtime|\.\/runtime)$/},()=>({path:'driver',namespace:'test-driver'}));
 b.onLoad({filter:/.*/,namespace:'test-driver'},()=>({resolveDir:process.cwd(),contents:`export * from ${JSON.stringify(resolve('src/components/bump-anatomy/shared/runtime.ts'))};export function createLoop(stage,tick){globalThis.__bumpToolsTick=tick;return {kick(){},calm(){return false},destroy(){}};}`}));
}}]});
const load=code=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const modules=await Promise.all(compiled.outputFiles.map(f=>load(f.text)));
const {mount}=modules.find(m=>m.mount),{DATA}=modules.find(m=>m.DATA),model=modules.find(m=>m.createToolMap);
class Node extends EventTarget{
 constructor(){super();this.dataset={};this.style={};this.attrs={};this.nodes=new Map();this.textContent='';}
 querySelector(key){if(!this.nodes.has(key))this.nodes.set(key,new Node());return this.nodes.get(key);}
 querySelectorAll(key){const count={'[data-step]':5,'[data-cap]':2,'[data-opt]':3,'[data-tool-lamp]':5,'[data-link]':4,'[data-pulse]':8}[key]||0;return Array.from({length:count},(_,i)=>{const node=this.querySelector(key+'-'+i);node.dataset={step:String(i),link:String(i),pulse:String(i%4),n:String(i<4?0:1)};return node;});}
 setAttribute(key,value){this.attrs[key]=value;}getAttribute(key){return this.attrs[key]??null;}
 toggleAttribute(key,on){if(on)this.attrs[key]='';else delete this.attrs[key];}
}
function fixture(){
 const root=new Node();let clock=0;const stop=mount(root,DATA),tick=globalThis.__bumpToolsTick;
 const step=(seconds,calm=false)=>{for(let i=0;i<Math.ceil(seconds*60);i++){clock+=1/60;tick(1/60,clock,calm);}};
 const phase=()=>root.querySelectorAll('[data-step]').findIndex(n=>n.getAttribute('data-current')!==null);
 return{root,tick,step,phase,clock:()=>clock,stop:()=>{stop();delete globalThis.__bumpToolsTick;}};
}

test('new Method files retain the supplied art, animation, kit and step-loop bytes',()=>{
 const manifest=JSON.parse(readFileSync('src/components/bump-method-source.json','utf8'));
 assert.equal(Object.keys(manifest.sha256).length,13);
 for(const [path,hash]of Object.entries(manifest.sha256)){
  assert.equal(createHash('sha256').update(readFileSync('src/components/bump-anatomy/'+path)).digest('hex'),hash,path);
  if(path!=='shared/runtime.ts')assert.equal(hash,manifest.archiveSha256[path],path);
 }
 assert(model.TOOLS.includes('COMPTABILITÉ'));
});

test('the native tool map shows each stage, all maintenance readings and loops back to Audit',()=>{
 const f=fixture(),readout=f.root.querySelector('[data-readout]'),svg=f.root.querySelector('.iso-stage svg'),seen=new Set(),scores=new Set();
 try{
  for(let i=0;i<1800;i++){f.step(1/60);seen.add(readout.textContent);scores.add(Number(svg.querySelector('[data-score]').textContent));}
  for(const value of [...model.READOUT.slice(0,4),...model.MAINTENANCE])assert(seen.has(value),value);
  assert(scores.has(42));assert(scores.has(92));assert([...scores].some(n=>n>=74&&n<80));
  assert.equal(f.phase(),0);assert.equal(model.createToolMap().steps.get().index,0);
 }finally{f.stop();}
});

test('manual stage choice holds fifteen seconds, native pause works and reduced motion does not advance',()=>{
 const f=fixture(),stage=f.root.querySelector('.iso-stage');
 try{
  const key=new Event('keydown',{cancelable:true});Object.defineProperty(key,'key',{value:'3'});stage.dispatchEvent(key);
  assert.equal(key.defaultPrevented,true);assert.equal(f.phase(),2);
  f.step(14.9);assert.equal(f.phase(),2);f.step(.2);assert.equal(f.phase(),3);
  f.root.querySelector('[data-pause]').dispatchEvent(new Event('click'));
  assert.equal(f.tick(1/60,f.clock(),false),false);
  f.root.querySelector('[data-pause]').dispatchEvent(new Event('click'));
  assert.equal(f.tick(1/60,f.clock(),false),true);
  f.root.querySelectorAll('[data-step]')[0].dispatchEvent(new Event('click'));
  f.step(40,true);assert.equal(f.phase(),0);assert.equal(f.tick(1/60,f.clock(),true),false);
 }finally{f.stop();}
});

test('English readouts translate without changing the native state identifiers',async()=>{
 const source=compiled.outputFiles.find(f=>basename(f.path)==='model.js').text;
 const en=await load(translateModule(source));
 assert.deepEqual(en.STATES,model.STATES);
 assert.match(en.createToolMap().readout(0),/tool inventory/);
 assert.match(en.createToolMap().readout(1),/sales.*invoicing.*not connected/);
 assert.match(en.createToolMap().readout(4,1),/slowdown detected/);
 const {methodReadingForLocale}=modules.find(m=>m.methodReadingForLocale);
 assert.equal(methodReadingForLocale('→ analyse','en-CA'),'→ analysis');
 assert.equal(methodReadingForLocale('implantation · verification','en'),'implementation · verification');
 assert.equal(methodReadingForLocale('→ analyse','fr'),'→ analyse');
});

test('the preserved laboratory appears only on the approach pages with an honest explanation and Markdown parity',()=>{
 for(const locale of ['fr','en']){
  const page=pageFor('approach',locale),html=renderHtml(page,'https://example.com'),markdown=renderMarkdown(page,'https://example.com');
  assert.match(html,/data-calibration-model/);assert.match(html,/bump\/seo\/calibration\.css/);assert.match(html,/data-knob="A"/);
  const paragraph=page.sections.find(s=>s.calibration).paragraphs.at(-1);
  assert(html.includes(paragraph));assert(markdown.includes(paragraph));
  assert(!renderHtml(pageFor('security',locale),'https://example.com').includes('data-calibration-model'));
 }
});
