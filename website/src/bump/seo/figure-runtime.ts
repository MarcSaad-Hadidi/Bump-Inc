import {createLoop as gatedLoop} from '../machines/suppliedRuntime';
export * from '../machines/suppliedRuntime';
// Visibility, tab and shared icon pause only. Keep every supplied native
// movement and step duration at its original rate; no second RAF is introduced.
export function createLoop(stage:Element,tick:(dt:number,clock:number,calm:boolean)=>boolean) {
 return gatedLoop(stage,tick,{motion:1,stage:1});
}
