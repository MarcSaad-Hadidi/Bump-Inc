import {createLoop as nativeLoop} from './suppliedRuntime';
export * from './suppliedRuntime';
export const SECURITY_PLAYBACK_RATE=1.3;
export function createLoop(stage:Element,tick:(dt:number,clock:number,calm:boolean)=>boolean){
 return nativeLoop(stage,tick,{motion:SECURITY_PLAYBACK_RATE,stage:SECURITY_PLAYBACK_RATE});
}
