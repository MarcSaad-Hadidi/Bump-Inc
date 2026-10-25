import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {animate,useMotionValue} from 'motion/react';
import {useIdleReplay} from '../ui/useIdleReplay.js';
import {BUMP_SCENARIO_RATE} from '/runtime/assets/BumpPlayback.js';
import {observeDemoReady} from '../ui/demoReady.js';

const queue=new Map(),listeners=new Set();let owner=null,preferred=null;
const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
const snapshot=()=>owner;
function select(){const next=queue.get(preferred)?preferred:[...queue].filter(([,ready])=>ready).map(([id])=>id).sort((a,b)=>a-b)[0]??null;if(next!==owner){owner=next;listeners.forEach(fn=>fn());}}

// One finite Motion clock per demonstration. Discrete React checkpoints and
// continuous SVG signals share it, including pause, seek and reduced motion.
export function useSecurityScenario(id,checkpoints,end){
 const root=useRef(null),clock=useMotionValue(0),last=useRef(-1),animation=useRef(null);
 const[time,setTime]=useState(0),[visible,setVisible]=useState(false),[intersecting,setIntersecting]=useState(false),[foreground,setForeground]=useState(!document.hidden),[playing,setPlaying]=useState(true),[revision,setRevision]=useState(0);
 const[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const[manualPaused,setManualPaused]=useState(false),[interrupted,setInterrupted]=useState(false),replayHandler=useRef(null);
 const turn=useSyncExternalStore(subscribe,snapshot,snapshot);
 useEffect(()=>{const stop=observeDemoReady(root.current,setVisible,{onViewportChange:setIntersecting});const media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>setReduced(media.matches),visibility=()=>setForeground(!document.hidden);media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);return()=>{stop();media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);};},[]);
 useEffect(()=>clock.on('change',value=>{let index=0;while(index<checkpoints.length&&value>=checkpoints[index])index++;if(index!==last.current){last.current=index;setTime(index?checkpoints[index-1]:0);}}),[clock,checkpoints]);
 useEffect(()=>{if(reduced){animation.current?.stop();clock.set(end);setPlaying(false);}},[reduced,clock,end]);
 const ready=visible&&foreground&&!reduced&&time<end;
 useEffect(()=>{if(!ready&&preferred===id)preferred=null;queue.set(id,ready&&playing);select();return()=>{queue.delete(id);select();};},[id,ready,playing]);
 const active=ready&&turn===id&&playing;
 // Advance one visible checkpoint at a time. Mounting a chart can occupy a
 // slow frame; it must not skip a menu opening and its subsequent selection.
 useEffect(()=>{if(!active)return;const current=clock.get(),next=checkpoints.find(value=>value>current+.5)??end;animation.current=animate(clock,next,{duration:Math.max(0,next-current)/1000/(BUMP_SCENARIO_RATE*1.13),ease:'linear',onComplete:()=>setTime(next)});return()=>animation.current?.stop();},[active,revision,clock,end,time,checkpoints]);
 useEffect(()=>{for(const item of root.current?.getAnimations?.({subtree:true})??[]){if(!visible||!foreground||manualPaused)item.pause();else if(item.playState==='paused')item.play();}},[active,visible,foreground,reduced,time,end,manualPaused]);
 function seek(next,run=false){animation.current?.stop();clock.set(next);if(run&&!reduced)preferred=id;setPlaying(run&&!reduced);if(run)setManualPaused(false);setInterrupted(!run);setRevision(v=>v+1);}
 useIdleReplay({root,visible,intersecting,foreground,reduced,finished:time>=end,interrupted,manualPaused,canRestart:turn===null||turn===id,restMs:3000,onReplay:()=>replayHandler.current?replayHandler.current():seek(0,true)});
 function toggle(){if(time>=end){if(manualPaused)seek(0,true);else{setManualPaused(true);setPlaying(false);}return;}if(playing){setManualPaused(true);setPlaying(false);}else{preferred=id;setManualPaused(false);setPlaying(true);}}
 return{root,clock,time,active,visible,reduced,playing,revision,manualPaused,replayHandler,finished:time>=end,seek,pause:(manual=false)=>{setPlaying(false);setInterrupted(true);if(manual===true)setManualPaused(true);},replay:()=>seek(reduced?end:0,true),toggle};
}
