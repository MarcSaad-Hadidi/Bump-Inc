import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mountWorkflowPlayback} from '../src/bump/machines/suppliedWorkflowPlayback.js';
const result=await build({entryPoints:['src/components/bump-anatomy/workflow/model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createWorkflow}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('Workflow waits for arrival, leaves copy readable and approves through its real gate on every loop',()=>{
 const originals=new Map(),set=(k,v)=>{originals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});};
 let now=0,serial=0;const timers=new Map(),microtasks=[],observers=[],ios=[],transitions=[],flow=createWorkflow();
 const later=(fn,ms=0)=>{timers.set(++serial,{at:now+ms,fn});return serial;},flush=()=>{while(microtasks.length)microtasks.shift()();};
 const advance=ms=>{const end=now+ms;let count=0;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;assert.ok(++count<2000);timers.delete(next[0]);now=next[1].at;next[1].fn();flush();}now=end;flush();};
 class Node extends EventTarget{
  constructor(){super();this.dataset={};this.style={};this.attrs={};this._text='';this.top=120;}
  set textContent(v){this._text=v;for(const o of observers)if(o.node===this)microtasks.push(()=>o.fn([]));}get textContent(){return this._text;}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}closest(){return this;}matches(){return false;}
  getBoundingClientRect(){return{top:this.top,bottom:this.top+150,left:0,width:300,height:150};}getAnimations(){return[];}animate(){}append(){}remove(){}click(){this.action?.();}
 }
 const root=new Node(),readout=new Node(),reset=new Node(),pause=new Node(),button=new Node(),fields=new Map();
 let cursorApproach=0,cursorTravel=0,waitingDetected=false;
 root.dataset=new Proxy(root.dataset,{set(target,key,value){if(key==='workflowWaiting'&&value==='true'){waitingDetected=true;assert.equal(flow.steps.get().index,3,'Only the actual approval gate is highlighted');}if(key==='workflowCursor'&&value==='approach')cursorApproach=now;if(key==='workflowCursor'&&value==='click')cursorTravel=now-cursorApproach;target[key]=value;return true;}});
 function select(i,approved=false){
  const old=flow.steps.get().index;
  const changed=approved?flow.accept():flow.steps.select(i);if(!changed)return;
  transitions.push({index:flow.steps.get().index,at:now,from:old,approved});readout.textContent='→ native movement';later(()=>{flow.steps.tick(1,true);readout.textContent=flow.readout();},300);
 }
 button.addEventListener('click',()=>select(4,true));
 reset.action=()=>{flow.insert('devis');readout.textContent=flow.readout();pause.setAttribute('aria-pressed','false');};
 pause.action=()=>{flow.steps.pause();pause.setAttribute('aria-pressed',String(flow.steps.get().paused));};
 const buttons=Array.from({length:6},(_,i)=>{const n=new Node();n.dataset.step=String(i);n.action=()=>select(i);return n;});
 root.querySelector=selector=>{if(selector==='[data-readout]')return readout;if(selector==='[data-step][data-current]')return buttons[flow.steps.get().index];if(selector==='[data-reset]')return reset;if(selector==='[data-pause]')return pause;if(selector==='[data-btn="ok"]')return button;const match=selector.match(/^\[data-step="(\d+)"\]$/);if(match)return buttons[+match[1]];if(!fields.has(selector))fields.set(selector,new Node());return fields.get(selector);};
 const document=new EventTarget(),window=new EventTarget(),media=new EventTarget();media.matches=false;document.hidden=false;document.documentElement=new Node();document.documentElement.dataset={bumpOpening:'scene',bumpAssistedScroll:'true',bumpScrollMoving:'true'};document.createElement=()=>new Node();
 set('document',document);set('window',window);set('innerHeight',900);set('matchMedia',()=>media);set('performance',{now:()=>now});set('setTimeout',later);set('clearTimeout',id=>timers.delete(id));set('requestAnimationFrame',fn=>later(()=>fn(now),16));set('cancelAnimationFrame',id=>timers.delete(id));set('MouseEvent',class extends Event{});
 set('IntersectionObserver',class{constructor(fn){ios.push(fn);}observe(){}disconnect(){}});set('MutationObserver',class{constructor(fn){this.fn=fn;observers.push(this);}observe(node){this.node=node;}disconnect(){this.node=null;}});
 let cleanup;
 try{
  cleanup=mountWorkflowPlayback(root);advance(15000);assert.equal(flow.steps.get().index,0);assert.equal(transitions.length,0);
  const arrived=now;document.documentElement.dataset.bumpScrollMoving='false';window.dispatchEvent(new Event('bump:scroll-settled'));advance(2175);assert.equal(flow.steps.get().index,0);advance(1);assert.equal(flow.steps.get().index,1);
  for(let i=0;i<1000&&Number(root.dataset.workflowCycle)<2;i++)advance(100);
  assert.equal(Number(root.dataset.workflowCycle),2);assert.deepEqual(transitions.slice(0,5).map(t=>t.index),[1,2,3,4,5]);assert.equal(transitions[0].at-arrived,2176);
  for(let i=1;i<5;i++)if(i!==3)assert.ok(transitions[i].at-transitions[i-1].at>=2800&&transitions[i].at-transitions[i-1].at<5000);
  assert.ok(cursorApproach-transitions[2].at>=1500&&cursorApproach-transitions[2].at<1550,'The cursor appears about 1.2s after the native arrival at validation');
  assert.ok(waitingDetected);assert.equal(root.dataset.workflowWaiting,'false');assert.equal(transitions[3].approved,true);assert.equal(root.dataset.workflowStage,'0');
  assert.ok(cursorTravel>=320&&cursorTravel<=330,'Approval cursor arrives and clicks sooner, after its 240ms travel');
  document.documentElement.dataset.bumpScrollMoving='true';observers.find(o=>o.node===document.documentElement).fn([]);const cycle=root.dataset.workflowCycle;advance(30000);assert.equal(root.dataset.workflowCycle,cycle);assert.equal(root.dataset.workflowPlaying,'false');
 }finally{cleanup?.();for(const[k,v]of originals){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
