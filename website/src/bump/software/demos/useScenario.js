import {useEffect, useRef, useState} from 'react';
import {useDemoTurn} from './useDemoTurn.js';
import {useIdleReplay} from '../../ui/useIdleReplay.js';
import {BUMP_SCENARIO_RATE} from '/runtime/assets/BumpPlayback.js';
import {observeDemoReady} from '../../ui/demoReady.js';

// A finite clock with discrete checkpoints. No render loop, scroll listener or
// timer remains active outside the viewport or in a background document.
export function useScenario(checkpoints, end, sequenceId) {
  const root = useRef(null);
  const elapsed = useRef(0);
  const generation = useRef(0);
  const [time, setTime] = useState(0);
  const [visible, setVisible] = useState(false);
  const [intersecting, setIntersecting] = useState(false);
  const [foreground, setForeground] = useState(!document.hidden);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(true);
  const [revision, setRevision] = useState(0);
  const [manualPaused,setManualPaused]=useState(false),[interrupted,setInterrupted]=useState(false);
  const replayHandler=useRef(null);


  useEffect(() => {
    const stop=observeDemoReady(root.current,setVisible,{onViewportChange:setIntersecting});
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(media.matches);
    const visibility = () => setForeground(!document.hidden);
    media.addEventListener('change', changed);
    document.addEventListener('visibilitychange', visibility);
    return () => { stop(); media.removeEventListener('change', changed); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    if(reduced) { elapsed.current=end; setTime(end); setPlaying(false); }
  }, [reduced,end]);

  const ready = visible && foreground && playing && !reduced && time < end;
  const {turn,canRestart} = useDemoTurn(sequenceId, visible && foreground && !reduced && time < end);
  const active = ready && turn;
  useEffect(() => {
    if(!active) return;
    const next = checkpoints.find(t => t > elapsed.current + 1) ?? end;
    const initial = elapsed.current, started = performance.now(), currentGeneration=generation.current;
    const timer = setTimeout(() => { elapsed.current=next; setTime(next); }, Math.max(0,next-initial)/BUMP_SCENARIO_RATE);
    return () => { clearTimeout(timer); if(generation.current===currentGeneration)elapsed.current=Math.min(next,initial+(performance.now()-started)*BUMP_SCENARIO_RATE); };
  }, [active,time,revision,checkpoints,end]);

  useEffect(() => {
    const node=root.current;
    if(!node) return;
    // A visitor pauses the scenario clock, not the response to their own click.
    // Let menu/sheet/layout transitions finish; only offscreen/background
    // suspension freezes native CSS/WAAPI work.
    const animations=node.getAnimations?.({subtree:true}) ?? [];
    for(const animation of animations) {
      if(!visible || !foreground || manualPaused) animation.pause();
      else if(animation.playState==='paused') animation.play();
    }
  }, [visible,foreground,playing,time,end,ready,turn,manualPaused]);

  const seek = (next, run=true) => {
    generation.current++; elapsed.current=next; setTime(next); setPlaying(run && !reduced); if(run)setManualPaused(false);setInterrupted(!run);setRevision(x=>x+1);
  };
  useIdleReplay({root,visible,intersecting,foreground,reduced,finished:time>=end,interrupted,manualPaused,canRestart,onReplay:()=>replayHandler.current?replayHandler.current():seek(0)});
  function toggle(){if(time>=end){if(manualPaused)seek(0);else{setManualPaused(true);setPlaying(false);}return;}if(playing){setManualPaused(true);setPlaying(false);}else{setManualPaused(false);setPlaying(true);}}
  return {root,time,visible,active,reduced,playing,revision,manualPaused,replayHandler,finished:time>=end,
    replay:()=>seek(reduced?end:0), seek, pause:()=>{setPlaying(false);setInterrupted(true);},
    toggle};
}
