export function demoIsReady(bounds:Pick<DOMRect,'top'|'bottom'|'width'|'height'>,state:{height:number;opening?:string;assisted?:boolean;moving?:string;hidden:boolean}):boolean;
export function observeDemoReady(node:HTMLElement|null,onChange:(ready:boolean)=>void):()=>void;
export function demoReadingMs(title:string,detail:string):number;
export const DEMO_START_MS:number;
export const DEMO_REPLAY_MS:number;
