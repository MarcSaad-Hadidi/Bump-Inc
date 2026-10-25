export const clampCompanyProgress=value=>Math.min(1,Math.max(0,Number.isFinite(value)?value:0));
// Native actions are already activated by Asset. This path never starts or
// advances a clock: each scroll value selects one exact point in every clip.
export function seekCompanyAnimation(native,progress){
 if(!native?.mixer||!native.actions?.size)return false;
 const p=clampCompanyProgress(progress);
 native.manual=true;native.mixer.timeScale=0;
 for(const action of native.actions.values()){
  action.enabled=true;action.paused=true;action.timeScale=0;
  action.clampWhenFinished=true;action.setLoop(2200,1); // THREE.LoopOnce
  action.time=action.getClip().duration*p;
 }
 native.mixer.update(0);native.companyProgress=p;
 return true;
}
export function companyScrollProgress(sheet){
 const animation=sheet?.__experimental_getExistingObject('asset-1')?.value.animations;
 return clampCompanyProgress(animation?.Scene?.progress??0);
}

// Theatre calls this in its value transaction, before the compositor renders.
// It is the sole pose writer; the shared Asset must not reset/play the clip too.
export function applyCompanyAnimationValues(native,animations,reduced=false){
 const progress=reduced?1:clampCompanyProgress(animations?.Scene?.progress??0);
 seekCompanyAnimation(native,progress);
 return progress;
}
