import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// Exercise the editorial initializer with the real shared touch registry.
// Drawing and unrelated presentation clocks have their own native-engine tests.
const stubs=new Map([
 ['../../components/bump-anatomy/calibration/live','export const mount=()=>()=>{};'],
 ['../../components/bump-anatomy/calibration/art.generated','export const DATA={};'],
 ['../machines/suppliedCalibrationPresentation.js','export const mountMethodAnnotations=()=>()=>{};'],
 ['../ui/demoTransport.js','export const mountDemoTransport=()=>()=>{};'],
 ['../ui/hoverDemonstration.js','export const mountHoverDemonstration=()=>()=>{};'],
 ['../ui/captionTransitions.js','export const mountCaptionTransitions=()=>()=>{};'],
 ['../ui/demoReady.js','export const observeDemoReady=()=>()=>{};']
]);
const built=await build({entryPoints:['src/bump/seo/calibration-live.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'lesson-clocks',setup(b){
 b.onResolve({filter:/.*/},args=>args.importer.endsWith('calibration-live.ts')&&stubs.has(args.path)?{path:args.path,namespace:'lesson-stub'}:null);
 b.onLoad({filter:/.*/,namespace:'lesson-stub'},args=>({contents:stubs.get(args.path)}));
}}]});
const {mountCalibrationLesson}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

test('relocated lesson installs persistent touch inspection and releases it on exit and teardown',async()=>{
 const saved=new Map(),set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 const handlers=new Map(),windowHandlers=new Map();
 const live={dataset:{}},root=new EventTarget();root.dataset={bumpTransport:'true'};
 const part=new EventTarget();part.closest=selector=>selector==='[data-bump-info]'?part:root;
 root.closest=()=>root;root.contains=node=>node===part;
 root.querySelector=selector=>selector==='.iso-figure'?{}:selector==='.bump-method-live'?live:null;
 const doc={documentElement:{dataset:{}},addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:type=>handlers.delete(type)};
 const win={PointerEvent:class extends Event{constructor(type,init){super(type,init);Object.assign(this,{pointerType:init.pointerType});}},addEventListener:(type,fn)=>windowHandlers.set(type,fn),removeEventListener:type=>windowHandlers.delete(type)};
 let explained=false,stop;part.addEventListener('pointerenter',()=>{explained=true;});part.addEventListener('pointerleave',()=>{explained=false;});
 const tap=()=>handlers.get('pointerdown')({pointerType:'touch',target:part,clientX:20,clientY:30});
 try{
  set('document',doc);set('window',win);stop=mountCalibrationLesson(root);
  assert.equal(doc.documentElement.dataset.bumpTouchInspection,'true');
  tap();await Promise.resolve();assert.equal(explained,true);assert.equal(root.dataset.bumpDemoInspecting,'true');
  let blocked=false;handlers.get('pointerleave')({pointerType:'touch',target:part,stopImmediatePropagation(){blocked=true;}});
  assert.equal(blocked,true);assert.equal(explained,true,'lifting the finger keeps the explanation open');
  tap();await Promise.resolve();assert.equal(explained,false);assert.equal(root.dataset.bumpDemoInspecting,'false');
  tap();await Promise.resolve();windowHandlers.get('scroll')();assert.equal(explained,false);assert.equal(root.dataset.bumpDemoInspecting,'false');
  tap();await Promise.resolve();stop();stop=null;
  assert.equal(explained,false);assert.equal(root.dataset.bumpDemoInspecting,'false');
  assert.equal(doc.documentElement.dataset.bumpTouchInspection,undefined);assert.equal(handlers.size,0);assert.equal(windowHandlers.size,0);
 }finally{stop?.();for(const[key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
