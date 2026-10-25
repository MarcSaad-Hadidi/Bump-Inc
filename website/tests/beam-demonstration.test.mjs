import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBeamDemonstration} from '../src/bump/vision/beamDemonstration.js';

// Exercise the actual demonstration controller against tile controls, not an
// imitation timeline: clicks change the same pressed state as the real UI.
function fixture(){
 const saved=new Map(),timers=new Map(),observers=[];let now=0,id=0,inView=true;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 class Node extends EventTarget{
  constructor(){super();this.dataset={};this.style={};this.hidden=false;this.attrs={};this.children=[];this.clicks=0;this.handlers=new Map();}
  append(node){this.children.push(node);}remove(){}setAttribute(key,value){this.attrs[key]=value;}getAttribute(key){return this.attrs[key];}
  addEventListener(name,fn,options){super.addEventListener(name,fn,options);const list=this.handlers.get(name)||[];list.push(fn);this.handlers.set(name,list);}
  removeEventListener(name,fn,options){super.removeEventListener(name,fn,options);this.handlers.set(name,(this.handlers.get(name)||[]).filter(item=>item!==fn));}
  closest(selector){return selector==='.ui-ib__tool'?this:null;}
  getBoundingClientRect(){return{left:100,top:inView?100:1800,bottom:inView?800:2500,width:800,height:700};}
  click(){this.clicks++;this.attrs['aria-pressed']=this.attrs['aria-pressed']==='true'?'false':'true';}
 }
 const root=new Node(),tiles=Array.from({length:6},()=>{const node=new Node();node.setAttribute('aria-pressed','true');return node;});root.querySelectorAll=()=>tiles;
 const document=new EventTarget();document.hidden=false;document.documentElement={dataset:{bumpOpening:'scene',bumpAssistedScroll:'true',bumpScrollMoving:'false'}};document.createElement=()=>new Node();
 const window=new EventTarget(),media=new EventTarget();media.matches=false;
 let stop;
 try{
  set('document',document);set('window',window);set('innerHeight',900);set('performance',{now:()=>now});set('matchMedia',()=>media);
  set('setTimeout',(fn,delay)=>{timers.set(++id,{at:now+delay,fn});return id;});set('clearTimeout',key=>timers.delete(key));
  set('requestAnimationFrame',fn=>{timers.set(++id,{at:now+16,fn});return id;});set('cancelAnimationFrame',key=>timers.delete(key));
  set('PointerEvent',class extends Event{constructor(type,init){super(type,init);this.relatedTarget=init.relatedTarget;}});
  set('IntersectionObserver',class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}});set('MutationObserver',class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}});
  stop=mountBeamDemonstration(root);
 }catch(error){for(const[k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}throw error;}
 return{root,tiles,media,document,advance(ms){const end=now+ms;for(let safety=0;safety<1000;safety++){const pending=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!pending)break;now=pending[1].at;timers.delete(pending[0]);pending[1].fn();}now=end;},view(value){inView=value;observers[0]();},user(type,target=tiles[0],extra={}){for(const fn of root.handlers.get(type)||[])fn({isTrusted:true,type,target,relatedTarget:root,...extra});},dispose(){stop();},restore(){stop();for(const[k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}};
}

test('one continuous cursor journey visits, disconnects and restores tools before disappearing',()=>{
 const f=fixture();try{
  const inspected=[];f.tiles.forEach((tile,index)=>tile.addEventListener('bump:beam-inspect',event=>{if(event.detail.active)inspected.push(index);}));
  f.advance(1399);assert.equal(f.root.dataset.beamCursor,'none');
  let began=false,finished=false,sawDisconnected=false;const visited=new Set();
  for(let ms=0;ms<50000;ms+=100){f.advance(100);if(f.root.dataset.beamCursor!=='none'){began=true;visited.add(Number(f.root.dataset.beamJourneyStep));assert.equal(f.root.children[0].hidden,false);}
   else if(began){finished=true;break;}
   if(f.tiles.some(t=>t.getAttribute('aria-pressed')==='false'))sawDisconnected=true;
  }
  assert.ok(finished);assert.ok(sawDisconnected);assert.deepEqual([...visited],[0,1,2,3,4,5,6,7,8]);
  assert.deepEqual(inspected,[0,1,3,4,0,3,5,0,2],'Every cursor visit must open the same inspection as real hover');
  assert.ok(f.tiles.every(t=>t.getAttribute('aria-pressed')==='true'));assert.equal(f.tiles.reduce((n,t)=>n+t.clicks,0),4);
  f.view(false);const count=()=>f.tiles.reduce((n,t)=>n+t.clicks,0),before=count();f.advance(20000);assert.equal(count(),before);
  f.view(true);f.user('pointerover');f.advance(5000);assert.equal(f.root.dataset.beamCursor,'none');f.user('pointerout');f.advance(1500);assert.equal(f.root.dataset.beamCursor,'move');
  f.user('pointerdown');f.advance(29999);assert.equal(f.root.dataset.beamCursor,'none');f.advance(1);assert.equal(f.root.dataset.beamCursor,'move');
  f.media.matches=true;f.media.dispatchEvent(new Event('change'));f.advance(15000);assert.equal(f.root.dataset.beamCursor,'none');
 }finally{f.restore();}
});

for(const [name,type,extra]of [['touch','pointerdown',{button:0,pointerType:'touch'}],['Enter','keydown',{key:'Enter'}],['Space','keydown',{key:' '}]]){
 test(`${name} activation resumes the demonstrated paused tile with exactly one real click`,()=>{
  const f=fixture();try{
   for(let i=0;i<500&&!(f.tiles[3].getAttribute('aria-pressed')==='false'&&f.tiles[0].getAttribute('aria-pressed')==='false');i++)f.advance(100);
   assert.equal(f.tiles[3].getAttribute('aria-pressed'),'false');assert.equal(f.tiles[0].getAttribute('aria-pressed'),'false');
   const before=f.tiles[3].clicks;f.user(type,f.tiles[3],extra);
   assert.equal(f.tiles[3].clicks,before,'Capture cleanup must not toggle the pending activation target');
   assert.equal(f.tiles[0].getAttribute('aria-pressed'),'true','Other demonstration changes are restored');
   f.tiles[3].click();assert.equal(f.tiles[3].getAttribute('aria-pressed'),'true');
   assert.equal(f.tiles[3].clicks,before+1);f.dispose();assert.equal(f.tiles[3].clicks,before+1,'Cleanup must not undo the visitor action');
  }finally{f.restore();}
 });
}

test('hovering a paused tile preserves its visible state until activation, and abandoning hover restores it',()=>{
 const f=fixture();try{
  for(let i=0;i<500&&f.tiles[3].getAttribute('aria-pressed')!=='false';i++)f.advance(100);
  f.user('pointerover',f.tiles[3]);assert.equal(f.tiles[3].getAttribute('aria-pressed'),'false');
  f.user('pointerout',f.tiles[3]);assert.equal(f.tiles[3].getAttribute('aria-pressed'),'true');
  f.advance(30000);for(let i=0;i<500&&f.tiles[3].getAttribute('aria-pressed')!=='false';i++)f.advance(100);
  f.user('pointerover',f.tiles[3]);const before=f.tiles[3].clicks;
  f.user('pointerdown',f.tiles[3],{button:0});f.tiles[3].click();f.user('pointerout',f.tiles[3]);
  assert.equal(f.tiles[3].getAttribute('aria-pressed'),'true');assert.equal(f.tiles[3].clicks,before+1);
 }finally{f.restore();}
});
