import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
import {runInNewContext} from 'node:vm';
import {observeDemoReady} from '../src/bump/ui/demoReady.js';
import {observeDemoPaused} from '../src/bump/ui/demoTransport.js';

test('Company Flow resumes its service, phase, remaining delay and inspection after background suspension', async () => {
 const saved=new Map(),set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 const slots=[],effects=[],timers=new Map(),observers=[];let now=0,id=0,slot=0,effect=0,pending=[],dirty=false,tree;
 let bounds={top:100,bottom:750,width:1200,height:650};
 const node=Object.assign(new EventTarget(),{dataset:{},getBoundingClientRect:()=>bounds,closest(){return this;},contains(){return false;}});
 const document=new EventTarget(),window=new EventTarget(),media=new EventTarget();document.hidden=false;document.documentElement={dataset:{bumpOpening:'scene',bumpAssistedScroll:'true',bumpScrollMoving:'false'}};media.matches=false;
 const React={
  useRef(value){const i=slot++;if(!(i in slots))slots[i]={current:value};return slots[i];},
  useState(initial){const i=slot++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;}}];},
  useEffect(callback,deps){pending.push({index:effect++,callback,deps});},useLayoutEffect(){},
  createElement(type,props,...children){return{type,props:props||{},children:children.flat()};},
 };
 const source=readFileSync('src/bump/company/CompanyFlow.jsx','utf8').replace(/^import .*;\n/gm,'').replace('export default function','function');
 const compiled=await transform(source,{loader:'jsx',target:'es2022'});
 let component;
 function render(){let n=0;do{assert.ok(++n<20);dirty=false;slot=effect=0;pending=[];tree=component();tree.props.ref.current=node;for(const entry of pending){const old=effects[entry.index];if(old&&entry.deps.every((v,i)=>Object.is(v,old.deps[i])))continue;old?.cleanup?.();effects[entry.index]={deps:entry.deps,cleanup:entry.callback()};}}while(dirty);}
 const advance=ms=>{const end=now+ms;for(let n=0;n<1000;n++){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].callback();render();}now=end;};
 const pills=()=>{const found=[],visit=element=>{if(!element||typeof element!=='object')return;if(element.props?.className==='company-flow-pill')found.push(element);for(const child of element.children||[])visit(child);};visit(tree);return found;};
 const tab=hidden=>{document.hidden=hidden;document.dispatchEvent(new Event('visibilitychange'));render();};
 const status=()=>[String(tree.props['data-flow-index']),tree.props['data-flow-phase'],tree.props['data-flow-paused']];
 try{
  set('document',document);set('window',window);set('innerHeight',900);set('IntersectionObserver',class{constructor(fn){observers.push(fn);}observe(){}disconnect(){}});set('MutationObserver',class{observe(){}disconnect(){}});
  component=runInNewContext(compiled.code+';CompanyFlow',{React,...React,ArrowUpRight:()=>null,observeDemoReady,observeDemoPaused,matchMedia:()=>media,performance:{now:()=>now},setTimeout(callback,delay){timers.set(++id,{at:now+delay,callback});return id;},clearTimeout(key){timers.delete(key);},document,window});
  render();advance(2400);assert.deepEqual(status(),['1','charge','false']);
  window.dispatchEvent(new Event('blur'));tab(true);advance(10000);tab(false);assert.deepEqual(status(),['1','charge','false']);
  advance(199);assert.equal(status()[1],'charge');advance(1);assert.equal(status()[1],'beam');
  pills()[1].props.onPointerEnter();render();assert.deepEqual(status(),['1','beam','true']);
  window.dispatchEvent(new Event('blur'));render();tab(true);advance(10000);tab(false);advance(10000);
  assert.deepEqual(status(),['1','beam','true']);assert.equal(pills()[1].props['data-inspected'],'true');
  pills()[1].props.onPointerLeave();render();advance(599);assert.equal(status()[1],'beam');advance(1);assert.equal(status()[1],'received');
  bounds={top:1100,bottom:1750,width:1200,height:650};observers[0]();render();bounds={top:100,bottom:750,width:1200,height:650};observers[0]();render();
  assert.deepEqual(status(),['0','ready','false']);advance(100);
  bounds={top:1100,bottom:1750,width:1200,height:650};observers[0]();render();bounds={top:100,bottom:750,width:1200,height:650};observers[0]();render();
  advance(249);assert.equal(status()[1],'ready');advance(1);assert.equal(status()[1],'charge','A real return gets a fresh first-stage delay even when its phase key matches');
 }finally{for(const entry of effects)entry?.cleanup?.();for(const[key,value]of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
