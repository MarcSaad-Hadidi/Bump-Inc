// Finite automatic diagram: stop for approval, illustrate the click, then resume.
import {r as React} from '/runtime/assets/components-BdJai906.js';
import {useIdleReplay} from '../ui/useIdleReplay.js';
import {BUMP_PLAYBACK_RATE} from '/runtime/assets/BumpPlayback.js';

export function useWorkflowJourney(stages,ref) {
  const [reduced,setReduced]=React.useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [index,setIndex]=React.useState(0),[playing,setPlaying]=React.useState(false),[visible,setVisible]=React.useState(false),[run,setRun]=React.useState(0);
  const [approvalPhase,setApprovalPhase]=React.useState('waiting'),[foreground,setForeground]=React.useState(!document.hidden);
  const started=React.useRef(false),clock=React.useRef({key:null,elapsed:0});
  const stage=stages[index],waiting=index===2,atEnd=index===stages.length-1;

  React.useEffect(()=>{const changed=()=>setForeground(!document.hidden);document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed);},[]);
  React.useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>{setReduced(media.matches);setPlaying(!media.matches);setApprovalPhase('waiting');setIndex(media.matches?stages.length-1:0);setRun(value=>value+1);started.current=!media.matches;};media.addEventListener('change',change);if(media.matches){setIndex(stages.length-1);setPlaying(false);}return()=>media.removeEventListener('change',change);},[stages.length]);
  React.useEffect(()=>{const node=ref.current;if(!node)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting&&entry.intersectionRatio>=.18),{threshold:.18});observer.observe(node);return()=>observer.disconnect();},[ref]);
  React.useEffect(()=>{if(visible&&!started.current&&!reduced){started.current=true;setPlaying(true);}},[visible,reduced]);

  function approve(){setIndex(value=>value===2?3:value);}
  function reset(){setApprovalPhase('waiting');setIndex(0);setRun(value=>value+1);setPlaying(!reduced);}

  React.useEffect(()=>{
    const key=run+':'+index;
    if(clock.current.key!==key)clock.current={key,elapsed:0};
    if(!playing||!visible||!foreground||atEnd||reduced)return;
    const base=clock.current.elapsed,startedAt=performance.now();
    // Virtual milliseconds at ×2: a legible wait, approach, click, then release.
    // Only this approval milestone produces a demonstration pointer/click.
    const milestones=waiting?[
      [2000,()=>setApprovalPhase('approaching')],
      [3400,()=>setApprovalPhase('clicking')],
      [3900,approve]
    ]:[[stage.duration,()=>{setApprovalPhase('waiting');setIndex(value=>value+1);}]];
    const timers=milestones.filter(([at])=>at>base).map(([at,action])=>setTimeout(action,(at-base)/BUMP_PLAYBACK_RATE));
    return()=>{timers.forEach(clearTimeout);if(clock.current.key===key)clock.current.elapsed=base+(performance.now()-startedAt)*BUMP_PLAYBACK_RATE;};
  },[index,run,playing,visible,foreground,atEnd,reduced,waiting,stage.duration]);

  // This explanatory diagram has no editable data. Hover explanations and
  // choosing an example must not create the apps' 30-second editing delay.
  // Pointer holds, offscreen/background pause and reduced motion stay protected.
  useIdleReplay({root:ref,visible,foreground,reduced,finished:atEnd,onReplay:reset,restMs:2200,idleMs:0});
  const active=playing&&visible&&foreground&&!atEnd&&!reduced;
  return {index,stage,waiting,atEnd,reduced,run,approve,approvalPhase,
    animationPlaying:active&&!waiting,
    approvalCursor:active&&waiting&&approvalPhase!=='waiting'};
}
