export function demoTransportRoot(node:Element|null):HTMLElement|null;
export function demoIsPaused(node:Element|null):boolean;
export function demoTimelineIsPaused(node:Element|null):boolean;
export function setDemoInspectionPaused(node:Element|null,paused:boolean):void;
export function observeDemoPaused(node:Element|null,changed:(paused:boolean)=>void,options?:{ignoreInspection?:boolean}):()=>void;
export function mountDemoTransport(node:HTMLElement|null,label?:string):()=>void;
export function createDemoTimeout(node:Element,allowed?:()=>boolean,options?:{ignoreInspection?:boolean}):{readonly pending:boolean;schedule(ms:number,fn:()=>void):void;clear():void;destroy():void};
