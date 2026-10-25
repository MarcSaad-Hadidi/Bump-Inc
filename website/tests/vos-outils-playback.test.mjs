import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mountVosOutilsPlayback} from '../src/bump/machines/suppliedVosOutilsPlayback.js';
const bundled=await build({entryPoints:['src/components/bump-anatomy/vos-outils/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createToolkit}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));

test('IA starts promptly, leaves captions readable and repeats its real adapter demonstration',()=>{
 const saved=new Map(),set=(k,v)=>{saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});};
 const kit=createToolkit(),timers=new Map(),microtasks=[],observers=[],ios=[],transitions=[],toggles=[];let now=0,serial=0;
 const later=(fn,ms=0)=>{timers.set(++serial,{at:now+ms,fn});return serial;},flush=()=>{while(microtasks.length)microtasks.shift()();};
 const advance=ms=>{const end=now+ms;let count=0;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;assert.ok(++count<2000);timers.delete(next[0]);now=next[1].at;next[1].fn();flush();}now=end;flush();};
 class Node extends EventTarget{
  constructor(){super();this.dataset={};this.style={};this.attrs={};this._text='';this.top=120;this.handlers=new Map();}
  addEventListener(type,fn,options){super.addEventListener(type,fn,options);this.handlers.set(type,[...(this.handlers.get(type)||[]),fn]);}
  set textContent(value){this._text=value;for(const o of observers)if(o.node===this)microtasks.push(()=>o.fn([]));}get textContent(){return this._text;}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}closest(){return this;}matches(){return false;}
  getBoundingClientRect(){return{top:this.top,bottom:this.top+160,left:0,width:300,height:160};}getAnimations(){return[];}animate(){}append(){}remove(){}click(){this.action?.();}
 }
 const root=new Node(),readout=new Node(),reset=new Node(),pause=new Node(),adapter=new Node(),fields=new Map();
 const buttons=Array.from({length:6},(_,i)=>{const button=new Node();button.dataset.step=String(i);button.action=()=>{
  if(!kit.steps.select(i))return;transitions.push({index:i,at:now});readout.textContent='→ native movement';later(()=>{kit.steps.tick(.8,true);readout.textContent=kit.readout();},400);
 };return button;});
 reset.action=()=>{kit.reset();readout.textContent=kit.readout();pause.setAttribute('aria-pressed','false');};
 pause.action=()=>{kit.steps.pause();pause.setAttribute('aria-pressed',String(kit.steps.get().paused));};
 adapter.addEventListener('click',()=>{kit.toggleAdapter(3);toggles.push({at:now,synced:kit.synced().length});readout.textContent=kit.readout();});
 root.querySelector=selector=>{
  if(selector==='[data-readout]')return readout;if(selector==='[data-step][data-current]')return buttons[kit.steps.get().index];if(selector==='[data-reset]')return reset;if(selector==='[data-pause]')return pause;if(selector==='[data-tool="3"]')return adapter;
  const match=selector.match(/^\[data-step="(\d+)"\]$/);if(match)return buttons[+match[1]];if(!fields.has(selector))fields.set(selector,new Node());return fields.get(selector);
 };
 const document=new EventTarget(),window=new EventTarget(),media=new EventTarget();media.matches=false;document.hidden=false;document.documentElement=new Node();document.documentElement.dataset={bumpOpening:'scene',bumpAssistedScroll:'true',bumpScrollMoving:'true'};document.createElement=()=>new Node();
 set('document',document);set('window',window);set('innerHeight',900);set('matchMedia',()=>media);set('performance',{now:()=>now});set('setTimeout',later);set('clearTimeout',id=>timers.delete(id));set('requestAnimationFrame',fn=>later(()=>fn(now),16));set('cancelAnimationFrame',id=>timers.delete(id));set('MouseEvent',class extends Event{});
 set('IntersectionObserver',class{constructor(fn){ios.push(fn);}observe(){}disconnect(){}});set('MutationObserver',class{constructor(fn){this.fn=fn;observers.push(this);}observe(node){this.node=node;}disconnect(){this.node=null;}});
 let cleanup;
 try{
  cleanup=mountVosOutilsPlayback(root);advance(10000);assert.equal(transitions.length,0,'Never start before the assisted stop');
  const arrived=now;document.documentElement.dataset.bumpScrollMoving='false';window.dispatchEvent(new Event('bump:scroll-settled'));
  advance(2559);assert.equal(kit.steps.get().index,0);advance(1);assert.equal(kit.steps.get().index,1,'First change starts after the initial reading hold of arrival');
  for(let i=0;i<500&&Number(root.dataset.toolsCycle)<2;i++)advance(100);
  assert.equal(root.dataset.toolsCycle,'2');assert.ok(now-arrived>20000&&now-arrived<45000,'The complete demo leaves time to read and still loops');
  assert.deepEqual(transitions.slice(0,5).map(t=>t.index),[1,2,3,4,5]);
  for(let i=1;i<4;i++)assert.ok(transitions[i].at-transitions[i-1].at>=3000&&transitions[i].at-transitions[i-1].at<=6500,'Steps retain a readable hold after native movement');
  assert.deepEqual(toggles.slice(0,2).map(t=>t.synced),[4,5]);assert.ok(toggles[1].at-toggles[0].at<3500,'Do not hold the detached adapter for five seconds');
  document.documentElement.dataset.bumpScrollMoving='true';window.dispatchEvent(new Event('bump:scroll-settled'));const cycle=root.dataset.toolsCycle;advance(30000);assert.equal(root.dataset.toolsCycle,cycle);assert.equal(root.dataset.toolsPlaying,'false');
  document.documentElement.dataset.bumpScrollMoving='false';window.dispatchEvent(new Event('bump:scroll-settled'));assert.equal(root.dataset.toolsCycle,cycle,'Readiness alone must resume the same cycle');
  root.top=1200;ios[0]();root.top=120;ios[0]();assert.equal(root.dataset.toolsCycle,'3');const resumedCycle=root.dataset.toolsCycle;
  advance(1000);document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));advance(10000);document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(root.dataset.toolsCycle,resumedCycle);advance(1559);assert.equal(kit.steps.get().index,0);advance(1);assert.equal(kit.steps.get().index,1);advance(400);
  root.handlers.get('keydown')[0]({isTrusted:true,type:'keydown',target:root,key:'ArrowRight',code:'ArrowRight'});
  window.dispatchEvent(Object.assign(new Event('keyup'),{code:'ArrowRight'}));advance(1000);
  document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));advance(10000);document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));
  advance(28999);assert.equal(root.dataset.toolsCycle,resumedCycle);assert.equal(kit.steps.get().index,1);
  advance(1);assert.equal(Number(root.dataset.toolsCycle),Number(resumedCycle)+1);
  media.matches=true;media.dispatchEvent(new Event('change'));advance(1000);assert.equal(kit.steps.get().index,5);assert.equal(root.dataset.toolsPlaying,'false');
 }finally{cleanup?.();for(const[k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
