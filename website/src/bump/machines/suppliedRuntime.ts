import {createLoop as nativeLoop,type Loop} from '../../components/bump-anatomy/shared/runtime';
import {observeDemoReady} from '../ui/demoReady.js';
import {BUMP_PLAYBACK_RATE} from '../ui/playback.js';
import {demoTimelineIsPaused,observeDemoPaused} from '../ui/demoTransport.js';
export * from '../../components/bump-anatomy/shared/runtime';

// Keep the supplied renderers byte-identical. Their own RAF driver is woken
// only on arrival; time spent approaching or leaving never enters their clock.
export function createLoop(stage:Element,tick:(dt:number,clock:number,calm:boolean)=>boolean,rates={motion:BUMP_PLAYBACK_RATE,stage:BUMP_PLAYBACK_RATE}):Loop{
 let ready=false,clock=0,loop:Loop|undefined;
 const host=stage.closest<HTMLElement>('[data-bump-fixed-timing]')??stage as HTMLElement;
 const stop=observeDemoReady(host,next=>{ready=next;if(next)loop?.kick();});
 loop=nativeLoop(stage,(dt,_clock,calm)=>{if(!ready||demoTimelineIsPaused(host))return false;clock+=dt;return tick(dt*rates.motion,clock*rates.stage,calm);});
 const stopPause=observeDemoPaused(host,paused=>{if(!paused)loop?.kick();});
 return {kick:()=>loop?.kick(),calm:()=>loop!.calm(),destroy:()=>{stopPause();stop();loop?.destroy();}};
}
