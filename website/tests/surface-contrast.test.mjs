import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';
import {fallbackPaperContains,fallbackPaperClip} from '../src/bump/ui/chapterMotion.js';

async function load(entry,modules,globals){
 const compiled=await build({entryPoints:[entry],format:'cjs',write:false,platform:'node'});
 const module={exports:{}};
 runInNewContext(compiled.outputFiles[0].text,{module,exports:module.exports,require:id=>{assert(id in modules,id);return modules[id];},...globals});
 return module.exports;
}

test('native paper sampling includes language and project controls without recoloring whole menus or app controls',async()=>{
 let now=0;
 const make=(selector,box,excluded=false)=>({dataset:{},isConnected:true,ink:new Map(),getBoundingClientRect:()=>box,closest:()=>excluded?{}:null,matches:value=>value==='.bump-header'&&selector==='.bump-header',style:{setProperty(name,value){this.owner.ink.set(name,value);}},selector});
 const header=make('.bump-header',{left:0,top:0,width:1200,height:70,bottom:70});
 const language=make('.bump-header .bump-language-switch',{left:850,top:10,width:30,height:40,bottom:50});
 const project=make('.bump-header .bump-project-button',{left:900,top:10,width:220,height:40,bottom:50});
 const app=make('.bsc-editorial h3',{left:400,top:300,width:300,height:50,bottom:350},true);
 const nodes=[header,language,project,app];nodes.forEach(node=>{node.style.owner=node;});
 const doc={hidden:false,body:{},documentElement:{dataset:{}},querySelectorAll:selector=>nodes.filter(n=>selector.split(',').includes(n.selector))};
 const api=await load('src/bump/ui/contrast.js',{
  './viewport.js':{getBumpViewportHeight:()=>800},
  '/runtime/assets/BumpAssistedScroll.js':{},
  './chapterMotion.js':{fallbackPaperContains,fallbackPaperClip},
 },{document:doc,innerWidth:1200,scrollY:300,performance:{now:()=>now},MutationObserver:class{observe(){}}});
 for(const [position,surface,color]of [[-1,'scene','#fff9ed'],[0,'paper','#302e28'],[-1,'scene','#fff9ed']]){
  now+=100;api.updateBumpSurfaceContrast({},position);
  assert.equal(header.dataset.bumpSurface,surface);
  assert.equal(header.dataset.bumpContrast,undefined,'The header must not force its ink into every menu descendant');
  for(const node of [language,project]){
   assert.equal(node.dataset.bumpSurface,surface);
   assert.equal(node.ink.get('--bump-adaptive-ink'),color);
  }
  assert.equal(app.dataset.bumpContrast,undefined,'Application-owned surfaces preserve their colors');
 }
});

test('the real navigation effect follows compositor surface changes without a new scroll or stale chapter themes',async()=>{
 const effects=[],frames=new Map(),handlers=new Map(),observers=[],fallbackCalls=[];
 let frameId=0,tone='dark';
 const header={dataset:{bumpSurface:'scene'}},main={},root={lang:'fr',dataset:{navTheme:'light'}};
 const doc={documentElement:root,querySelector:selector=>selector==='.bump-header'?header:selector==='main'?main:null};
 const react={useEffect:fn=>effects.push(fn),useState:value=>[value,next=>{if(value==='dark')tone=typeof next==='function'?next(tone):next;}],useRef:()=>({current:null})};
 const components={r:react,j:{jsxs:(type,props)=>({type,props})}};
 const nav=await load('src/bump/ui/BumpNav.js',{
  './touchInspection.js':{},'../seo/landing.js':{},
  '../seo/navigation.js':{searchEditorialPages:()=>[],expertiseLinks:()=>[]},
  '/runtime/assets/BumpContrast.js':{updateFallbackContrast:force=>fallbackCalls.push(force)},
  '/runtime/assets/components-BdJai906.js':components,
  '/runtime/assets/(_locale).editions.winter2026-CdSmWtXg.js':{r:()=>({}),a:fn=>fn({activeSection:0})},
  '/runtime/assets/BumpContent.js':{},'/runtime/assets/BumpData.js':{content:{chapters:[]}},'/runtime/assets/BumpUI.js':{},
  './BackgroundMusic.js':{},'./DeviceMotionControl.js':{},'./BumpClarityConsent.js':{},
  './clarityConsentCore.js':{isBumpProductionHost:()=>false},
 },{
  document:doc,location:{hash:''},window:{location:{hostname:'preview.example'},addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:(name,fn)=>{if(handlers.get(name)===fn)handlers.delete(name);}},
  requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),
  ResizeObserver:class{observe(){}disconnect(){}},
  MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(target,options){this.target=target;this.options=options;}disconnect(){this.disconnected=true;}},
 });
 nav.default({navItems:[]});
 const cleanup=effects[2]();
 const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
 flush();assert.equal(tone,'dark');assert.equal(root.dataset.bumpTone,'dark');
 assert.equal(observers[0].target,header);
 assert.deepEqual([...observers[0].options.attributeFilter],['data-bump-surface']);
 header.dataset.bumpSurface='paper';observers[0].fn();
 assert.equal(tone,'light');assert.equal(root.dataset.bumpTone,'light');
 header.dataset.bumpSurface='scene';observers[0].fn();
 assert.equal(tone,'dark');assert.equal(root.dataset.navTheme,'light','The legacy chapter marker must not own glass contrast');
 handlers.get('bump:scroll-settled')();flush();assert(fallbackCalls.includes(true));
 cleanup();assert.equal(observers[0].disconnected,true);assert.equal(handlers.size,0);assert.equal(frames.size,0);
});
