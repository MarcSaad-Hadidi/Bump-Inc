// Host choreography. The supplied Port artwork/model/live files stay intact.
export const PORT_LOAD_START=.25;
export const PORT_LOAD_CYCLE=1;
export const PORT_LOAD_COUNT=6;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
export function portLoadPose(since:number,index:number){
 const t=clamp((since-PORT_LOAD_START-index*PORT_LOAD_CYCLE)/PORT_LOAD_CYCLE);
 const across=smooth((t-.43)/.29),up=smooth((t-.24)/.19),down=smooth((t-.72)/.18);
 return {t,across,lift:42*up*(1-down),carried:t>=.24&&t<.9,complete:t>=.9};
}
export function portShipX(stage:number,since:number,enter:number,exit:number){
 if(stage===0)return enter*(1-clamp(since/3.4));
 if(stage===4)return exit*clamp((since-.8)/5.2);
 return 0;
}
export function portAnchorDrop(stage:number,since:number){
 if(stage===1)return smooth((since-.3)/1.5);
 if(stage===2||stage===3)return 1;
 // Hoist completely before the vessel starts moving at .8s.
 if(stage===4)return 1-smooth(since/.7);
 return 0;
}
