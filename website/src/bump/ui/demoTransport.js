const installed=new WeakSet();
const selector='[data-bump-transport]';
export const demoTransportRoot=node=>node?.closest?.(selector)||node;
export const demoIsPaused=node=>demoTransportRoot(node)?.dataset?.bumpDemoPaused==='true';
export const demoTimelineIsPaused=node=>demoIsPaused(node)||demoTransportRoot(node)?.dataset?.bumpDemoInspecting==='true';
export function setDemoInspectionPaused(node,paused){
 const root=demoTransportRoot(node);if(!root||root.dataset.bumpDemoInspecting===String(paused))return;
 root.dataset.bumpDemoInspecting=String(paused);root.dispatchEvent(new CustomEvent('bump:demo-inspection',{detail:{paused}}));
}
export function observeDemoPaused(node,changed,{ignoreInspection=false}={}){
 const root=demoTransportRoot(node);if(!root)return()=>{};
 const update=()=>changed((ignoreInspection?demoIsPaused:demoTimelineIsPaused)(root));root.addEventListener('bump:demo-pause',update);if(!ignoreInspection)root.addEventListener('bump:demo-inspection',update);update();
 return()=>{root.removeEventListener('bump:demo-pause',update);root.removeEventListener('bump:demo-inspection',update);};
}
export function mountDemoTransport(root,label='la démonstration'){
 if(!root||installed.has(root))return()=>{};installed.add(root);
 root.dataset.bumpTransport='true';root.dataset.bumpDemoPaused='false';
 const button=document.createElement('button');button.type='button';button.className='bump-demo-toggle';
 // All six imported models share one placement owner. Anchor beside the
 // actual local heading, including when a lazy figure mounts or text wraps.
 let heading=null;
 const headings='.bump-controls,.bump-tools-heading,.bump-security-heading,.bump-method-heading,.bump-vision-heading,.bump-port-heading';
 const place=()=>{
  const target=root.querySelector?.(headings);
  if(!target){button.hidden=!!root.dataset.bumpMachine;return;}
  if(target!==heading){if(heading){heading.classList.remove('bump-demo-heading');resize?.unobserve(heading);}heading=target;heading.classList.add('bump-demo-heading');resize?.observe(heading);}
  const host=root.getBoundingClientRect(),box=heading.getBoundingClientRect(),nav=document.querySelector('.bump-header')?.getBoundingClientRect();
  button.hidden=false;button.style.top=Math.max(box.top-host.top+(box.height-(button.offsetHeight||32))/2,(nav?.bottom??60)+20-Math.max(0,host.top))+'px';button.style.right=Math.max(0,host.right-box.right)+'px';
 };
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(place):null;
 const content=typeof MutationObserver==='function'?new MutationObserver(place):null;
 const icon=paused=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paused?'m8 5 11 7-11 7z':'M8 5v14M16 5v14')+'"/></svg>';
 const paint=()=>{const paused=demoIsPaused(root);button.innerHTML=icon(paused);button.setAttribute('aria-label',(paused?'Reprendre ':'Mettre en pause ')+label);button.setAttribute('aria-pressed',String(paused));};
 const click=()=>{const paused=!demoIsPaused(root);root.dataset.bumpDemoPaused=String(paused);paint();root.dispatchEvent(new CustomEvent('bump:demo-pause',{detail:{paused}}));};
 // The supplied figures also bind Space locally. Keep one pause owner for
 // their model clocks, host deadlines, cursor tour and visible transport icon.
 const keydown=event=>{
  if(event.key!==' '||!event.target?.closest?.('.iso-stage')||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  event.preventDefault();event.stopPropagation();if(!event.repeat)click();
 };
 root.addEventListener('keydown',keydown,true);
 button.addEventListener('click',click);root.append(button);paint();
 resize?.observe(root);content?.observe(root,{childList:true});window.addEventListener('resize',place);window.addEventListener('bump:scroll-settled',place);place();
 return()=>{installed.delete(root);resize?.disconnect();content?.disconnect();heading?.classList.remove('bump-demo-heading');window.removeEventListener('resize',place);window.removeEventListener('bump:scroll-settled',place);root.removeEventListener('keydown',keydown,true);button.removeEventListener('click',click);button.remove();delete root.dataset.bumpTransport;delete root.dataset.bumpDemoPaused;};
}
// Preserve the remaining reading/approval delay through a user or inspection pause.
// The existing native clock still owns every rendered animation frame.
export function createDemoTimeout(root,allowed=()=>true,{ignoreInspection=false}={}){
 let timer=0,callback=null,remaining=0,deadline=0,disposed=false,suspended=false;
 const isPaused=()=>suspended||(ignoreInspection?demoIsPaused:demoTimelineIsPaused)(root);
 const arm=()=>{if(disposed||!callback||isPaused())return;deadline=performance.now()+remaining;timer=setTimeout(()=>{timer=0;const fn=callback;callback=null;if(allowed())fn?.();},remaining);};
 const update=()=>{if(isPaused()&&timer){remaining=Math.max(0,deadline-performance.now());clearTimeout(timer);timer=0;}else if(!isPaused()&&callback&&!timer)arm();};
 const stop=observeDemoPaused(root,update,{ignoreInspection});
 const clear=()=>{clearTimeout(timer);timer=0;callback=null;remaining=0;};
 return{get pending(){return callback!==null;},schedule(ms,fn){if(callback||disposed)return;remaining=ms;callback=fn;arm();},suspend(){suspended=true;update();},resume(){suspended=false;update();},clear,destroy(){disposed=true;clear();stop();}};
}
