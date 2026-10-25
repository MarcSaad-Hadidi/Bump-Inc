import test from 'node:test';
import assert from 'node:assert/strict';
import {installTouchInspection} from '../src/bump/ui/touchInspection.js';

function fixture(){
 const events=new Map(),windowEvents=new Map(),sent=[];
 const root={dataset:{},contains:node=>node===part,closest:()=>root,dispatchEvent:event=>sent.push(event.type)};
 const part={closest:selector=>selector==='[data-bump-info]'?part:root,dispatchEvent:event=>sent.push(event.type)};
 const doc={documentElement:{dataset:{}},addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)};
 const win={PointerEvent:class{constructor(type,init){Object.assign(this,{type},init);}},addEventListener:(type,fn)=>windowEvents.set(type,fn),removeEventListener:type=>windowEvents.delete(type)};
 const stop=installTouchInspection(doc,win);
 return{root,part,sent,stop,events,fire(type,extra={}){let blocked=false;events.get(type)?.({pointerType:'touch',target:part,clientX:20,clientY:30,stopImmediatePropagation(){blocked=true;},...extra});return blocked;},scroll(){windowEvents.get('scroll')?.();}};
}
test('touch explanations persist after finger release and hold the existing model clock',async()=>{
 const f=fixture();try{
  f.fire('pointerdown');await Promise.resolve();
  assert.equal(f.root.dataset.bumpTouchInspected,'true');assert.equal(f.root.dataset.bumpDemoInspecting,'true');
  assert.equal(f.fire('pointerleave'),true);assert.ok(f.sent.includes('pointerenter'));
  f.fire('pointerdown');await Promise.resolve();
  assert.equal(f.root.dataset.bumpTouchInspected,undefined);assert.equal(f.root.dataset.bumpDemoInspecting,'false');assert.equal(f.sent.at(-1),'pointerleave');
 }finally{f.stop();}
});
test('swipe, outside tap and scroll release inspection; mouse hover remains native',async()=>{
 const f=fixture();try{
  f.fire('pointerdown',{pointerType:'mouse'});await Promise.resolve();assert.equal(f.sent.length,0);
  f.fire('pointerdown');await Promise.resolve();f.fire('pointermove',{clientX:40});assert.equal(f.root.dataset.bumpTouchInspected,undefined);
  f.fire('pointerdown');await Promise.resolve();f.scroll();assert.equal(f.root.dataset.bumpDemoInspecting,'false');
  f.fire('pointerdown');await Promise.resolve();f.fire('pointerdown',{target:{closest:()=>null}});assert.equal(f.root.dataset.bumpTouchInspected,undefined);
 }finally{f.stop();assert.equal(f.events.size,0);}
});
