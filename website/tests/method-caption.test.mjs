import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMethodAnnotations} from '../src/bump/machines/suppliedMethodPresentation.js';

test('laboratory measurements do not rewrite the narrative until the phase changes',()=>{
 const saved=new Map(),callbacks=[];let phase=0;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 class Node extends EventTarget{
  constructor(){super();this.dataset={};this.style={};this.writes=0;this.value='';}
  set textContent(value){this.value=value;this.writes++;}get textContent(){return this.value;}
  append(){}setAttribute(){}remove(){}
 }
 const root=new Node(),readout=new Node(),number=new Node(),title=new Node(),detail=new Node(),reading=new Node();
 const fields=new Map([['[data-readout]',readout],['[data-method-number]',number],['[data-method-title]',title],['[data-method-detail]',detail],['[data-method-reading]',reading]]);
 root.querySelector=selector=>fields.get(selector)||null;root.querySelectorAll=()=>Array.from({length:5},(_,i)=>({dataset:{step:String(i)},hasAttribute:()=>phase===i}));
 let stop;
 try{
  set('document',{createElement:()=>new Node()});set('window',new EventTarget());set('MutationObserver',class{constructor(callback){callbacks.push(callback);}observe(){}disconnect(){}});
  stop=mountMethodAnnotations(root);
  for(const text of ['→ Audit','vibration 3,2 mm/s','vibration 3,1 mm/s','vibration 3,0 mm/s']){readout.textContent=text;callbacks[0]([]);}
  assert.equal(title.writes,1);assert.equal(detail.writes,1);assert.equal(number.writes,1);assert.equal(reading.textContent,'vibration 3,0 mm/s');
  phase=2;readout.textContent='essai A';callbacks[0]([]);assert.equal(title.writes,2);assert.match(title.textContent,/Proposition/);
  for(const text of ['essai B','essai C','essai C · retenu']){readout.textContent=text;callbacks[0]([]);}
  assert.equal(title.writes,2);assert.equal(detail.writes,2);assert.equal(reading.textContent,'essai C · retenu');
 }finally{stop?.();for(const[key,value]of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
