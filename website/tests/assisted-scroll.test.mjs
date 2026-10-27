import test from 'node:test';
import assert from 'node:assert/strict';
import {getBumpScrollStops,installBumpAssistedScroll,navigateBumpChapter} from '../src/bump/ui/assistedScroll.js';

// Test the actual input policy with a synchronous Lenis adapter. Rendering and
// the real continuous journey are checked separately in the browser.
function fixture({reduced=false,native=false,width=1440,height=900,continuation=false,staleEngine=false,folders=false}={}){
 const saved=new Map(),events=new Map(),calls=[],frames=new Map();let now=1000,frameId=0;
 const set=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
 class ElementStub{
  constructor(y=0,height=900){this.y=y;this.clientHeight=this.scrollHeight=height;this.dataset={};this.parentElement=null;this.selectors={};this.previousElementSibling=null;const props={};this.style={setProperty:(name,value)=>{props[name]=value;},getPropertyValue:name=>props[name]||''};}
  getBoundingClientRect(){return{top:this.y-scrollY,height:this.clientHeight};}
  querySelectorAll(selector){return this.selectors[selector]||[];}
  closest(){return null;}matches(){return false;}
 }
 const nodes=Object.fromEntries(Object.entries({sidekick:1500,online:4000,operations:7000,'security-system':8000,'security-audits':8900,'security-vulnerabilites':9800,'security-remediation':10700,'security-suivi':11600,retail:13600,developer:17000,b2b:21000}).map(([id,y])=>[id,new ElementStub(y)]));
 const selectors={'.bump-workflow-execution':new ElementStub(2600),'.bump-task-cloud':new ElementStub(3300),'.bump-method-demo':new ElementStub(15000)};
 if(folders){const stage=new ElementStub(4600,600);stage.offsetHeight=600;const story=new ElementStub(4600,2400);story.querySelector=()=>stage;selectors['.bump-software-story']=story;}
 if(continuation){
  const grid=(ids,y,withHeading=false)=>{
   const element=new ElementStub(y,300),cards=ids.map((id,i)=>{const card=new ElementStub(y+(width>700?Math.floor(i/2)*320:i*420),width>700?280:380);card.id=id;return card;});
   element.selectors['.bump-service']=cards;
   if(withHeading){const heading=new ElementStub(y-70,40);heading.matches=s=>s==='.bump-group-title';element.previousElementSibling=heading;}
   return element;
  };
  nodes['vision-sculpture']=new ElementStub(17900,Math.min(900,height-130));
  nodes.developer.selectors['.bump-services']=[grid(['vision-workflow-ai','vision-developer-ai','vision-cyber-ai'],19000),grid(['vision-infrastructure'],20400)];
  nodes.b2b.y=22000;
  const manifesto=new ElementStub(23300,500),heading=new ElementStub(23200,40);heading.matches=s=>s==='.bump-group-title';manifesto.previousElementSibling=heading;
  selectors['.bump-company-manifesto']=manifesto;
  nodes.b2b.selectors['.bump-services']=[grid(['bump-montreal','bump-pme'],24000),grid(['bump-votre-projet','bump-preparer-brief'],25400,true)];
  selectors['#b2b .bump-group-last']=new ElementStub(25330,1000);
 }
 set('window',globalThis);set('Element',ElementStub);set('innerWidth',width);set('innerHeight',height);set('scrollY',0);
 set('performance',{now:()=>now});set('matchMedia',()=>({matches:reduced}));
 set('document',{documentElement:{dataset:{}},body:new ElementStub(),getElementById:id=>nodes[id]||null,querySelector:selector=>selectors[selector]||null});
 set('getComputedStyle',()=>({overflowY:'visible',paddingTop:'0',top:'0'}));
 set('addEventListener',(name,handler)=>events.set(name,handler));set('removeEventListener',name=>events.delete(name));set('dispatchEvent',()=>{});set('CustomEvent',class{constructor(type,init){this.type=type;this.detail=init?.detail;}});
 set('requestAnimationFrame',callback=>{frames.set(++frameId,callback);return frameId;});
 set('cancelAnimationFrame',id=>frames.delete(id));
 set('scrollTo',({top})=>{globalThis.scrollY=top;calls.push({y:top,native:true});});
 let engineTarget=0;
 const lenis={reset(){engineTarget=scrollY;},scrollTo(y,options){calls.push({y,...options});if(staleEngine&&y===engineTarget){options.onComplete?.();return;}engineTarget=y;globalThis.scrollY=y;options.onComplete?.();}};
 const cleanup=installBumpAssistedScroll(()=>native?null:lenis);
 const wheel=(delta=100,gap=350)=>{now+=gap;let prevented=false;events.get('wheel')({deltaX:0,deltaY:delta,deltaMode:0,target:document.body,cancelable:true,preventDefault(){prevented=true;}});return prevented;};
 return{calls,wheel,nodes,selectors,fire(name,event={}){let prevented=false;events.get(name)?.({target:document.body,cancelable:true,preventDefault(){prevented=true;},...event});return prevented;},advance(ms){now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(now));},get stops(){return getBumpScrollStops();},restore(){cleanup();for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}

test('a touch claims vertical movement before native momentum, then advances only once per gesture',()=>{
 const f=fixture({native:true,width:390,height:780});try{
  f.fire('touchstart',{touches:[{clientX:100,clientY:400}]});
  assert.equal(f.fire('touchmove',{touches:[{clientX:100,clientY:397}]}),true);
  assert.equal(f.calls.length,0);
  assert.equal(f.fire('touchmove',{touches:[{clientX:100,clientY:350}]}),true);
  f.advance(3000);assert.equal(document.documentElement.dataset.bumpScrollStop,'hero-approach');
  f.fire('touchmove',{touches:[{clientX:100,clientY:100}]});f.advance(5000);
  assert.equal(document.documentElement.dataset.bumpScrollStop,'hero-approach');
  f.fire('touchend');f.fire('touchstart',{touches:[{clientX:100,clientY:400}]});f.fire('touchmove',{touches:[{clientX:100,clientY:340}]});f.advance(5000);
  assert.equal(document.documentElement.dataset.bumpScrollStop,'workflow-painting');
 }finally{f.restore();}
});

test('mobile painting stops show complete introductions, retaining the desktop camera stops',()=>{
 const f=fixture({native:true,width:390,height:780});try{
  document.documentElement.dataset.bumpStableViewport='true';
  assert.equal(f.stops.find(s=>s.id==='workflow-painting').y,f.nodes.sidekick.y+2);
  assert.equal(f.stops.find(s=>s.id==='software-painting').y,f.nodes.online.y+2);
 }finally{f.restore();}
});

test('a model mounting during travel cannot leave the arrival at old placeholder coordinates',()=>{
 const f=fixture({native:true,width:390,height:780});try{
  document.documentElement.dataset.bumpStableViewport='true';
  f.wheel();f.advance(3000);f.wheel();f.nodes.sidekick.y+=90;f.advance(5000);
  assert.equal(document.documentElement.dataset.bumpScrollStop,'workflow-painting');assert.equal(scrollY,f.nodes.sidekick.y+2);
 }finally{f.restore();}
});

test('a finger gesture begun while travelling stays discarded after the arrival',()=>{
 const f=fixture({native:true,width:390});try{
  f.fire('touchstart',{touches:[{clientX:100,clientY:400}]});f.fire('touchmove',{touches:[{clientX:100,clientY:340}]});f.fire('touchend');
  f.fire('touchstart',{touches:[{clientX:100,clientY:400}]});f.advance(3000);f.fire('touchmove',{touches:[{clientX:100,clientY:100}]});f.advance(5000);
  assert.equal(document.documentElement.dataset.bumpScrollStop,'hero-approach');
 }finally{f.restore();}
});

test('horizontal movement, pinch zoom and an open dialog retain their native touch behaviour',()=>{
 const f=fixture({native:true,width:390});try{
  f.fire('touchstart',{touches:[{clientX:100,clientY:400}]});
  assert.equal(f.fire('touchmove',{touches:[{clientX:180,clientY:390}]}),false);
  f.fire('touchstart',{touches:[{clientX:100,clientY:400},{clientX:180,clientY:400}]});
  assert.equal(f.fire('touchmove',{touches:[{clientX:100,clientY:300},{clientX:180,clientY:300}]}),false);
  const dialog=f.nodes.sidekick;dialog.matches=selector=>selector.includes('role="dialog"');
  f.fire('touchstart',{target:dialog,touches:[{clientX:100,clientY:400}]});
  assert.equal(f.fire('touchmove',{touches:[{clientX:100,clientY:300}]}),false);
  assert.equal(f.calls.length,0);
 }finally{f.restore();}
});

test('native dialog headings and scroll boundaries never move the underlying chapter',()=>{
 const f=fixture({native:true,width:390});try{
  const dialog=f.nodes.sidekick,heading=f.nodes.online;
  // Model a native <dialog open> with no explicit ARIA role or aria-modal.
  dialog.matches=selector=>selector.split(',').includes('dialog[open]');
  heading.parentElement=dialog;
  for(const target of [dialog,heading])for(const delta of [-100,100]){
   dialog.scrollTop=delta>0?dialog.scrollHeight-dialog.clientHeight:0;
   f.fire('touchstart',{target,touches:[{clientX:100,clientY:400}]});
   assert.equal(f.fire('touchmove',{target,touches:[{clientX:100,clientY:400-delta}]}),false);
   f.fire('touchend');
   assert.equal(f.fire('wheel',{target,deltaX:0,deltaY:delta,deltaMode:0}),false);
   assert.equal(f.fire('keydown',{target,key:delta>0?'PageDown':'PageUp'}),false);
  }
  assert.equal(f.calls.length,0);assert.equal(scrollY,0);
  assert.equal(f.wheel(),true,'normal chapter gestures still work after the dialog closes');
 }finally{f.restore();}
});

test('Space on a FAQ summary retains native activation at short-screen reading stops and during travel',()=>{
 const f=fixture({height:390,continuation:true,native:true});try{
  const faq=new f.nodes.b2b.constructor(26800,1000),summary=new f.nodes.b2b.constructor();
  f.nodes['bump-home-questions']=faq;
  summary.closest=selector=>selector.split(',').includes('summary')?summary:null;
  const stop=f.stops.find(item=>item.id==='company-questions');
  assert(f.stops.some(item=>item.id==='company-questions-detail-1'));
  globalThis.scrollY=stop.y;
  const before=f.calls.length;
  assert.equal(f.fire('keydown',{target:summary,key:' '}),false);
  assert.equal(f.calls.length,before);assert.equal(scrollY,stop.y);
  assert.equal(f.fire('keydown',{key:'PageDown'}),true,'chapter keys still advance between reading stops');
  assert.equal(document.documentElement.dataset.bumpScrollMoving,'true');
  assert.equal(f.fire('keydown',{target:summary,key:' '}),false,'an active journey must not cancel native disclosure activation');
 }finally{f.restore();}
});

test('browser toolbar height changes leave all assisted destinations and the current landing unchanged',()=>{
 const f=fixture({width:390,height:780});try{
  document.documentElement.dataset.bumpViewportHeight='780';
  navigateBumpChapter('sidekick',{immediate:true});
  const before=f.stops.map(({id,y})=>[id,y]),landing=scrollY,count=f.calls.length;
  globalThis.innerHeight=860;f.fire('resize');
  assert.deepEqual(f.stops.map(({id,y})=>[id,y]),before);
  assert.equal(scrollY,landing);assert.equal(f.calls.length,count);
 }finally{f.restore();}
});

test('short mobile sections get reading stops before the next painting',()=>{
 const f=fixture({width:740,height:390});try{
  document.documentElement.dataset.bumpStableViewport='true';
  const stops=f.stops,audit=stops.findIndex(stop=>stop.id==='security-audits'),next=stops.findIndex(stop=>stop.id==='security-vulnerabilites');
  assert.ok(next>audit+1);assert.match(stops[audit+1].id,/security-audits-detail/);
  assert.ok(stops[next-1].y<stops[next].y);
 }finally{f.restore();}
});

test('monitoring advances to the pencil chapter; a momentum tail cannot skip its stop',()=>{
 const f=fixture();try{
  globalThis.scrollY=f.stops.find(s=>s.id==='security-suivi').y;
  assert.equal(f.wheel(),true);
  const method=f.stops.find(s=>s.id==='method-painting');
  assert.equal(scrollY,method.y);assert.equal(document.documentElement.dataset.bumpScrollStop,'method-painting');
  const count=f.calls.length;f.wheel(800,30);assert.equal(f.calls.length,count);
  f.wheel(-100,350);assert.equal(document.documentElement.dataset.bumpScrollStop,'security-suivi');
 }finally{f.restore();}
});

test('chapter buttons use exactly the assisted landing coordinates',()=>{
 const f=fixture();try{
  for(const [handle,id]of [['sidekick','workflow-painting'],['online','software-painting'],['operations','security-painting'],['retail','method-painting'],['developer','vision-painting'],['b2b','company-painting']]){
   const stop=f.stops.find(s=>s.id===id);assert.ok(navigateBumpChapter(handle,{immediate:true}));assert.equal(scrollY,stop.y);assert.equal(document.documentElement.dataset.bumpScrollStop,id);
  }
 }finally{f.restore();}
});

test('Workflow has a slower continuous entrance; reduced motion remains instant',()=>{
 let f=fixture();try{
  navigateBumpChapter('hero',{immediate:true});
  f.wheel();f.wheel();const move=f.calls.at(-1);
  assert.equal(document.documentElement.dataset.bumpScrollStop,'workflow-painting');assert.ok(move.duration>2.5&&move.duration<2.6);assert.equal(move.immediate,false);
  assert.equal(move.easing(0),0);assert.equal(move.easing(1),1);assert.ok(move.easing(.25)>0&&move.easing(.25)<.5);
 }finally{f.restore();}
 f=fixture({reduced:true});try{f.wheel();f.wheel();assert.equal(f.calls.at(-1).duration,0);assert.equal(f.calls.at(-1).immediate,true);}finally{f.restore();}
});

test('chapter buttons recover from a native focus jump and advance from the same stop',()=>{
 const f=fixture({staleEngine:true});try{
  navigateBumpChapter('retail',{immediate:true});const landing=scrollY;
  globalThis.scrollY=landing-2300;
  navigateBumpChapter('retail',{immediate:true});assert.equal(scrollY,landing);
  f.wheel();assert.equal(document.documentElement.dataset.bumpScrollStop,'method-workshop');
 }finally{f.restore();}
});

test('the mobile native journey completes without a Lenis frame driver',()=>{
 const f=fixture({native:true});try{
  f.wheel();assert.equal(document.documentElement.dataset.bumpScrollMoving,'true');
  f.advance(2000);assert.equal(document.documentElement.dataset.bumpScrollMoving,'false');assert.equal(document.documentElement.dataset.bumpScrollStop,'hero-approach');
  f.wheel();f.advance(5000);assert.equal(document.documentElement.dataset.bumpScrollMoving,'false');assert.equal(document.documentElement.dataset.bumpScrollStop,'workflow-painting');
 }finally{f.restore();}
});

test('a late layout shift does not spend the next gesture on the same stop',()=>{
 const f=fixture();try{
  navigateBumpChapter('retail',{immediate:true});
  f.nodes.retail.y+=74;
  f.wheel();assert.equal(document.documentElement.dataset.bumpScrollStop,'method-workshop');
 }finally{f.restore();}
});

test('the assisted journey continues through Vision and Company to the final contact row',()=>{
 const f=fixture({continuation:true});try{
  navigateBumpChapter('developer',{immediate:true});
  const expected=['vision-sculpture','vision-vision-workflow-ai','vision-vision-infrastructure','company-painting','company-manifesto','company-bump-montreal','company-bump-votre-projet'];
  for(const id of expected){assert.equal(f.wheel(1800),true);assert.equal(document.documentElement.dataset.bumpScrollStop,id);const count=f.calls.length;f.wheel(800,30);assert.equal(f.calls.length,count);}
  assert.equal(f.wheel(-100),true);assert.equal(document.documentElement.dataset.bumpScrollStop,'company-bump-montreal');
  const final=f.stops.find(s=>s.id==='company-bump-votre-projet'),tail=parseFloat(f.selectors['#b2b .bump-group-last'].style.getPropertyValue('--bump-contact-tail'));
  assert.equal(25400+280+tail-innerHeight,final.y);
 }finally{f.restore();}
});

test('mobile stops include every future-agent and contact card without skipping rows',()=>{
 const f=fixture({continuation:true,width:390,height:740});try{
  navigateBumpChapter('developer',{immediate:true});
  const expected=['vision-sculpture','vision-vision-workflow-ai','vision-vision-developer-ai','vision-vision-cyber-ai','vision-vision-infrastructure','company-painting','company-manifesto','company-bump-montreal','company-bump-pme','company-bump-votre-projet','company-bump-preparer-brief'];
  for(const id of expected){f.wheel();assert.equal(document.documentElement.dataset.bumpScrollStop,id);}
  const final=f.stops.at(-1),tail=parseFloat(f.selectors['#b2b .bump-group-last'].style.getPropertyValue('--bump-contact-tail'));
  assert.equal(25820+380+tail-innerHeight,final.y);
 }finally{f.restore();}
});

test('the Vision network replaces the old text-card stops and exits directly to Company',()=>{
 const f=fixture({continuation:true});try{
  f.nodes['vision-research-network']={getBoundingClientRect:()=>({top:19500-scrollY,height:790})};
  navigateBumpChapter('developer',{immediate:true});
  assert.equal(f.stops.filter(stop=>stop.id.startsWith('vision-vision-')).length,0);
  for(const id of ['vision-sculpture','vision-research-network','company-painting']){
   f.wheel(1800);assert.equal(document.documentElement.dataset.bumpScrollStop,id);
   const count=f.calls.length;f.wheel(800,30);assert.equal(f.calls.length,count);
  }
  f.wheel(-100);assert.equal(document.documentElement.dataset.bumpScrollStop,'vision-research-network');
 }finally{f.restore();}
});

test('the Company flow replaces text cards with one final full-screen stop',()=>{
 const f=fixture({continuation:true});try{
  f.nodes['company-connections']={getBoundingClientRect:()=>({top:24600-scrollY,height:innerHeight-110})};
  navigateBumpChapter('b2b',{immediate:true});
  assert.equal(f.stops.filter(stop=>stop.id.startsWith('company-bump-')).length,0);
  for(const id of ['company-manifesto','company-connections']){f.wheel(1800);assert.equal(document.documentElement.dataset.bumpScrollStop,id);const count=f.calls.length;f.wheel(800,30);assert.equal(f.calls.length,count);}
  const last=f.stops.at(-1),tail=parseFloat(f.selectors['#b2b .bump-group-last'].style.getPropertyValue('--bump-contact-tail'));
  assert.equal(24600+innerHeight-110+tail-innerHeight,last.y);
  f.wheel(-100);assert.equal(document.documentElement.dataset.bumpScrollStop,'company-manifesto');
 }finally{f.restore();}
});


test('short desktop content receives reading stops before the next chapter',()=>{
 const f=fixture({height:650,continuation:true});try{
  f.nodes['vision-sculpture'].clientHeight=1000;
  const stops=f.stops,first=stops.findIndex(s=>s.id==='vision-sculpture');
  assert.equal(stops[first+1].id,'vision-sculpture-detail-1');
  assert(stops[first+1].y>stops[first].y);
  assert(stops[first+1].y<stops.find(s=>s.id==='vision-vision-workflow-ai').y);
 }finally{f.restore();}
});

test('a new wheel gesture advances each stacked folder without repeated attempts, while momentum stays blocked',()=>{
 const f=fixture({folders:true});try{
  navigateBumpChapter('online',{immediate:true});f.wheel();
  assert.equal(document.documentElement.dataset.bumpScrollStop,'software-story-1');
  for(const id of ['software-story-2','software-story-3','software-story-4']){
   const before=f.calls.length;f.wheel(15,16);f.wheel(8,16);assert.equal(f.calls.length,before,'A continuous tail cannot skip a folder');
   f.wheel(1200,110);assert.equal(document.documentElement.dataset.bumpScrollStop,id,'One new gesture advances exactly one folder');
  }
  f.wheel(-100,110);assert.equal(document.documentElement.dataset.bumpScrollStop,'software-story-3');
 }finally{f.restore();}
});
