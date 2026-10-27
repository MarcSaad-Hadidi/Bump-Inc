// Stop planning only. Desktop movement uses the site's existing Lenis engine,
// so its native scroll observer keeps driving the camera, paper and story.
import {chapterPaperPosition,nativeBlendRange,planChapterJourney,compactChapterTail} from './chapterMotion.js';
import {getBumpViewportHeight} from './viewport.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const top=element=>element.getBoundingClientRect().top+window.scrollY;
let paperRoutes=[],motionWindows=[],blendRanges=[],navigateChapter=null;
const gestureScenes=new Set();
const chapterStops=['home','workflow-painting','software-painting','security-painting','method-painting','vision-painting','company-painting'];
const chapterHandles=['hero','sidekick','online','operations','retail','developer','b2b'];

// Every chapter link, including the retained sidebar, uses the same journey and
// landing coordinates as wheel/touch navigation. No early camera preselection.
export function navigateBumpChapter(chapter,options={}){
 const index=typeof chapter==='number'?chapter:chapterHandles.indexOf(chapter);
 return !!navigateChapter?.(chapterStops[index],options);
}
export function registerBumpGestureScene(scene){gestureScenes.add(scene);return()=>gestureScenes.delete(scene);}
const combinedSoftwareDemos=()=>innerWidth>1100&&getBumpViewportHeight()>=1000;
const activeGestureScene=()=>[...gestureScenes].find(scene=>scene.isActive());

// A tiny negative native paper rest value left a ragged preview of the next
// painting below otherwise complete content. Keep its native paper pass at its
// exact resting pose during the defined content stops, then release it again.
export function bumpPaperPosition(position){
 return chapterPaperPosition(scrollY,paperRoutes,position);
}
export function getBumpFallbackFrame(y=scrollY){
 let current=0,next=null,blend=0;
 for(let i=0;i<blendRanges.length;i++){
  const range=blendRanges[i];
  if(y>=range.end){current=i+1;continue;}
  if(y>range.start){current=i;next=i+1;blend=clamp((y-range.start)/(range.end-range.start),0,1);}
  break;
 }
 return {current,next,blend,paper:chapterPaperPosition(y,paperRoutes,-1)};
}

