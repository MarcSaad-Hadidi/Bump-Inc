import {createDemoTimeout,demoIsPaused} from '../ui/demoTransport.js';
import {observeDemoReady} from '../ui/demoReady.js';
import {motionMilliseconds} from '../ui/playback.js';

// One continuous visitor journey, using the actual tile controls. A single
// cancellable timeout yields to the real user; the illustration owns its RAF.
const journey=[
 {tile:0,hold:2600},
 {tile:1,hold:2600},
 {tile:3,action:'off',hold:2600},
 {tile:4,hold:3000},
 {tile:0,action:'off',hold:2200},
 {tile:3,action:'on',hold:2600},
 {tile:5,hold:3000},
 {tile:0,action:'on',hold:2200},
 {tile:2,hold:2600}
];
export function mountBeamDemonstration(root){
 const media=matchMedia('(prefers-reduced-motion: reduce)'),pointer=document.createElement('span'),ring=document.createElement('i');
 pointer.className='bump-demo-cursor';pointer.innerHTML='<svg viewBox="0 0 28 32"><path d="m3 2 20 17-9 1-4 9z"/></svg>';ring.className='bump-demo-click';
 for(const el of [pointer,ring]){el.hidden=true;el.setAttribute('aria-hidden','true');root.append(el);}
 let visible=false,disposed=false,frame=0,manualUntil=0,hovered=null,target=null,step=0;
 const changed=new Set();
 const allowed=()=>!disposed&&visible&&!media.matches&&!document.hidden&&!hovered&&performance.now()>=manualUntil&&!demoIsPaused(root);
 const timer=createDemoTimeout(root,allowed),later=(ms,fn)=>{timer.clear();timer.schedule(ms,fn);};
 const inspect=active=>target?.dispatchEvent(new CustomEvent('bump:beam-inspect',{bubbles:true,detail:{active}}));
 const leave=()=>inspect(false);
 const restore=preserve=>{for(const node of changed){if(node===preserve)continue;if(node.getAttribute('aria-pressed')==='false')node.click();changed.delete(node);}};
 const clear=preserve=>{timer.clear();cancelAnimationFrame(frame);restore(preserve);leave();target=null;pointer.hidden=true;ring.hidden=true;root.dataset.beamCursor='none';};
 const point=approach=>{if(!target)return;const b=target.getBoundingClientRect(),r=root.getBoundingClientRect(),x=b.left-r.left+b.width*.55,y=b.top-r.top+b.height*.55;pointer.style.left=x-(approach?65:0)+'px';pointer.style.top=y+(approach?42:0)+'px';ring.style.left=x-11+'px';ring.style.top=y-10+'px';};
 const schedule=(delay=1400)=>{if(disposed||!visible||media.matches||hovered)return;later(Math.max(delay,manualUntil-performance.now()),()=>{step=0;visit();});};
 function visit(){
  const item=journey[step],nodes=[...root.querySelectorAll('.ui-ib__tool')];
  if(!item||!nodes.length){clear();schedule(7000);return;}
  leave();target=nodes[item.tile];ring.hidden=true;root.dataset.beamJourneyStep=String(step);root.dataset.beamCursor='move';
  const first=pointer.hidden;pointer.hidden=false;
  if(first){point(true);frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>point(false));});}else point(false);
  later(motionMilliseconds(800),()=>{
   // Share the real React inspection state. Synthetic pointer events cannot
   // activate CSS :hover, so merely moving a drawn cursor was not sufficient.
   inspect(true);root.dataset.beamCursor='hover';
   later(item.action?900:item.hold,()=>{
    if(item.action){const on=target.getAttribute('aria-pressed')==='true';
     if(item.action==='off'&&on){target.click();changed.add(target);ring.hidden=false;root.dataset.beamCursor='click';}
     else if(item.action==='on'&&changed.has(target)){if(!on)target.click();changed.delete(target);ring.hidden=false;root.dataset.beamCursor='click';}
     later(item.hold,()=>{step++;visit();});
    }else{step++;visit();}
   });
  });
 }
 const user=e=>{if(!e.isTrusted)return;
  const node=e.target.closest?.('.ui-ib__tool'),activating=e.type==='pointerdown'&&(e.button===undefined||e.button===0)||e.type==='keydown'&&['Enter',' '].includes(e.key);
  // The pending real click owns this tile. Restoring it first would toggle it
  // twice; other demonstration changes still return to their original state.
  if(activating&&node)changed.delete(node);
  clear();manualUntil=performance.now()+30000;schedule();
 };
 const over=e=>{if(!e.isTrusted)return;const node=e.target.closest?.('.ui-ib__tool');if(!node)return;hovered=node;clear(node);};
 const out=e=>{if(!e.isTrusted||!hovered)return;if(e.relatedTarget?.closest?.('.ui-ib__tool')===hovered)return;hovered=null;restore();schedule();};
 const change=()=>{clear();schedule();};
 root.addEventListener('pointerdown',user,true);root.addEventListener('keydown',user,true);root.addEventListener('pointerover',over,true);root.addEventListener('pointerout',out,true);media.addEventListener('change',change);
 const stop=observeDemoReady(root,next=>{visible=next;clear();if(next)schedule();});
 return()=>{disposed=true;clear();timer.destroy();stop();media.removeEventListener('change',change);root.removeEventListener('pointerdown',user,true);root.removeEventListener('keydown',user,true);root.removeEventListener('pointerover',over,true);root.removeEventListener('pointerout',out,true);pointer.remove();ring.remove();};
}
