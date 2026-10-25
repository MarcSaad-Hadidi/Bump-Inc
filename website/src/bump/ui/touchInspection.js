import {setDemoInspectionPaused} from './demoTransport.js';

// The desktop annotation registry is also the touch target registry. A tap
// holds the existing explanation open; another tap or a swipe releases it.
// Native model geometry, click actions and all desktop hover handlers stay intact.
export function installTouchInspection(doc=document,win=window){
 if(doc.documentElement.dataset.bumpTouchInspection)return()=>{};
 doc.documentElement.dataset.bumpTouchInspection='true';
 let active=null,run=0;
 const send=(part,type,point)=>part.dispatchEvent(new win.PointerEvent(type,{bubbles:true,pointerType:'mouse',clientX:point.x,clientY:point.y}));
 const release=()=>{run++;const previous=active;active=null;if(previous){delete previous.root.dataset.bumpTouchInspected;send(previous.part,'pointerleave',previous);setDemoInspectionPaused(previous.root,false);}};
 const down=event=>{
  if(event.pointerType!=='touch')return;
  const part=event.target.closest?.('[data-bump-info]'),root=part?.closest('.bump-workflow-import,.bump-tools-import,.bump-security-import,.bump-method-import,.bump-vision-import,.bump-port-import');
  const same=active?.part===part,point={x:event.clientX,y:event.clientY};release();if(!root)return;
  if(same){const pending=run;queueMicrotask(()=>{if(run===pending)send(part,'pointerleave',point);});return;}
  active={part,root,x:event.clientX,y:event.clientY};root.dataset.bumpTouchInspected='true';
  const pending=++run;
  // Let each adapter's original pointerdown/click finish before entering the
  // very same hover path used by the desktop and the introductory cursor.
  queueMicrotask(()=>{if(run!==pending||!active)return;send(part,'pointerenter',active);send(event.target,'pointermove',active);setDemoInspectionPaused(root,true);});
 };
 const leave=event=>{if(event.pointerType==='touch'&&active?.root.contains(event.target))event.stopImmediatePropagation();};
 const move=event=>{if(active&&event.pointerType==='touch'&&Math.hypot(event.clientX-active.x,event.clientY-active.y)>8)release();};
 const key=event=>{if(event.key==='Escape')release();};
 doc.addEventListener('pointerdown',down,true);doc.addEventListener('pointerleave',leave,true);doc.addEventListener('pointermove',move,true);doc.addEventListener('pointercancel',release,true);doc.addEventListener('keydown',key);
 win.addEventListener('scroll',release,{passive:true});win.addEventListener('resize',release);
 return()=>{release();doc.removeEventListener('pointerdown',down,true);doc.removeEventListener('pointerleave',leave,true);doc.removeEventListener('pointermove',move,true);doc.removeEventListener('pointercancel',release,true);doc.removeEventListener('keydown',key);win.removeEventListener('scroll',release);win.removeEventListener('resize',release);delete doc.documentElement.dataset.bumpTouchInspection;};
}
