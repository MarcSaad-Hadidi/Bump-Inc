import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDemoTransport,createDemoTimeout,demoIsPaused,demoTimelineIsPaused,setDemoInspectionPaused} from '../src/bump/ui/demoTransport.js';

test('the icon button pauses and resumes the remaining reading delay without restarting it',()=>{
 const saved=new Map(),timers=new Map();let now=0,id=0,executed=0;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 class Node extends EventTarget{constructor(){super();this.dataset={};this.children=[];this.attrs={};}closest(){return this;}append(node){this.children.push(node);}remove(){}setAttribute(k,v){this.attrs[k]=v;}}
 const root=new Node();let remove,timer;
 try{
  set('window',new EventTarget());set('document',{createElement:()=>new Node()});set('CustomEvent',class extends Event{constructor(type,init){super(type);this.detail=init.detail;}});set('performance',{now:()=>now});set('setTimeout',(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;});set('clearTimeout',key=>timers.delete(key));
  const advance=ms=>{const end=now+ms;for(const [key,item]of [...timers])if(item.at<=end){timers.delete(key);now=item.at;item.fn();}now=end;};
  remove=mountDemoTransport(root,'le workflow');timer=createDemoTimeout(root);timer.schedule(5000,()=>executed++);
  const button=root.children[0];assert.match(button.innerHTML,/<svg/);assert.doesNotMatch(button.innerHTML,/Pause|Reprendre/);
  advance(1700);button.dispatchEvent(new Event('click'));assert.ok(demoIsPaused(root));assert.match(button.attrs['aria-label'],/^Reprendre/);assert.ok(timer.pending);
  advance(20000);assert.equal(executed,0);button.dispatchEvent(new Event('click'));assert.equal(demoIsPaused(root),false);
  advance(3299);assert.equal(executed,0);advance(1);assert.equal(executed,1);assert.equal(timer.pending,false);
 }finally{timer?.destroy();remove?.();for(const[k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});


test('inspection holds the model delay but not its cursor, and never releases a manual pause',()=>{
 const saved=new Map(),timers=new Map();let now=0,id=0,model=0,cursor=0;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 const root=Object.assign(new EventTarget(),{dataset:{},closest(){return this;}});let modelTimer,cursorTimer;
 try{
  set('CustomEvent',class extends Event{constructor(type,init){super(type);this.detail=init.detail;}});
  set('performance',{now:()=>now});set('setTimeout',(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;});set('clearTimeout',key=>timers.delete(key));
  const advance=ms=>{const end=now+ms;for(const [key,item]of [...timers])if(item.at<=end){timers.delete(key);now=item.at;item.fn();}now=end;};
  modelTimer=createDemoTimeout(root);cursorTimer=createDemoTimeout(root,()=>true,{ignoreInspection:true});
  modelTimer.schedule(1000,()=>model++);advance(300);setDemoInspectionPaused(root,true);
  assert.equal(demoIsPaused(root),false);assert.equal(demoTimelineIsPaused(root),true);
  cursorTimer.schedule(400,()=>cursor++);advance(600);assert.equal(cursor,1);assert.equal(model,0);
  root.dataset.bumpDemoPaused='true';root.dispatchEvent(new Event('bump:demo-pause'));
  setDemoInspectionPaused(root,false);assert.equal(demoTimelineIsPaused(root),true);advance(10000);assert.equal(model,0);
  root.dataset.bumpDemoPaused='false';root.dispatchEvent(new Event('bump:demo-pause'));
  advance(699);assert.equal(model,0);advance(1);assert.equal(model,1,'Only the original remaining 700ms is consumed');
 }finally{modelTimer?.destroy();cursorTimer?.destroy();for(const[k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});


test('lazy Anatomy controls align with each local heading below the navigation and follow resize',()=>{
 const saved=new Map(),mutations=[];const set=(k,v)=>{saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});};
 class Node extends EventTarget{constructor(){super();this.dataset={};this.style={};this.attrs={};this.children=[];this.classList={add(){},remove(){}};}closest(){return this;}append(n){this.children.push(n);}remove(){}setAttribute(k,v){this.attrs[k]=v;}}
 const clean=[];
 try{
  const win=new EventTarget();set('window',win);set('document',{createElement:()=>new Node(),querySelector:()=>({getBoundingClientRect:()=>({bottom:64})})});
  set('MutationObserver',class{constructor(fn){mutations.push(fn);}observe(){}disconnect(){}});set('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});
  for(const kind of ['workflow','integration','security','method','vision','port']){
   const root=new Node();root.dataset.bumpMachine=kind;let heading=null,top=110,hostTop=0;
   root.querySelector=()=>heading;root.getBoundingClientRect=()=>({top:hostTop,left:300,right:1700});
   clean.push(mountDemoTransport(root));const button=root.children[0];assert.equal(button.hidden,true,'No control flashes under the navbar before its scene mounts');
   heading=new Node();heading.getBoundingClientRect=()=>({top,height:34,right:1450});mutations.at(-1)();
   assert.equal(button.hidden,false);assert.equal(button.style.top,'111px');assert.equal(button.style.right,'250px');
   top=150;win.dispatchEvent(new Event('resize'));assert.equal(button.style.top,'151px');
   top=20;win.dispatchEvent(new Event('bump:scroll-settled'));assert.ok(parseFloat(button.style.top)>=84,'The control always clears the fixed navigation');
   hostTop=-2000;top=-1890;win.dispatchEvent(new Event('bump:scroll-settled'));assert.equal(button.style.top,'111px');assert.ok(hostTop+parseFloat(button.style.top)<0,'A previous section never floats its button into the current viewport');
  }
 }finally{clean.forEach(fn=>fn());for(const[k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
