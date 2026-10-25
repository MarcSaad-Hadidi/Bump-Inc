import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSecurityTooltips} from '../src/bump/machines/suppliedSecurityPlayback.js';

test('vault roof never inspects a drawer whose rectangular bounds overlap it',()=>{
 const saved=new Map(),set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 class Node extends EventTarget{
  constructor(){super();this.dataset={};this.style={};this.children=[];this.hidden=false;}
  append(...nodes){this.children.push(...nodes);}setAttribute(){}removeAttribute(){}remove(){}closest(){return null;}
  getBoundingClientRect(){return{left:0,top:0,width:300,height:200,right:300,bottom:200};}
 }
 const root=new Node(),svg=new Node(),drawer=new Node(),roof=new Node();drawer.dataset.drawer='0';drawer.closest=()=>drawer;
 root.querySelector=()=>svg;svg.querySelectorAll=()=>[drawer];
 let stop;
 try{
  set('document',{createElement:()=>new Node()});set('window',new EventTarget());
  stop=mountSecurityTooltips(root);
  const tip=root.children[0];
  // Emulate bubbling while preserving the actual painted SVG target.
  const hover=target=>{const event=new Event('pointermove');Object.defineProperties(event,{target:{value:target},pointerType:{value:'mouse'},clientX:{value:150},clientY:{value:70}});svg.dispatchEvent(event);};
  hover(roof);assert.equal(tip.hidden,true);assert.equal(root.dataset.securityInspected,undefined);
  hover(drawer);assert.equal(tip.hidden,false);assert.equal(root.dataset.securityInspected,'0');
  hover(roof);assert.equal(tip.hidden,true);assert.equal(root.dataset.securityInspected,undefined);
 }finally{stop?.();for(const[key,value]of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
