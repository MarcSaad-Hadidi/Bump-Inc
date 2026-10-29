import test from 'node:test';
import assert from 'node:assert/strict';
import {mountNativeTourRecovery,NATIVE_INSPECTION_GRACE_MS} from '../src/bump/seo/native-tour-recovery.js';

function fixture(kind='security-engine'){
 const saved=new Map(),timers=new Map();let now=0,id=0,restarts=0,cancelled=0;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 class Target extends EventTarget{
  constructor(){super();this.dataset={};this.handlers=new Map();}
  closest(){return this;}
  addEventListener(type,fn,options){super.addEventListener(type,fn,options);if(!this.handlers.has(type))this.handlers.set(type,new Set());this.handlers.get(type).add(fn);}
  removeEventListener(type,fn,options){super.removeEventListener(type,fn,options);this.handlers.get(type)?.delete(fn);}
 }
 const root=new Target(),win=new Target(),stage={},drawer={closest:selector=>selector.split(',').includes(kind==='workflow'?'[data-btn]':'[data-drawer]')?drawer:selector==='.iso-stage'?stage:null};
 set('window',win);set('performance',{now:()=>now});
 set('setTimeout',(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;});set('clearTimeout',key=>timers.delete(key));
 const recovery=mountNativeTourRecovery(root,{restart:()=>restarts++,cancelReplay:()=>cancelled++,kind});
 const fire=(type,props={},target=root)=>{for(const fn of [...target.handlers.get(type)||[]])fn({type,isTrusted:true,target:drawer,...props});};
 const advance=ms=>{const end=now+ms;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;timers.delete(next[0]);now=next[1].at;next[1].fn();}now=end;};
 return {root,win,recovery,fire,advance,get restarts(){return restarts;},get cancelled(){return cancelled;},pause(value){root.dataset.bumpDemoPaused=String(value);root.dispatchEvent(new Event('bump:demo-pause'));},restore(){recovery.destroy();for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}

test('a real drawer inspection cancels the short replay and recovers only after the last input grace',()=>{
 const f=fixture();try{
  f.recovery.setReady(true);
  f.fire('click',{isTrusted:false});f.advance(60000);assert.equal(f.restarts,0);assert.equal(f.recovery.pending,false);
  f.fire('click',{target:{closest:()=>null}});assert.equal(f.recovery.pending,false);
  f.fire('click');assert.equal(f.recovery.pending,true);assert.equal(f.cancelled,1);
  f.advance(10000);f.fire('pointermove');f.advance(NATIVE_INSPECTION_GRACE_MS-1);assert.equal(f.restarts,0);
  f.advance(1);assert.equal(f.restarts,1);assert.equal(f.recovery.pending,false);
 }finally{f.restore();}
});

test('workflow refusal, approval, scenario changes and native shortcuts all recover after idle, respecting pause',()=>{
 const f=fixture('workflow');try{
  f.recovery.setReady(true);
  // Both visible SVG buttons are data-btn controls; their native refusal or
  // approval handlers disable the same one-shot tour even before its last step.
  for(const action of ['no','ok']){
   const before=f.restarts;
   f.fire('click',{target:{dataset:{btn:action},closest:selector=>selector.includes('[data-btn]')?{}:null}});
   assert.equal(f.recovery.pending,true);f.advance(5000);f.pause(true);f.advance(60000);assert.equal(f.restarts,before);
   f.pause(false);f.advance(24999);assert.equal(f.restarts,before);f.advance(1);assert.equal(f.restarts,before+1);
  }
  f.fire('change',{target:{closest:selector=>selector.includes('[data-kind]')?{}:null}});f.advance(30000);assert.equal(f.restarts,3);
  for(const key of ['a','A','r','R']){
   const before=f.restarts;
   f.fire('keydown',{key,code:'Key'+key.toUpperCase()});f.advance(60000);assert.equal(f.restarts,before);
   f.fire('keyup',{code:'Key'+key.toUpperCase()},f.win);f.advance(30000);assert.equal(f.restarts,before+1);
  }
 }finally{f.restore();}
});

test('inspection recovery preserves explicit pause and time remaining through hidden sections',()=>{
 const f=fixture();try{
  f.recovery.setReady(true);f.fire('click');f.advance(5000);f.pause(true);f.advance(60000);assert.equal(f.restarts,0);
  f.recovery.setReady(false);f.pause(false);f.advance(60000);assert.equal(f.restarts,0);
  f.pause(true);f.recovery.setReady(true);f.advance(60000);assert.equal(f.restarts,0,'Returning never releases a chosen pause');
  f.pause(false);f.advance(24999);assert.equal(f.restarts,0);f.advance(1);assert.equal(f.restarts,1);
 }finally{f.restore();}
});

test('held pointers and native step keys wait for release; blur and unmount cannot strand the recovery',()=>{
 const f=fixture();try{
  f.recovery.setReady(true);f.fire('pointerdown',{pointerId:7});f.advance(60000);assert.equal(f.restarts,0);
  f.fire('pointerup',{pointerId:7},f.win);f.advance(10000);
  f.fire('keydown',{key:'ArrowRight',code:'ArrowRight'});f.advance(60000);assert.equal(f.restarts,0);
  f.fire('keyup',{code:'ArrowRight'},f.win);f.advance(29999);assert.equal(f.restarts,0);f.advance(1);assert.equal(f.restarts,1);
  f.fire('keydown',{key:'Home',code:'Home'});f.fire('blur',{},f.win);f.advance(30000);assert.equal(f.restarts,2);
  f.fire('click');f.recovery.destroy();f.advance(60000);assert.equal(f.restarts,2);
  assert.equal([...f.root.handlers.values()].reduce((sum,set)=>sum+set.size,0),0);
  assert.equal([...f.win.handlers.values()].reduce((sum,set)=>sum+set.size,0),0);
 }finally{f.restore();}
});
