import {createDemoTimeout,demoIsPaused,setDemoInspectionPaused} from './demoTransport.js';
import {observeDemoReady} from './demoReady.js';

const highlighted=new WeakMap();
export function highlightHoveredPart(root,part){
 const previous=highlighted.get(root);if(previous===part)return;
 previous?.removeAttribute('data-bump-demo-hover');
 if(part){part.setAttribute('data-bump-demo-hover','true');highlighted.set(root,part);}else highlighted.delete(root);
}

const targets={
 // The annotation adapters register exactly the parts that open real tips.
 // Adding an explanation also adds its stop to the introductory journey.
 workflow:['[data-bump-info]'],integration:['[data-bump-info]'],
 security:['[data-bump-info]'],method:['[data-bump-info]'],vision:['[data-bump-info]'],
 port:Array.from({length:6},(_,i)=>`[data-cargo="${i}"] [data-need]`),
 'company-flow':['.company-flow-pill[data-selected="true"]','.company-flow-hub']
};

// A finite introduction to the real hover affordances. Native model clocks,
// chapter scrolling and approval clicks keep their existing owners.
export function mountHoverDemonstration(root,kind){
 const selectors=targets[kind];if(!root||!selectors)return()=>{};
 const media=matchMedia('(prefers-reduced-motion: reduce)'),cursor=document.createElement('span');
 cursor.className='bump-demo-cursor bump-demo-hover-cursor';cursor.hidden=true;cursor.setAttribute('aria-hidden','true');
 cursor.innerHTML='<svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg>';root.append(cursor);
 let visible=false,disposed=false,completed=false,hovered=null,manualUntil=0,current=null,index=0,frame=0,run=[],visited=[];
 const completion=value=>{completed=value;root.dataset.bumpHoverComplete=String(value);};completion(false);
 const allowed=()=>visible&&!disposed&&!media.matches&&!document.hidden&&!demoIsPaused(root);
 // The model waits, while this one finite cursor timer keeps visiting parts.
 const timer=createDemoTimeout(root,allowed,{ignoreInspection:true});
 const leave=()=>{if(!current)return;current.removeAttribute('data-bump-demo-hover');current.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));current.closest('svg')?.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));current.dispatchEvent(new CustomEvent('bump:demo-inspect',{bubbles:true,detail:{active:false}}));current=null;};
 const stop=()=>{timer.clear();cancelAnimationFrame(frame);leave();cursor.hidden=true;root.dataset.bumpHoverDemo='idle';setDemoInspectionPaused(root,false);};
 const bounds=element=>(kind==='security'?element.querySelector(':scope > .iso-solid > .iso-fill')||element:kind==='port'?element.querySelector('.port-cargo-label')||element:element).getBoundingClientRect();
 const inspect=element=>{element.setAttribute('data-bump-demo-hover','true');const b=bounds(element),init={bubbles:true,pointerType:'mouse',clientX:b.left+b.width*.5,clientY:b.top+b.height*.5};element.dispatchEvent(new PointerEvent('pointerenter',{...init,bubbles:false}));element.dispatchEvent(new PointerEvent('pointermove',init));element.dispatchEvent(new CustomEvent('bump:demo-inspect',{bubbles:true,detail:{active:true}}));};
 const point=(element,approach=false)=>{const b=bounds(element),h=root.getBoundingClientRect();cursor.style.left=(b.left-h.left+b.width*.5-3-(approach?52:0))+'px';cursor.style.top=(b.top-h.top+b.height*.5-2+(approach?34:0))+'px';};
 const busy=()=>!!root.querySelector('[data-workflow-cursor="approach"],[data-workflow-cursor="click"],[data-tools-cursor="approach"],[data-tools-cursor="click"],[data-security-cursor="approach"],[data-security-cursor="click"]');
 function visit(){
  if(!allowed()||busy()){stop();return;}
  leave();current=run[index++];if(!current){completion(true);stop();return;}
  setDemoInspectionPaused(root,true);
  const first=cursor.hidden;cursor.hidden=false;root.dataset.bumpHoverDemo='moving';point(current,first);
  if(first)frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{if(current)point(current);});});
  timer.schedule(380,()=>{
   if(!current)return;root.dataset.bumpHoverDemo='hovering';inspect(current);visited.push(current.closest('[data-cargo]')?.getAttribute('data-cargo')??String(index-1));root.dataset.bumpHoverVisited=visited.join(',');
   timer.schedule(1300,visit);
  });
 }
 function begin(){
  if(!allowed()||completed||hovered||root.dataset.bumpTouchInspected==='true')return;
  if(performance.now()<manualUntil){timer.schedule(manualUntil-performance.now(),begin);return;}
  if(busy()){stop();timer.schedule(600,begin);return;}
  if(kind==='security'){
   const vault=root.querySelector('[data-security-stage]'),readout=vault?.querySelector('[data-readout]')?.textContent||'';
   if(!root.querySelector('[data-security-assembly="false"]')||!vault||Number(vault.dataset.securityStage)<1||Number(vault.dataset.securityStage)>6||readout.includes('→')){timer.schedule(200,begin);return;}
  }
  if(kind==='vision'){
   const vision=root.querySelector('[data-vision-stage]');
   // The lenses begin above their sockets with zero opacity. Wait for the
   // alignment phase to settle before aiming at those physical parts.
   if(!vision||Number(vision.dataset.visionStage)<1||vision.querySelector('[data-readout]')?.textContent.includes('→')){timer.schedule(200,begin);return;}
  }
  if(kind==='port'){
   const port=root.querySelector('.bump-port-live');
   if(!port||port.dataset.portLoaded!=='6'||Number(port.dataset.portStage)!==3){timer.schedule(200,begin);return;}
  }
  run=[...new Set(selectors.flatMap(selector=>[...root.querySelectorAll(selector)]))].filter(element=>{const b=element.getBoundingClientRect();return b.width>0&&b.height>0;});
  if(kind==='port'&&(run.length!==6||run.some(element=>!element.querySelector('.port-cargo-label')))){timer.schedule(200,begin);return;}
  if(!run.length){timer.schedule(200,begin);return;}index=0;visited=[];root.dataset.bumpHoverVisited='';visit();
 }
 const interactive='[data-bump-info],[data-card],[data-tool],[data-adapter],[data-drawer],[data-need],[data-dome],[data-knob],.company-flow-pill,.company-flow-hub';
 const user=event=>{if(!event.isTrusted)return;const part=event.target?.closest?.(interactive)||null;
  if(event.type==='pointermove'&&!part){if(hovered){hovered=null;manualUntil=performance.now()+6000;if(!completed){stop();timer.schedule(6000,begin);}}return;}
  hovered=event.type==='pointermove'?part:null;manualUntil=performance.now()+(event.type==='pointermove'?6000:30000);stop();if(hovered)inspect(hovered);if(!completed&&!hovered)timer.schedule(30000,begin);
 };
 const userLeave=event=>{if(!event.isTrusted||!hovered)return;if(event.relatedTarget?.closest?.(interactive)===hovered)return;hovered=null;manualUntil=performance.now()+6000;if(!completed){stop();timer.schedule(6000,begin);}};
 for(const name of ['pointermove','pointerdown','keydown'])root.addEventListener(name,user,true);
 root.addEventListener('pointerout',userLeave,true);
 const observer=new MutationObserver(()=>{if(busy()){stop();if(!completed)timer.schedule(600,begin);}else if(kind==='port'&&completed&&root.querySelector('.bump-port-live')?.dataset.portStage==='0'){completion(false);timer.schedule(800,begin);}});observer.observe(root,{subtree:true,attributes:true,attributeFilter:['data-workflow-cursor','data-tools-cursor','data-security-cursor','data-port-stage']});
 const stopReady=observeDemoReady(root,ready=>{visible=ready;stop();if(ready){completion(false);hovered=null;manualUntil=0;timer.schedule(800,begin);}});
 const motion=()=>{stop();if(visible&&!media.matches){completion(false);hovered=null;manualUntil=0;timer.schedule(800,begin);}};media.addEventListener('change',motion);
 return()=>{disposed=true;stop();timer.destroy();stopReady();observer.disconnect();media.removeEventListener('change',motion);for(const name of ['pointermove','pointerdown','keydown'])root.removeEventListener(name,user,true);root.removeEventListener('pointerout',userLeave,true);cursor.remove();};
}
