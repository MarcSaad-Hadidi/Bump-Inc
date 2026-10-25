import {createLoop as nativeLoop} from './suppliedRuntime';
export * from './suppliedRuntime';
export const WORKFLOW_PLAYBACK_RATE=1.4;
export function createLoop(stage:Element,tick:(dt:number,clock:number,calm:boolean)=>boolean){
 return nativeLoop(stage,tick,{motion:WORKFLOW_PLAYBACK_RATE,stage:WORKFLOW_PLAYBACK_RATE});
}
