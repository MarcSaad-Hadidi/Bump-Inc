// Mounted portals retain their rigs. Only scenes visible to the compositor
// need an independent character mixer; full paper hides the native scene.
export function sceneFrameNeeded(index,state,hidden=false){
 if(hidden)return false;
 if(index===undefined)return true;
 const section=state.sectionMap?.get(index);
 if(index!==state.activeSection&&!section?.isActive)return false;
 return Math.abs(state.finalOverlayPosition??-1)>.002||!!section?.transitionProgress;
}
export const sceneFrameDelta=delta=>Math.min(Math.max(0,delta),1/30);
