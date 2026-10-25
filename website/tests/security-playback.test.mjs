import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSecurityPlayback} from '../src/bump/machines/suppliedSecurityPlayback.js';

// Test the host against native-control/pose completion events, using a virtual
// clock. SVG geometry and actual model states are verified in security-import.
test('assembly, nine stages, approval click, repetition and viewport restart',()=>{
 const saved=new Map(),set=(k,v)=>{saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});};
 let now=0,serial=0,index=0,paused=false;const timers=new Map(),microtasks=[],observers=[],intersections=[],actions=[];
 const later=(fn,ms=0)=>{timers.set(++serial,{at:now+ms,fn});return serial;};
 const flush=()=>{while(microtasks.length)microtasks.shift()();};
 const advance=ms=>{const end=now+ms;let count=0;while(true){const next=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++count>2000)throw Error('Unbounded host scheduling');timers.delete(next[0]);now=next[1].at;next[1].fn();flush();}now=end;flush();};
 class Node extends EventTarget{
  constructor(){super();this.dataset={};this.style={};this.hidden=false;this.attributes={};this._text='';}
  set textContent(v){this._text=v;for(const o of observers)if(o.node===this)microtasks.push(()=>o.fn([]));}get textContent(){return this._text;}
  setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]??null;}closest(){return this;}
  getBoundingClientRect(){return{left:0,top:this.top??100,bottom:(this.top??100)+150,width:300,height:150};}getAnimations(){return[];}animate(){}append(){}remove(){}click(){this.action?.();}
 }
 const root=new Node(),readout=new Node(),intro=new Node(),desk=new Node(),fields=new Map(),pause=new Node(),reset=new Node(),replay=new Node();intro.dataset.intro='5';
 const buttons=Array.from({length:9},(_,i)=>{const b=new Node();b.dataset.step=String(i);b.action=()=>{index=i;actions.push(i);readout.textContent='→ native pose';later(()=>readout.textContent='native pose settled',300);};return b;});
 pause.action=()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));};reset.action=()=>{index=0;paused=false;pause.setAttribute('aria-pressed','false');readout.textContent='initial pose';};
 replay.action=()=>{intro.style.opacity='0';later(()=>{intro.style.opacity='';for(const o of observers)if(o.node===intro)microtasks.push(()=>o.fn([]));},2200);};
 root.querySelector=selector=>{
  if(selector==='[data-readout]')return readout;if(selector==='[data-desk="0"]')return desk;if(selector==='[data-step][data-current]')return buttons[index];if(selector==='[data-reset]')return reset;if(selector==='[data-replay]')return replay;if(selector==='[data-pause]')return pause;
  const match=selector.match(/^\[data-step="(\d+)"\]$/);if(match)return buttons[Number(match[1])];if(!fields.has(selector))fields.set(selector,new Node());return fields.get(selector);
 };
 root.querySelectorAll=selector=>selector.startsWith('[data-intro')?[intro]:[];
 const document=new EventTarget();document.hidden=false;document.documentElement=new Node();document.documentElement.dataset={bumpOpening:"scene",bumpAssistedScroll:"true",bumpScrollMoving:"true"};document.createElement=()=>new Node();const window=new EventTarget(),calm=new EventTarget();calm.matches=false;
 set('innerHeight',900);set('window',window);set('document',document);set('matchMedia',()=>calm);set('performance',{now:()=>now});set('setTimeout',later);set('clearTimeout',id=>timers.delete(id));set('requestAnimationFrame',fn=>later(()=>fn(now),16));set('cancelAnimationFrame',id=>timers.delete(id));
 set('MutationObserver',class{constructor(fn){this.fn=fn;observers.push(this);}observe(node){this.node=node;}disconnect(){this.node=null;}});
 set('IntersectionObserver',class{constructor(fn){this.fn=fn;intersections.push(this);}observe(){this.fn([{isIntersecting:true,intersectionRatio:1}]);}disconnect(){}});set('MouseEvent',class extends Event{});
 let cleanup;
 try{
  cleanup=mountSecurityPlayback(root);advance(12000);assert.equal(index,0);assert.equal(actions.length,0);assert.equal(root.dataset.securityCycle,undefined);
  document.documentElement.dataset.bumpScrollMoving='false';observers.find(o=>o.node===document.documentElement).fn([]);advance(2100);assert.equal(index,0);assert.equal(actions.length,0);
  for(let i=0;i<1200&&Number(root.dataset.securityCycle)<2;i++)advance(100);
  assert.ok(Number(root.dataset.securityCycle)>=2);assert.deepEqual(actions.slice(0,8),[1,2,3,4,5,6,7,8]);
  assert.equal(root.dataset.securityCursor,'none');
  root.top=1200;intersections[0].fn([{isIntersecting:false,intersectionRatio:0}]);assert.equal(root.dataset.securityPlaying,'false');const cycle=root.dataset.securityCycle;advance(20000);assert.equal(root.dataset.securityCycle,cycle);
  root.top=100;intersections[0].fn([{isIntersecting:true,intersectionRatio:1}]);assert.equal(Number(root.dataset.securityCycle),Number(cycle)+1);assert.equal(index,0);
  calm.matches=true;calm.dispatchEvent(new Event('change'));advance(600);assert.equal(index,8);assert.equal(root.dataset.securityPlaying,'false');const stillCycle=root.dataset.securityCycle;advance(30000);assert.equal(root.dataset.securityCycle,stillCycle);assert.equal(root.dataset.securityCursor,'none');
 }finally{cleanup?.();for(const[k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
