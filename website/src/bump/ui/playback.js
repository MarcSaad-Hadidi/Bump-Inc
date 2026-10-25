// Shared wall-clock rate. Scroll positions and visitor reading/idle grace stay
// in their existing units; only animation playback is accelerated.
export const BUMP_PLAYBACK_RATE=1.15;
export const BUMP_SCENARIO_RATE=1.15;
export const motionSeconds=value=>value/BUMP_PLAYBACK_RATE;
export const motionMilliseconds=value=>value/BUMP_PLAYBACK_RATE;

function installDOMPlayback(){
 if(typeof document==='undefined'||document.documentElement.dataset.bumpPlaybackRate)return;
 document.documentElement.dataset.bumpPlaybackRate=String(BUMP_PLAYBACK_RATE);document.documentElement.dataset.bumpScenarioRate=String(BUMP_SCENARIO_RATE);
 let frame=0;
 const sync=()=>{frame=0;document.documentElement.dataset.bumpPlaybackRate=String(BUMP_PLAYBACK_RATE);document.documentElement.dataset.bumpScenarioRate=String(BUMP_SCENARIO_RATE);for(const animation of document.getAnimations()){if(animation.effect?.target?.closest?.('[data-bump-fixed-timing]'))continue;if(animation.playbackRate!==BUMP_PLAYBACK_RATE)animation.updatePlaybackRate(BUMP_PLAYBACK_RATE);}};
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
 // Event-driven: no permanent observer render loop or second scroll controller.
 const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
 for(const event of ['animationstart','transitionrun','pointerup','keydown'])document.addEventListener(event,schedule,{capture:true,passive:true});
 schedule();
}
if(typeof document!=='undefined'){
 if(document.body)installDOMPlayback();else document.addEventListener('DOMContentLoaded',installDOMPlayback,{once:true});
}
