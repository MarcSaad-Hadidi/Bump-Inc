// The supplied tool-map owns its sequence. Reuse the site's settled-arrival,
// tab and inspection gates without changing its native 26-second clock.
import {createLoop as gatedLoop} from './suppliedRuntime';
import {readoutOf as nativeReadout,announcerOf as nativeAnnouncer} from '../../components/bump-anatomy/shared/runtime';
export * from './suppliedRuntime';
export const METHOD_PLAYBACK_RATE=1;
export function methodReadingForLocale(value:string,locale:string){
 if(!locale.startsWith('en'))return value;
 const labels:Record<string,string>={analyse:'analysis',proposition:'proposal',implantation:'implementation'};
 return value.replace(/^(→ )?(analyse|proposition|implantation)(?= · |$)/,(_match,arrow:string|undefined,id:string)=>(arrow||'')+labels[id]);
}
export function readoutOf(root:Element){const say=nativeReadout(root);return(value:string)=>say(methodReadingForLocale(value,document.documentElement.lang));}
export function announcerOf(root:Element){const say=nativeAnnouncer(root);return(value:string)=>say(methodReadingForLocale(value,document.documentElement.lang));}
export function createLoop(stage:Element,tick:(dt:number,clock:number,calm:boolean)=>boolean){
 return gatedLoop(stage,tick,{motion:1,stage:1});
}
