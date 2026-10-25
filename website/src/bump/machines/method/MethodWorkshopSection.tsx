import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Observer} from 'gsap/Observer';
import gsap from 'gsap';
import {registerBumpGestureScene} from '/runtime/assets/BumpAssistedScroll.js';
import {MethodWorkshop,type MethodWorkshopController} from './MethodWorkshop';

gsap.registerPlugin(Observer);

// Observer reads only gestures explicitly handed over by the site's one
// capture owner. It never owns page position, body overflow or another scroller.
export function MethodWorkshopSection(){
 const host=useRef<HTMLDivElement>(null),[api,setApi]=useState<MethodWorkshopController|null>(null);
 const controller=useCallback((value:MethodWorkshopController|null)=>setApi(value),[]);
 useEffect(()=>{
  const node=host.current;if(!api||!node)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let eligible=false,released=false,navigating=false,previousTop=Infinity,lastWheel=-Infinity,wheelUsed=true,wheelAmount=0,touchUsed=false,frame=0;
  let pending:{event:Event;direction:number}|null=null;
  const canObserve=()=>eligible&&!released&&!reduced.matches;
  const observer=Observer.create({target:window,type:'wheel,touch',preventDefault:false,debounce:false,tolerance:.001,
   ignore:'input,textarea,select,[contenteditable="true"],[role="slider"]',
   // A request belongs to this exact native event. An ignored/under-threshold
   // event must never leave a queued phase for another gesture to execute.
   onChangeY:self=>{const request=pending;pending=null;if(!canObserve()||!request||request.event!==self.event||api.getBusy())return;api.goTo(api.getStage()+request.direction);}
  });observer.disable();
  // The root owner supplies the gesture threshold; Observer must accept its
  // handed event even when the final incremental trackpad/touch delta is small.
  const clearGesture=()=>{pending=null;wheelAmount=0;wheelUsed=true;touchUsed=true;};
  const release=()=>{released=true;clearGesture();observer.disable();api.setActive(false);};
  const boundary=(direction:number)=>(direction<0&&api.getStage()===0)||(direction>0&&api.getStage()===4);
  const consumeKey=(event:KeyboardEvent)=>{event.stopPropagation();return true;};
  const scene={
   isActive:()=>eligible&&!released,
   wheel:(event:WheelEvent)=>{
    pending=null;
    if(reduced.matches)return false;
    const now=performance.now(),fresh=now-lastWheel>=250;lastWheel=now;
    if(api.getBusy()){wheelUsed=true;wheelAmount=0;return true;}
    if(fresh){wheelUsed=false;wheelAmount=0;}
    if(wheelUsed)return true;
    // Release on the first event at an edge so the global owner's own burst
    // accumulator can perform the section exit, including tiny trackpad deltas.
    const direction=Math.sign(event.deltaY);if(boundary(direction)){release();return false;}
    wheelAmount+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    if(Math.abs(wheelAmount)<6)return true;
    wheelUsed=true;pending={event,direction:Math.sign(wheelAmount)};wheelAmount=0;return true;
   },
   touchStart:()=>{pending=null;touchUsed=api.getBusy();},
   touchMove:(event:TouchEvent,delta:number)=>{
    pending=null;
    if(reduced.matches)return false;
    if(api.getBusy()){touchUsed=true;return true;}
    if(touchUsed||Math.abs(delta)<28)return true;
    const direction=Math.sign(delta);if(boundary(direction)){release();return false;}
    touchUsed=true;pending={event,direction};return true;
   },
   key:(event:KeyboardEvent)=>{
    const direction=['ArrowDown','PageDown',' '].includes(event.key)?(event.shiftKey&&event.key===' '?-1:1):['ArrowUp','PageUp'].includes(event.key)?-1:0;
    if(!direction)return false;
    if(api.getBusy()||event.repeat)return consumeKey(event);
    if(boundary(direction)){release();return false;}
    api.goTo(api.getStage()+direction);return consumeKey(event);
   }
  };
  const unregister=registerBumpGestureScene(scene);
  const draw=()=>{
   frame=0;const b=node.getBoundingClientRect(),anchored=Math.abs(b.top)<5&&b.bottom>=innerHeight-3;
   if(Math.abs(b.top)>35){released=false;navigating=false;}
   if(anchored&&!eligible&&(!released||navigating)){
    api.finish();api.goTo(previousTop<0?4:0,{immediate:true});lastWheel=performance.now();clearGesture();
   }else if(!anchored&&eligible){clearGesture();observer.disable();api.finish();}
   eligible=anchored;previousTop=b.top;
   api.setActive(eligible&&!released);
   if(canObserve())observer.enable();else observer.disable();
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  const resize=()=>{clearGesture();api.finish();schedule();};
  const navigate=()=>{navigating=true;release();api.finish();};
  const settled=(event:Event)=>{if(navigating&&(event as CustomEvent).detail?.id==='method-workshop'){released=false;navigating=false;schedule();}};
  const still=()=>{clearGesture();api.finish();schedule();};
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',resize);draw();
  window.addEventListener('bump:navigate',navigate);window.addEventListener('bump:scroll-settled',settled);reduced.addEventListener('change',still);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',resize);window.removeEventListener('bump:navigate',navigate);window.removeEventListener('bump:scroll-settled',settled);reduced.removeEventListener('change',still);observer.kill();unregister();api.finish();api.setActive(false);};
 },[api]);
 return <div ref={host} className="bump-method-capture"><MethodWorkshop onController={controller}/></div>;
}
