import {getBumpViewportHeight} from './viewport.js';
// A glimpse during a chapter journey is not an arrival. All timed demos share
// this gate; the existing assisted controller remains the sole scroll owner.
export function demoInViewport(bounds,{height,assisted}){
 if(bounds.width<=0||bounds.height<=0)return false;
 const top=assisted?72:0,bottom=height-16,visible=Math.max(0,Math.min(bottom,bounds.bottom)-Math.max(top,bounds.top));
 return visible>=Math.min(bounds.height,bottom-top)*.65;
}
export function demoIsReady(bounds,{height,opening,assisted,moving,hidden}){
 if(hidden||moving==='true'||opening&&opening!=='scene')return false;
 return demoInViewport(bounds,{height,assisted});
}

export function observeDemoReady(node,onChange,{onViewportChange,onReenter}={}){
 if(!node)return()=>{};
 let ready=null,intersecting=null,disposed=false,entered=false,departed=false;
 const root=document.documentElement;
 const update=()=>{
  if(disposed)return;
  const bounds=node.getBoundingClientRect(),options={height:getBumpViewportHeight(),opening:root.dataset.bumpOpening,assisted:root.dataset.bumpAssistedScroll==='true',moving:root.dataset.bumpScrollMoving,hidden:document.hidden};
  const inViewport=demoInViewport(bounds,options);
  if(!inViewport&&entered)departed=true;
  if(inViewport!==intersecting){intersecting=inViewport;onViewportChange?.(inViewport);}
  const next=demoIsReady(bounds,options);
  if(next){const returned=entered&&departed;entered=true;departed=false;if(returned)onReenter?.();}
  node.dataset.bumpDemoReady=String(next);
  if(next!==ready){ready=next;onChange(next);}
 };
 const io=new IntersectionObserver(update,{threshold:[0,.18,.5,.65,.85,1]});io.observe(node);
 const state=new MutationObserver(update);state.observe(root,{attributes:true,attributeFilter:['data-bump-scroll-moving','data-bump-opening']});
 window.addEventListener('bump:scroll-settled',update);window.addEventListener('resize',update);document.addEventListener('visibilitychange',update);update();
 return()=>{disposed=true;io.disconnect();state.disconnect();window.removeEventListener('bump:scroll-settled',update);window.removeEventListener('resize',update);document.removeEventListener('visibilitychange',update);};
}

// Timeline holds are separate from mechanical speed. Start promptly, leave a
// brief explanation, then continue; actual visitor input retains its grace.
export const DEMO_START_MS=3200;
export const DEMO_REPLAY_MS=4500;
export function demoReadingMs(title,detail){
 const words=(title+' '+detail).trim().split(/\s+/).length;
 return Math.min(5800,Math.max(3800,words*150));
}
