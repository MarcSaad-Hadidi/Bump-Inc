import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoTimeout} from '../src/bump/ui/demoTransport.js';
import {mountHoverDemonstration} from '../src/bump/ui/hoverDemonstration.js';

test('hover introduction opens real affordances, pauses in place and yields to the visitor',()=>{
 const saved=new Map(),timers=new Map(),observers=[];let now=0,id=0,inView=true;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 class Node extends EventTarget{
  constructor(){super();this.dataset={};this.style={};this.children=[];this.hidden=false;this.attrs={};this.handlers=new Map();}
  append(node){this.children.push(node);}remove(){}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
  closest(selector){return selector==='[data-bump-transport]'?root:null;}
  getBoundingClientRect(){return{left:100,top:inView?100:2000,bottom:inView?800:2700,width:800,height:700};}
  addEventListener(type,fn,options){super.addEventListener(type,fn,options);this.handlers.set(type,[...(this.handlers.get(type)||[]),fn]);}
 }
 const root=new Node(),nodes=[...Array.from({length:7},()=>new Node())],seen=[];
 root.querySelector=selector=>selector.includes('data-workflow-cursor')?null:nodes[0];root.querySelectorAll=selector=>selector==='[data-bump-info]'?nodes:[root.querySelector(selector)];
 nodes.forEach((node,i)=>node.addEventListener('pointerenter',()=>seen.push(i)));
 const media=new EventTarget();media.matches=false;const doc=new EventTarget(),win=new EventTarget();doc.hidden=false;doc.documentElement={dataset:{bumpOpening:'scene',bumpAssistedScroll:'true',bumpScrollMoving:'false'}};doc.createElement=()=>new Node();
 const advance=ms=>{const end=now+ms;for(let i=0;i<1000;i++){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;};
 let stop;
 try{
  set('document',doc);set('window',win);set('innerHeight',900);set('matchMedia',()=>media);set('performance',{now:()=>now});
  set('setTimeout',(fn,ms)=>{timers.set(++id,{at:now+ms,fn});return id;});set('clearTimeout',key=>timers.delete(key));set('requestAnimationFrame',fn=>{timers.set(++id,{at:now+16,fn});return id;});set('cancelAnimationFrame',key=>timers.delete(key));
  set('CustomEvent',class extends Event{constructor(type,init){super(type,init);this.detail=init?.detail;}});
  set('PointerEvent',class extends Event{constructor(type,init){super(type,init);this.pointerType=init.pointerType;}});
  set('IntersectionObserver',class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}});set('MutationObserver',class{observe(){}disconnect(){}});
  stop=mountHoverDemonstration(root,'workflow');advance(1180);assert.deepEqual(seen,[0]);assert.equal(root.dataset.bumpHoverDemo,'hovering');assert.equal(root.dataset.bumpDemoInspecting,'true');
  let modelAdvanced=false;const modelTimer=createDemoTimeout(root);modelTimer.schedule(500,()=>modelAdvanced=true);
  root.dataset.bumpDemoPaused='true';root.dispatchEvent(new Event('bump:demo-pause'));advance(20000);assert.deepEqual(seen,[0]);assert.equal(modelAdvanced,false);
  root.dataset.bumpDemoPaused='false';root.dispatchEvent(new Event('bump:demo-pause'));advance(12000);assert.deepEqual(seen,[0,1,2,3,4,5,6],'Every explanatory target is visited');assert.equal(root.children[0].hidden,true);assert.equal(root.dataset.bumpDemoInspecting,'false');assert.equal(modelAdvanced,true,'The model delay resumes after the complete inspection');modelTimer.destroy();
  inView=false;observers[0]();inView=true;observers[0]();advance(1180);assert.equal(root.children[0].hidden,false);
  for(const fn of root.handlers.get('pointermove'))fn({isTrusted:true});assert.equal(root.children[0].hidden,true);advance(30000);assert.equal(seen.length,8);
  media.matches=true;media.dispatchEvent(new Event('change'));assert.equal(root.children[0].hidden,true);
  stop();media.matches=false;
  const vault=new Node(),readout=new Node(),front=new Node();vault.dataset.securityStage='0';readout.textContent='coffre fermé';vault.querySelector=()=>readout;
  front.getBoundingClientRect=()=>({left:300,top:180,bottom:230,width:100,height:50});nodes.forEach(node=>{node.querySelector=()=>front;});
  root.querySelector=selector=>selector.includes('data-workflow-cursor')?null:selector.includes('data-security-')?vault:nodes[Number(selector.match(/\d+/)?.[0]||0)%3];
  const beforeVault=seen.length;stop=mountHoverDemonstration(root,'security');advance(10000);assert.equal(seen.length,beforeVault,'A built but closed vault must not be hovered');
  vault.dataset.securityStage='1';readout.textContent='→ activation';advance(1000);assert.equal(seen.length,beforeVault,'Wait through the actual door-opening transition');
  readout.textContent='six domaines activés';advance(1000);assert.equal(seen.length,beforeVault+1);assert.equal(root.children.at(-1).style.left,'247px');assert.equal(root.children.at(-1).style.top,'103px','The pointer tip uses the visible front-panel centre');
  stop();const vision=new Node(),visionNodes=Array.from({length:11},()=>new Node());vision.dataset.visionStage='0';vision.querySelector=()=>readout;
  visionNodes.forEach((node,i)=>node.addEventListener('pointerenter',()=>seen.push('v'+i)));
  root.querySelector=selector=>selector.includes('data-workflow-cursor')?null:vision;
  root.querySelectorAll=()=>visionNodes;
  const beforeVision=seen.length;stop=mountHoverDemonstration(root,'vision');advance(10000);assert.equal(seen.length,beforeVision,'Wait until the initially invisible lenses are placed');
  vision.dataset.visionStage='1';readout.textContent='→ alignement';advance(1000);assert.equal(seen.length,beforeVision);
  readout.textContent='lentilles alignées';advance(20000);assert.deepEqual(seen.slice(beforeVision),Array.from({length:11},(_,i)=>'v'+i));assert.equal(root.dataset.bumpDemoInspecting,'false');
  stop();root.querySelectorAll=selector=>selector==='[data-bump-info]'?nodes:[root.querySelector(selector)];const port=new Node();port.dataset.portStage='3';port.dataset.portLoaded='0';
  root.querySelector=selector=>selector.includes('data-workflow-cursor')?null:selector==='.bump-port-live'?port:nodes[Number(selector.match(/\d+/)?.[0]||0)%6];
  const beforePort=seen.length;stop=mountHoverDemonstration(root,'port');advance(10000);assert.equal(seen.length,beforePort,'Do not inspect cargo while it is still being loaded');
  root.handlers.get('pointermove').at(-1)({isTrusted:true,type:'pointermove',target:root});
  port.dataset.portLoaded='6';advance(1000);assert.equal(seen.length,beforePort+1);
  advance(10000);assert.equal(root.dataset.bumpHoverVisited,'0,1,2,3,4,5');assert.equal(root.dataset.bumpHoverComplete,'true','Departure can resume only after all six actual hover visits');
  stop();
  const toolsModel=new Node(),beforeMethod=seen.length;
  root.querySelector=selector=>selector.includes('data-workflow-cursor')?null:selector==='.bump-method-live[data-method-model="tools"]'?toolsModel:null;
  root.querySelectorAll=selector=>selector==='[data-tool][data-bump-info]'?nodes.slice(0,5):selector==='[data-score][data-bump-info]'?[nodes[5]]:nodes;
  nodes.forEach(node=>{node.css={display:'block',visibility:'visible',opacity:'1'};});
  set('getComputedStyle',node=>node.css);
  stop=mountHoverDemonstration(root,'method');advance(20000);
  assert.deepEqual(seen.slice(beforeMethod),[0,1,2,3,4,5],'The tools map tour ends at the health dial, with no later-phase ghost stops');
  assert.equal(root.children.at(-1).hidden,true);assert.equal(root.dataset.bumpHoverComplete,'true');
  stop();const beforeChanging=seen.length;
  stop=mountHoverDemonstration(root,'method');advance(800);
  nodes[0].css.opacity='0'; // disappears while the cursor approaches
  nodes[2].css.opacity='0'; // disappears before the next departure
  advance(20000);
  assert.deepEqual(seen.slice(beforeChanging),[1,3,4,5],'Revalidate both before departure and before dispatching the hover');
  assert.equal(root.children.at(-1).hidden,true);assert.equal(root.dataset.bumpDemoInspecting,'false');
 }finally{stop?.();for(const[key,value]of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
