import {readFileSync,writeFileSync} from 'node:fs';

// Only the retained document bootstrap is adapted; scene geometry, timelines
// and the scroll runtime are untouched. Keep this transform idempotent.
export function stabilizeStartup(){
  const path='public/runtime/assets/root-C6D-dr4m.js';
  let source=readFileSync(path,'utf8');
  if(source.includes('bumpUseStartupReady'))return;
  const edits=[
    ['function le(){const e=m(),','function le(){const bumpStylesReady=bumpUseStartupReady();const e=m(),'],
    ['return r.jsxs("html",{lang:s,className:"",children:','return r.jsxs("html",{lang:s,className:"",style:{backgroundColor:"#000",margin:0},children:'],
    ['children:[r.jsx(J,{}),r.jsx(X,{})','children:[bumpStylesReady?r.jsx(J,{}):null,r.jsx(X,{})'],
  ];
  for(const [from,to]of edits){
    if(!source.includes(from))throw new Error('The retained document changed; inspect its startup before patching.');
    source=source.replace(from,to);
  }
  writeFileSync(path,'import{useStartupReady as bumpUseStartupReady}from"./BumpStartup.js";'+source);
}