export function getBumpScrollStops(paddingPass=0){
 const vh=getBumpViewportHeight(),header=document.querySelector('.bump-header')?.getBoundingClientRect().bottom||0;
 const clearance=Math.max(84,vh*.105,header+16),stops=[{id:'home',y:0}],anchors=new Map(),add=(id,element,offset=0,guided=true)=>{if(element){anchors.set(id,element);stops.push({id,y:Math.max(0,top(element)+offset),guided});}};
 document.documentElement.style?.setProperty('--bump-header-space',clearance+'px');
 for(const [handle,lead] of [['sidekick',document.documentElement.dataset.bumpStableViewport?2:vh*.48],['online',document.documentElement.dataset.bumpStableViewport?2:vh*.4]]){
  document.getElementById(handle)?.style.setProperty('--bump-painting-lead',lead+'px');
 }
 const chapter=document.getElementById('sidekick');
 if(chapter)stops.push({id:'hero-approach',y:Math.min(vh*.45,top(chapter)-vh*1.05)});
 const mobilePainting=document.documentElement.dataset.bumpStableViewport?2:null;
 add('workflow-painting',chapter,mobilePainting??vh*.48);
 add('workflow-execution',document.querySelector('.bump-workflow-execution'),-clearance);
 add('workflow-cloud',document.querySelector('.bump-task-cloud'),-clearance);
 add('software-painting',document.getElementById('online'),mobilePainting??vh*.4);
 const story=document.querySelector('.bump-software-story'),stage=story?.querySelector('.bump-software-stage');
 if(story&&stage){
  const padding=parseFloat(getComputedStyle(story).paddingTop)||0,sticky=parseFloat(getComputedStyle(stage).top)||0;
  const start=top(story)+padding-sticky,travel=Math.max(1,story.clientHeight-padding-stage.offsetHeight);
  for(let i=0;i<4;i++)stops.push({id:'software-story-'+(i+1),y:start+(i?travel*(i/4+.015):1)});
 }
 if(combinedSoftwareDemos())add('software-demos',document.getElementById('software-capabilities'));
 else{
  add('software-operations',document.querySelector('.bsd-section--operations'),-clearance);
  add('software-data',document.querySelector('.bsd-section--data'),-clearance);
 }
 const integration=document.getElementById('software-integration');
 if(integration){const instrument=integration.querySelector('.bump-tools-live')||integration.querySelector('.bic')||integration;add('software-integration',instrument,-Math.max(clearance,(vh-instrument.getBoundingClientRect().height)/2));}
 // Native scroll positions round to device pixels. Land just inside a chapter,
 // rather than rounding before its scene-store boundary and showing old paper.
 add('security-painting',document.getElementById('operations'),2);
 add('security-system',document.getElementById('security-system'));
 for(const id of ['security-audits','security-vulnerabilites','security-remediation','security-suivi'])add(id,document.getElementById(id));
 add('method-painting',document.getElementById('retail'),2);
 const workshop=document.getElementById('method-workshop');
 add('method-workshop',workshop||document.querySelector('.bump-method-demo'),workshop?0:-clearance);
 add('vision-painting',document.getElementById('developer'),2);
 add('vision-sculpture',document.getElementById('vision-sculpture'),-clearance);
 // Keep a complete grid together when it fits. Smaller screens get one
 // readable row per stop, without skipping any service or contact card.
 let lastVision='vision-sculpture',lastCompany='company-manifesto',finalAnchor=null;
 const serviceStops=(section,prefix)=>{
  let last=null;
  for(const grid of section?.querySelectorAll('.bump-services')||[]){
   const cards=[...grid.querySelectorAll('.bump-service')];if(!cards.length)continue;
   const heading=grid.previousElementSibling?.matches('.bump-group-title')?grid.previousElementSibling:null;
   const anchor=heading||cards[0],end=Math.max(...cards.map(card=>top(card)+card.getBoundingClientRect().height));
   if(end-top(anchor)<=vh-clearance-32){
    const id=prefix+'-'+cards[0].id;add(id,anchor,-clearance);last={id,anchor,end};
   }else{
    let previous=-Infinity;
    for(const card of cards){const y=top(card);if(Math.abs(y-previous)<8)continue;previous=y;const target=card===cards[0]&&heading?heading:card,id=prefix+'-'+card.id;add(id,target,-clearance);last={id,anchor:target,end};}
   }
  }
  return last;
 };
 const research=document.getElementById('vision-research-network');
 if(research){add('vision-research-network',research,-clearance);lastVision='vision-research-network';}
 else{const visionEnd=serviceStops(document.getElementById('developer'),'vision');if(visionEnd)lastVision=visionEnd.id;}
 add('company-painting',document.getElementById('b2b'),2);
 const manifesto=document.querySelector('.bump-company-manifesto');
 if(manifesto){const heading=manifesto.previousElementSibling?.matches('.bump-group-title')?manifesto.previousElementSibling:manifesto;add('company-manifesto',heading,-clearance);}
 const companyFlow=document.getElementById('company-connections');
 if(companyFlow){add('company-connections',companyFlow,-clearance);lastCompany='company-connections';finalAnchor={anchor:companyFlow,end:top(companyFlow)+companyFlow.getBoundingClientRect().height};}
 const companyEnd=companyFlow?null:serviceStops(document.getElementById('b2b'),'company');
 if(companyEnd){lastCompany=companyEnd.id;finalAnchor=companyEnd;}
 for(const [id,handle] of [['company-examples','bump-home-examples'],['company-questions','bump-home-questions']]){
  const element=document.getElementById(handle);
  if(element){add(id,element,-clearance);lastCompany=id;finalAnchor={anchor:element,end:top(element)+element.getBoundingClientRect().height};}
 }
 // Landscape and very short phones may need more than one readable screen.
 // Continue inside that same section before exiting; never skip its bottom or
 // reduce the app to illegible text. The four pinned folder stops stay intact.
 const readingEnds=new Map();
 {
  const panels=new Set(['workflow-execution','workflow-cloud','software-operations','software-data','software-integration','security-system','security-audits','security-vulnerabilites','security-remediation','security-suivi','method-workshop','vision-sculpture','vision-research-network','company-manifesto','company-connections','company-examples','company-questions']);
  for(const stop of [...stops]){
   const anchor=anchors.get(stop.id);if(!panels.has(stop.id)||!anchor)continue;
   const element=anchor.querySelector?.('.bump-tools-live,.bump-security-live,.bump-method-live,.bump-vision-live,.bump-port-live,.bump-research')||anchor;
   const end=top(element)+element.getBoundingClientRect().height,last=end-vh+24;
   if(last-stop.y<=64)continue;
   const step=Math.max(160,vh-clearance-80),count=Math.ceil((last-stop.y)/step);
   for(let i=1;i<=count;i++){const id=stop.id+'-detail-'+i;stops.push({id,y:stop.y+(last-stop.y)*i/count,guided:true});readingEnds.set(stop.id,id);}
  }
 }
 const contentEnd=id=>readingEnds.get(id)||id;
 // Give the final contact row enough paper to reach the same landing pose,
 // while making that pose the real bottom of the document, not a blank stop.
 const contactGroup=document.querySelector('#b2b .bump-group-last');
 if(contactGroup&&finalAnchor){const height=finalAnchor.end-top(finalAnchor.anchor),tail=Math.max(companyFlow?0:64,vh-clearance-height)+'px';if(contactGroup.style.getPropertyValue('--bump-contact-tail')!==tail)contactGroup.style.setProperty('--bump-contact-tail',tail);}
 // Lazy chapter bundles may not have mounted yet. Never skip a missing stop:
 // their placeholders retain dimensions, and the list is refreshed at arrival.
 const find=id=>stops.find(item=>item.id===id)?.y;
 // Measure all pairs before changing any padding: absolute layout shifts then
 // cancel out, and one fresh pass gets the new positions for buttons and wheel.
 const ends=['workflow-cloud',integration?'software-integration':combinedSoftwareDemos()?'software-demos':'software-data','security-suivi','method-workshop',lastVision].map(contentEnd);
 const tails=ends.flatMap((id,i)=>{
  const group=document.getElementById(chapterHandles[i+1])?.querySelector?.('.bump-group-last'),next=document.getElementById(chapterHandles[i+2]),last=find(id);
  if(!group||!next||last===undefined)return [];
  const padding=parseFloat(getComputedStyle(group).paddingBottom)||0,contentEnd=top(next)-padding,early=i>=1?.2:0;
  const value=compactChapterTail(vh,last,contentEnd,early);
  return Math.abs(value-padding)>1?[{group,value}]:[];
 });
 if(tails.length&&paddingPass<2){for(const {group,value}of tails)group.style.setProperty('--bump-chapter-tail',value+'px');return getBumpScrollStops(paddingPass+1);}

 blendRanges=chapterHandles.slice(1).map((handle,i)=>{const el=document.getElementById(handle);return el?nativeBlendRange(top(el),el.getBoundingClientRect().height,vh,i>=2?.2:0):{start:Infinity,end:Infinity};});
 const contentEnds=[['workflow-execution','workflow-cloud'],['software-story-1',integration?'software-integration':combinedSoftwareDemos()?'software-demos':'software-data'],['security-system','security-suivi'],['method-workshop','method-workshop'],['vision-sculpture',lastVision],['company-manifesto',lastCompany]].map(([first,last])=>[first,contentEnd(last)]);
 paperRoutes=contentEnds.flatMap(([first,last],i)=>{
  const painting=find(chapterStops[i+1]),firstY=find(first),lastY=find(last),nextPainting=find(chapterStops[i+2]);
  return painting===undefined||firstY===undefined||lastY===undefined?[]:[{painting,first:firstY,last:lastY,nextPainting:nextPainting??null,exitStart:Math.max(lastY,blendRanges[i+1]?.start??Infinity),exitEnd:Math.min(nextPainting??Infinity,blendRanges[i+1]?.end??Infinity)}];
 });
 motionWindows=paperRoutes.flatMap(route=>[{start:route.painting,end:route.first,kind:'paper'},...(route.nextPainting===null?[]:[{start:route.exitStart,end:route.exitEnd,kind:'painting'}])]);
 const sorted=stops.sort((a,b)=>a.y-b.y).filter((item,i,list)=>!i||item.y-list[i-1].y>3);
 // The browser may expose more glass when its toolbar retracts. Keep every
 // section fixed; only the final landing is bounded by the real scroll end.
 const maximum=document.documentElement.scrollHeight-innerHeight;
 if(Number.isFinite(maximum)&&maximum>0&&sorted.at(-1)?.y>maximum)sorted.at(-1).y=maximum;
 return sorted;
}

