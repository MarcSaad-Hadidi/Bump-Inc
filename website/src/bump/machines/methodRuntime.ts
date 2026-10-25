// Only the Method import uses this clock adapter. Retain the delivered native
// loop, visibility gating and renderer; no additional timer or animation frame.
import {createLoop as nativeLoop} from './suppliedRuntime';
export * from './suppliedRuntime';
export const METHOD_PLAYBACK_RATE=1.15;
export const METHOD_STAGE_RATE=1;
export function createLoop(stage:Element,tick:(dt:number,clock:number,calm:boolean)=>boolean){
 return nativeLoop(stage,tick,{motion:METHOD_PLAYBACK_RATE,stage:METHOD_STAGE_RATE});
}
