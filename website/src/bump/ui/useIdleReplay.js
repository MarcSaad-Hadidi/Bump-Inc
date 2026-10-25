import {r as React} from '/runtime/assets/components-BdJai906.js';

// One cancellable idle timeout per visible demo. Activity extends the deadline;
// pointer holds and editable focus protect unfinished visitor input indefinitely.
export function useIdleReplay({root,visible,intersecting,foreground=true,reduced,finished,interrupted=false,manualPaused=false,canRestart=true,onReplay,restMs=3000,idleMs=30000}){
 const state=React.useRef({timer:null,touched:false,lastActivity:0,finishedAt:0,wasFinished:false,wasVisible:false,viewportExited:false,hasEntered:false,pointers:new Set()});
 const current=React.useRef(null),schedule=React.useRef(()=>{});
 current.current={visible,intersecting,foreground,reduced,finished,interrupted,manualPaused,canRestart,onReplay,restMs,idleMs};
 schedule.current=()=>{
  const s=state.current,c=current.current,node=root.current;
  clearTimeout(s.timer);s.timer=null;
  if(!node)return;
  const eligible=c.visible&&c.foreground&&!c.reduced&&!c.manualPaused&&(c.finished||c.interrupted);
  if(!eligible){node.dataset.replayState=c.manualPaused?'paused':'inactive';return;}
  const focused=document.activeElement;let selectOpen=false;
  try{selectOpen=focused?.matches('select:open')??false;}catch{}
  const editing=node.contains(focused)&&(focused.matches('input,textarea,[contenteditable="true"],[role="textbox"]')||selectOpen);
  if(s.pointers.size||editing){node.dataset.replayState='interacting';return;}
  if(!c.canRestart){node.dataset.replayState='queued';return;}
  const deadline=Math.max(c.finished?s.finishedAt+c.restMs:0,s.touched?s.lastActivity+c.idleMs:0);
  node.dataset.replayState='waiting';
  s.timer=setTimeout(()=>{
   const now=performance.now(),latest=current.current;
   const remaining=Math.max(latest.finished?s.finishedAt+latest.restMs:0,s.touched?s.lastActivity+latest.idleMs:0)-now;
   if(remaining>1){schedule.current();return;}
   s.timer=null;s.touched=false;s.finishedAt=0;latest.onReplay();
  },Math.max(16,deadline-performance.now()));
 };
 React.useEffect(()=>{
  const s=state.current,now=performance.now(),inView=visible&&foreground;
  if(!intersecting&&s.hasEntered)s.viewportExited=true;
  const returned=inView&&intersecting&&s.viewportExited&&s.hasEntered;
  if(inView&&intersecting){s.hasEntered=true;s.viewportExited=false;}
  const focused=document.activeElement,node=root.current;
  const editing=node?.contains(focused)&&focused?.matches('input,textarea,[contenteditable="true"],[role="textbox"]');
  if(returned&&!reduced&&!manualPaused&&!editing&&!s.pointers.size){
   clearTimeout(s.timer);s.timer=null;s.touched=false;s.finishedAt=0;
   s.wasVisible=inView;s.wasFinished=false;
   queueMicrotask(()=>{const c=current.current;if(c.visible&&c.intersecting&&c.foreground&&!c.reduced&&!c.manualPaused)c.onReplay();});
   return;
  }
  if(finished&&!s.wasFinished)s.finishedAt=now;
  if(!finished)s.finishedAt=0;
  if(interrupted&&!s.touched){s.touched=true;s.lastActivity=now;}
  // Time away never consumes the visitor's reading/interaction grace period.
  if(inView&&!s.wasVisible){if(finished)s.finishedAt=now;if(s.touched)s.lastActivity=now;}
  s.wasVisible=inView;s.wasFinished=finished;schedule.current();
  return()=>{clearTimeout(s.timer);s.timer=null;};
 },[root,visible,intersecting,foreground,reduced,finished,interrupted,manualPaused,canRestart,restMs,idleMs]);
 React.useEffect(()=>{
  const node=root.current;if(!node)return;const s=state.current;
  const activity=()=>{s.touched=true;s.lastActivity=performance.now();if(!s.timer)schedule.current();};
  const down=e=>{s.pointers.add(e.pointerId);activity();schedule.current();};
  const up=e=>{if(!s.pointers.delete(e.pointerId))return;activity();schedule.current();};
  const focus=()=>{activity();schedule.current();};
  const blur=()=>queueMicrotask(()=>{activity();schedule.current();});
  const hidden=()=>{if(document.hidden){s.pointers.clear();clearTimeout(s.timer);s.timer=null;}};
  const events=['keydown','input','change','click'];
  for(const event of events)node.addEventListener(event,activity,{passive:true});
  node.addEventListener('pointerdown',down);node.addEventListener('focusin',focus);node.addEventListener('focusout',blur);
  document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);document.addEventListener('visibilitychange',hidden);
  return()=>{clearTimeout(s.timer);s.timer=null;for(const event of events)node.removeEventListener(event,activity);node.removeEventListener('pointerdown',down);node.removeEventListener('focusin',focus);node.removeEventListener('focusout',blur);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);document.removeEventListener('visibilitychange',hidden);};
 },[root]);
}
