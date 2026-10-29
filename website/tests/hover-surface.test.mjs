import test from 'node:test';
import assert from 'node:assert/strict';
import {hoverTargetIsVisible} from '../src/bump/ui/hoverDemonstration.js';

test('cursor tours skip transparent SVG surfaces and hidden parent trays despite nonempty bounds',()=>{
 const previous=globalThis.getComputedStyle;
 globalThis.getComputedStyle=node=>node.css;
 const root={},tray={css:{display:'block',visibility:'visible',opacity:'0'},parentElement:root};
 const part={getBoundingClientRect:()=>({width:100,height:40}),css:{display:'block',visibility:'visible',opacity:'1'},parentElement:tray};
 try{
  assert.equal(hoverTargetIsVisible(part,root),false);
  tray.css.opacity='1';assert.equal(hoverTargetIsVisible(part,root),true);
  part.css.opacity='0';assert.equal(hoverTargetIsVisible(part,root),false);
  part.css.opacity='.3';assert.equal(hoverTargetIsVisible(part,root),true);
  part.css.visibility='hidden';assert.equal(hoverTargetIsVisible(part,root),false);
  part.css.visibility='visible';part.isConnected=false;assert.equal(hoverTargetIsVisible(part,root),false);
 }finally{if(previous)globalThis.getComputedStyle=previous;else delete globalThis.getComputedStyle;}
});
