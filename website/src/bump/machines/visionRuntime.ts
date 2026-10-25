import {createLoop as nativeLoop} from './suppliedRuntime';
import {BUMP_PLAYBACK_RATE} from '../ui/playback.js';
export * from './suppliedRuntime';
// The optics follow the calmer shared motion rate. Compact copy leaves time to read each
// research direction; the source loop still owns all phases and focus changes.
export const VISION_STAGE_RATE=1;
export function createLoop(stage:Element,tick:(dt:number,clock:number,calm:boolean)=>boolean){
 return nativeLoop(stage,tick,{motion:BUMP_PLAYBACK_RATE,stage:VISION_STAGE_RATE});
}
