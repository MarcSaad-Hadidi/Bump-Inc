import test from 'node:test';
import assert from 'node:assert/strict';
import {demoIsReady,demoReadingMs,observeDemoReady} from '../src/bump/ui/demoReady.js';
import {sceneFrameNeeded,sceneFrameDelta} from '../src/bump/chapters/runtime/BumpSceneBudget.js';

test('a glimpse, an opening or an unfinished scroll never starts a timed demo',()=>{
 const state={height:900,opening:'scene',assisted:true,moving:'false',hidden:false},box={top:100,bottom:850,width:800,height:750};
 assert.equal(demoIsReady(box,state),true);
 assert.equal(demoIsReady({...box,top:800,bottom:1550},state),false);
 assert.equal(demoIsReady(box,{...state,moving:'true'}),false);
 assert.equal(demoIsReady(box,{...state,opening:'type'}),false);
 assert.equal(demoIsReady(box,{...state,hidden:true}),false);
 for(const words of [12,25,35]){const hold=demoReadingMs('Une étape',Array(words).fill('mot').join(' '));assert.ok(hold>=3800&&hold<=5800,'Each caption receives a readable hold');}
});
test('settled scroll and viewport events activate once, pause immediately, then reactivate',()=>{
 const originals=new Map(),set=(k,v)=>{originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});};
 const root={dataset:{bumpOpening:'scene',bumpAssistedScroll:'true',bumpScrollMoving:'true'}},document=new EventTarget(),window=new EventTarget();document.documentElement=root;document.hidden=false;
 const node={dataset:{},getBoundingClientRect:()=>({top:100,bottom:850,width:800,height:750})},changes=[],observers=[];let stop;
 try{
  set('document',document);set('window',window);set('innerHeight',900);
  set('IntersectionObserver',class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}});set('MutationObserver',class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}});
  stop=observeDemoReady(node,value=>changes.push(value));assert.deepEqual(changes,[false]);
  root.dataset.bumpScrollMoving='false';window.dispatchEvent(new Event('bump:scroll-settled'));assert.deepEqual(changes,[false,true]);
  observers[0]();assert.deepEqual(changes,[false,true]);root.dataset.bumpScrollMoving='true';observers[1]();assert.deepEqual(changes,[false,true,false]);
  root.dataset.bumpScrollMoving='false';window.dispatchEvent(new Event('bump:scroll-settled'));assert.deepEqual(changes,[false,true,false,true]);
 }finally{stop?.();for(const[k,v]of originals){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
test('native mixers only spend frames on visible scenes and never jump after a stall',()=>{
 const state={activeSection:2,finalOverlayPosition:-1,sectionMap:new Map([[2,{isActive:true}],[3,{isActive:true,transitionProgress:.4}],[4,{isActive:false}]])};
 assert.equal(sceneFrameNeeded(2,state),true);assert.equal(sceneFrameNeeded(3,state),true);assert.equal(sceneFrameNeeded(4,state),false);
 assert.equal(sceneFrameNeeded(2,{...state,finalOverlayPosition:0}),false);assert.equal(sceneFrameNeeded(3,{...state,finalOverlayPosition:0}),true);assert.equal(sceneFrameNeeded(2,state,true),false);
 assert.equal(sceneFrameDelta(.8),1/30);assert.equal(sceneFrameDelta(1/60),1/60);
});

test('document suspension does not masquerade as viewport departure',()=>{
 const originals=new Map(),set=(k,v)=>{originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});};
 const root={dataset:{bumpOpening:'scene',bumpAssistedScroll:'true',bumpScrollMoving:'false'}},document=new EventTarget(),window=new EventTarget();document.documentElement=root;document.hidden=false;
 let bounds={top:100,bottom:850,width:800,height:750},stop;
 const node={dataset:{},getBoundingClientRect:()=>bounds},eligible=[],viewport=[],observers=[];
 try{
  set('document',document);set('window',window);set('innerHeight',900);
  set('IntersectionObserver',class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}});set('MutationObserver',class{observe(){}disconnect(){}});
  stop=observeDemoReady(node,value=>eligible.push(value),{onViewportChange:value=>viewport.push(value)});
  document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));
  document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(eligible,[true,false,true]);assert.deepEqual(viewport,[true]);
  bounds={top:1000,bottom:1750,width:800,height:750};observers[0]();
  bounds={top:100,bottom:850,width:800,height:750};observers[0]();
  assert.deepEqual(viewport,[true,false,true]);
 }finally{stop?.();for(const[k,v]of originals){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