function isEditing(target){return target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable="true"],[role="slider"],[role="combobox"]');}
function consumesScroll(target,delta){
 for(let el=target instanceof Element?target:null;el&&el!==document.body&&el!==document.documentElement;el=el.parentElement){
  if(el.matches('dialog[open],[role="dialog"],[aria-modal="true"],.bump-hero-search-results'))return true;
  if(el.scrollHeight>el.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)){
   if(delta>0&&el.scrollTop+el.clientHeight<el.scrollHeight-2||delta<0&&el.scrollTop>2)return true;
  }
 }
 return false;
}

export function installBumpAssistedScroll(getLenis,{isReady=()=>true}={}){
 const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let moving=false,navigationBusy=false,disposed=false,lastWheel=-Infinity,settledAt=-Infinity,accumulated=0,pendingBurst=false,frame=0,resizeTimer=0,navigationRun=0,curtain=null,curtainAnimation=null;
 let currentId='home',landedY=scrollY,destination=null,touch=null,stops=[],revision=0,layoutWidth=innerWidth,layoutHeight=getBumpViewportHeight();
 const update=()=>{stops=getBumpScrollStops();root.dataset.bumpScrollStops=String(stops.filter(stop=>stop.guided!==false).length);};
 const announce=()=>{root.dataset.bumpScrollMoving=String(moving||navigationBusy);root.dataset.bumpScrollStop=currentId;};
 const finish=(stop,run)=>{
  if(disposed||run!==revision)return;
  // A lazy figure can replace its placeholder during the journey. Finish at
  // the rendered stop, not at that placeholder's now-obsolete coordinates.
  update();
  if(root.dataset.bumpStableViewport){const live=stops.find(item=>item.id===stop.id);if(live&&Math.abs(scrollY-live.y)>2){const engine=getLenis();if(engine){engine.reset?.();engine.resize?.();engine.scrollTo(live.y,{immediate:true,force:true});}else window.scrollTo({top:live.y,behavior:'instant'});}}
  moving=false;settledAt=performance.now();currentId=stop.id;landedY=scrollY;destination=null;announce();
  window.dispatchEvent(new CustomEvent('bump:scroll-settled',{detail:{id:stop.id}}));
 };
 function go(stop,{immediate=false,interrupt=false}={}){
  if(!stop||moving&&!interrupt)return;
  cancelAnimationFrame(frame);
  const run=++revision,start=scrollY;
  const {duration,easing:journeyEase,paced}=planChapterJourney({from:start,to:stop.y,viewport:getBumpViewportHeight(),windows:motionWindows,firstEntrance:stop.id==='workflow-painting'&&start<stop.y,reduced:reduced.matches||immediate});
  root.dataset.bumpScrollDuration=String(duration);
  root.dataset.bumpScrollPaced=String(paced);
  moving=true;destination=stop;announce();
  const lenis=getLenis();
  if(lenis){
   // A browser focus/hash jump can leave Lenis at an old target. Its immediate
   // path early-returns for that same target, so synchronize its real origin
   // and dimensions before a chapter teleport.
   if(duration===0){lenis.reset?.();lenis.resize?.();}
   // No programmatic section preselection: every intermediate scroll frame
   // must reach the retained scene store, instead of jumping its camera.
   lenis.scrollTo(stop.y,{duration,easing:journeyEase,immediate:duration===0,force:true,lock:true,onComplete:()=>finish(stop,run)});
  }else if(!duration){window.scrollTo({top:stop.y,behavior:'instant'});finish(stop,run);}
  else{
   // Mobile has no Lenis instance. Its existing native scroll observer remains
   // authoritative; this finite journey is its only position writer.
   const started=performance.now();
   const draw=now=>{if(disposed||run!==revision)return;const p=clamp((now-started)/(duration*1000),0,1);window.scrollTo({top:start+(stop.y-start)*journeyEase(p),behavior:'instant'});if(p<1)frame=requestAnimationFrame(draw);else finish(stop,run);};
   frame=requestAnimationFrame(draw);
  }
 }
 function next(direction){
  update();const y=scrollY,guided=stops.filter(stop=>stop.guided!==false),last=guided.at(-1);
  // Lazy figures/fonts can shift a stop after arrival. The next gesture must
  // advance its identity, rather than spending a gesture on that same stop.
  const index=guided.findIndex(stop=>stop.id===currentId);
  if(index>=0&&Math.abs(y-landedY)<3)return guided[index+direction]||null;
  // Free scroll resumes only after the complete defined chapter journey.
  if(!last||direction>0&&y>=last.y-3||y>last.y+getBumpViewportHeight())return null;
  return direction>0?guided.find(stop=>stop.y>y+3):guided.findLast(stop=>stop.y<y-3);
 }
 const swallow=event=>{event.lenisStopPropagation=true;if(event.cancelable)event.preventDefault();};
 function wheel(event){
  if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
  const now=performance.now(),gap=now-lastWheel;
  if(consumesScroll(event.target,event.deltaY)){event.lenisStopPropagation=true;return;}
  if(isEditing(event.target)&&!moving)return;
  if(!isReady()){swallow(event);lastWheel=now;return;}
  if(moving||navigationBusy){swallow(event);lastWheel=now;accumulated=0;pendingBurst=false;return;}
  if(activeGestureScene()?.wheel?.(event)){swallow(event);lastWheel=now;return;}
  const stop=next(Math.sign(event.deltaY));if(!stop)return;
  swallow(event);lastWheel=now;
  // All events in the original burst are discarded, including inertial tails
  // arriving after completion. A quiet gap and a real settled stop re-arm it.
  // Folder changes are short, deliberate steps. The chapter-level 240ms idle
  // plus 180ms landing guard swallowed whole new mouse/trackpad gestures here.
  // Keep rejecting continuous momentum, but re-arm a settled folder sooner.
  const folders=currentId.startsWith('software-story-'),quiet=folders?80:240;
  if((gap<quiet&&!pendingBurst)||!folders&&now-settledAt<180){accumulated=0;pendingBurst=false;return;}
  if(gap>=quiet)accumulated=0;
  pendingBurst=true;
  accumulated+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?getBumpViewportHeight():1);
  if(Math.abs(accumulated)<6)return;
  accumulated=0;pendingBurst=false;go(stop);
 }
 function keydown(event){
  if(event.altKey||event.metaKey||event.ctrlKey||isEditing(event.target)||consumesScroll(event.target,1))return;
  const direction=['ArrowDown','PageDown',' '].includes(event.key)?1:['ArrowUp','PageUp'].includes(event.key)?-1:0;
  if(direction&&(moving||navigationBusy)){swallow(event);return;}
  if(event.target instanceof Element&&event.target.closest('button,a,[role="tab"]')&&event.key===' ')return;
  if(!moving&&!navigationBusy&&activeGestureScene()?.key?.(event)){swallow(event);return;}
  if(event.target instanceof Element&&event.target.closest('[data-bump-local-keys]')&&!['PageDown','PageUp'].includes(event.key))return;
  if(!direction)return;const stop=next(event.shiftKey&&event.key===' '?-1:direction);
  if(moving||navigationBusy||stop){swallow(event);if(!moving&&!navigationBusy&&!event.repeat&&isReady())go(stop);}
 }
 function touchstart(event){
  if(event.touches.length!==1){touch=null;return;}
  const p=event.touches[0];touch={x:p.clientX,y:p.clientY,target:event.target,used:moving||navigationBusy};
  activeGestureScene()?.touchStart?.(event);
 }
 function touchmove(event){
  if(!touch||event.touches.length!==1)return;
  const p=event.touches[0],dx=p.clientX-touch.x,dy=touch.y-p.clientY;
  if(Math.abs(dx)>Math.abs(dy)||consumesScroll(touch.target,dy)||isEditing(touch.target)){event.lenisStopPropagation=true;return;}
  if(touch.used||moving||navigationBusy){swallow(event);event.stopImmediatePropagation?.();return;}
  if(activeGestureScene()?.touchMove?.(event,dy)){swallow(event);return;}
  if(!dy)return;
  const stop=next(Math.sign(dy));
  if(!stop)return;
  // Claim the first vertical move, before the browser begins native momentum.
  // A threshold still separates a deliberate swipe from a tap. One finger
  // gesture owns exactly one stop, even when held through the whole journey.
  swallow(event);
  event.stopImmediatePropagation?.();
  if(Math.abs(dy)<28||!isReady())return;
  touch.used=true;go(stop);
 }
 const touchend=()=>{touch=null;};
 const settleLayout=()=>{
  if(!root.dataset.bumpStableViewport||moving||navigationBusy||!isReady()||isEditing(document.activeElement)||document.querySelector('dialog[open]'))return;
  const start=scrollY;update();const same=stops.find(stop=>stop.id===currentId);
  if(same&&Math.abs(start-landedY)<3&&Math.abs(start-same.y)>2)go(same,{immediate:true,interrupt:true});
 };
 const layoutObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>{cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(settleLayout);}):null;
 let layoutFrame=0;
 if(layoutObserver){for(const node of document.querySelectorAll('.main-wrapper main,[data-section-id]'))layoutObserver.observe(node);}
 document.fonts?.ready.then(()=>{if(!disposed)settleLayout();});
 function resize(){
  const height=getBumpViewportHeight();
  if(layoutWidth===innerWidth&&layoutHeight===height)return;
  layoutWidth=innerWidth;layoutHeight=height;
  clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
  const id=destination?.id||currentId;update();if(navigationBusy)return;const same=stops.find(stop=>stop.id===id);
  if(same&&(moving||Math.abs(scrollY-same.y)<height*.75))go(same,{immediate:true,interrupt:true});
 },180);}
 const navigate=(id,options)=>{
  update();const stop=stops.find(item=>item.id===id);if(!stop)return false;
  window.dispatchEvent(new Event('bump:navigate'));
  accumulated=0;pendingBurst=false;touch=null;
  const run=++navigationRun;
  curtainAnimation?.cancel();curtain?.remove();curtain=null;
  if(options.immediate||reduced.matches||Math.abs(scrollY-stop.y)<3){navigationBusy=false;go(stop,{immediate:true,interrupt:true});return true;}
  // Chapter buttons change scene under a short cinematic veil. They never
  // traverse intervening chapters; wheel/touch journeys remain continuous.
  revision++;cancelAnimationFrame(frame);const engine=getLenis();engine?.reset?.();engine?.scrollTo(scrollY,{immediate:true,force:true});moving=false;navigationBusy=true;announce();
  const veil=document.createElement('div');veil.className='bump-chapter-curtain';veil.setAttribute('aria-hidden','true');veil.dataset.bumpFixedTiming='true';document.body.append(veil);curtain=veil;
  const animate=async()=>{
   try{
    curtainAnimation=veil.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-in',fill:'forwards'});await curtainAnimation.finished;
    if(disposed||run!==navigationRun)return;
    update();go(stops.find(item=>item.id===id)||stop,{immediate:true,interrupt:true});
    // Let the retained compositor draw the destination before revealing it.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    if(disposed||run!==navigationRun)return;
    // Approaching lazy figures may finish mounting under the veil. Use their
    // final layout, exactly as the next wheel gesture's stop planner will.
    update();const finalStop=stops.find(item=>item.id===id);
    if(finalStop&&Math.abs(scrollY-finalStop.y)>1)go(finalStop,{immediate:true,interrupt:true});
    curtainAnimation=veil.animate([{opacity:1},{opacity:0}],{duration:340,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});await curtainAnimation.finished;
   }catch{/* A newer navigation or unmount owns the transition now. */}
   finally{
    veil.remove();if(run===navigationRun){curtain=null;curtainAnimation=null;navigationBusy=false;settledAt=performance.now();announce();}
   }
  };void animate();return true;
 };
 const chapterClick=event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const anchor=event.target instanceof Element?event.target.closest('a[href]'):null;
  if(!anchor||anchor.target&&anchor.target!=='_self'||anchor.hasAttribute('download'))return;
  const url=new URL(anchor.href,location.href);
  if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search||!url.hash)return;
  let handle;try{handle=decodeURIComponent(url.hash.slice(1));}catch{return;}
  const index=chapterHandles.indexOf(handle),target=document.getElementById(handle);
  const aliases={'software-capabilities':combinedSoftwareDemos()?'software-demos':'software-operations','bump-operations-demo':combinedSoftwareDemos()?'software-demos':'software-operations','bump-data-demo':combinedSoftwareDemos()?'software-demos':'software-data',...Object.fromEntries(['vision-workflow-ai','vision-developer-ai','vision-cyber-ai','vision-infrastructure'].map(id=>[id,'vision-research-network']))};
  const id=index>=0?chapterStops[index]:aliases[handle]||target?.closest('.bsc-row')?.id||handle;
  update();if(!stops.some(stop=>stop.id===id))return;
  event.preventDefault();navigate(id,{});
  history.pushState(history.state,'',url.hash);
  target?.focus({preventScroll:true});
 };
 navigateChapter=navigate;
 update();root.dataset.bumpAssistedScroll='true';announce();
 window.addEventListener('wheel',wheel,{passive:false,capture:true});
 window.addEventListener('keydown',keydown,{capture:true});
 window.addEventListener('touchstart',touchstart,{passive:true,capture:true});
 window.addEventListener('touchmove',touchmove,{passive:false,capture:true});
 window.addEventListener('touchend',touchend,{passive:true,capture:true});
 window.addEventListener('touchcancel',touchend,{passive:true,capture:true});
 window.addEventListener('resize',resize);
 window.addEventListener('click',chapterClick);
 return()=>{disposed=true;revision++;navigationRun++;curtainAnimation?.cancel();curtain?.remove();layoutObserver?.disconnect();cancelAnimationFrame(layoutFrame);if(navigateChapter===navigate)navigateChapter=null;cancelAnimationFrame(frame);clearTimeout(resizeTimer);window.removeEventListener('wheel',wheel,true);window.removeEventListener('keydown',keydown,true);window.removeEventListener('touchstart',touchstart,true);window.removeEventListener('touchmove',touchmove,true);window.removeEventListener('touchend',touchend,true);window.removeEventListener('touchcancel',touchend,true);window.removeEventListener('resize',resize);window.removeEventListener('click',chapterClick);delete root.dataset.bumpAssistedScroll;};
}
