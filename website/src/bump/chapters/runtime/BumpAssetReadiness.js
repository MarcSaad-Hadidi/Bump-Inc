// Neighbouring chapters preload before activation. Remember an asset that
// finishes then; its completion must not depend on another gesture or remount.
export function createBumpAssetReadiness({start,finish,notify,schedule=queueMicrotask}){
 let entered=false,loaded=false,finished=false;
 const complete=()=>{if(!entered||!loaded||finished)return;finished=true;finish();notify();};
 return{
  enter(){if(entered)return;entered=true;start();if(loaded)schedule(complete);},
  loaded(){loaded=true;complete();}
 };
}
