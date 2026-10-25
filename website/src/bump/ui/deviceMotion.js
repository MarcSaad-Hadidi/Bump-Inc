// One orientation stream feeds the existing camera, never synthetic UI input.
const neutral={x:0,y:0},pointer={x:0,y:0},subscribers=new Set();
let state={status:'unsupported',mobile:false,enabled:false},activate=()=>Promise.resolve(false),deactivate=()=>{};
const clamp=n=>Math.max(-1,Math.min(1,n));
const delta=(a,b)=>((a-b+540)%360)-180;
export function orientationPointer(sample,baseline,angle=0){
 if(!baseline||![sample?.beta,sample?.gamma,baseline.beta,baseline.gamma].every(Number.isFinite))return {...neutral};
 const rad=angle*Math.PI/180,roll=delta(sample.gamma,baseline.gamma),pitch=delta(sample.beta,baseline.beta);
 const x=clamp((roll*Math.cos(rad)+pitch*Math.sin(rad))/14),y=-clamp((pitch*Math.cos(rad)-roll*Math.sin(rad))/18)*.9;
 return{x:Math.abs(x)<.012?0:x,y:Math.abs(y)<.012?0:y};
}
// Preserve the 1900 × 900 desktop scene's horizontal field in portrait. The authored camera
// target and scroll animation remain untouched; only the viewing angle adapts.
export function fitPortraitFieldOfView(base,width,height){
 if(width>=height||width<=0||height<=0)return base;
 return Math.min(175,Math.max(base,2*Math.atan(Math.tan(base*Math.PI/360)*(1900/900)/(width/height))*180/Math.PI));
}
export const getDeviceMotionState=()=>state;
// Camera framing is known before React mounts the permission control. Waiting
// for that effect exposed the close desktop lens for the first mobile frames.
export const usesMobileSceneFraming=()=>typeof window==='undefined'?state.mobile:window.innerWidth<=939||window.matchMedia('(pointer: coarse)').matches;
export function subscribeDeviceMotion(callback){subscribers.add(callback);callback(state);return()=>subscribers.delete(callback);}
export const toggleDeviceMotion=()=>state.enabled?deactivate():activate();
export function getBumpScenePointer(fallback){return usesMobileSceneFraming()?(state.enabled?pointer:neutral):fallback;}

export function installDeviceMotion(win=window,doc=document){
 const root=doc.documentElement,media=win.matchMedia('(prefers-reduced-motion: reduce)'),coarse=win.matchMedia('(pointer: coarse)');
 let disposed=false,enabled=false,listening=false,baseline=null,run=0,frame=0,lastPaint=0;
 const supported=!!win.DeviceOrientationEvent&&win.isSecureContext,needsPermission=typeof win.DeviceOrientationEvent?.requestPermission==='function';
 const mobile=()=>coarse.matches||win.innerWidth<=939;
 const publish=status=>{state={status,mobile:mobile(),enabled,supported,needsPermission};root.dataset.bumpGyro=status;for(const callback of subscribers)callback(state);};
 const paint=()=>{frame=0;if(disposed)return;lastPaint=win.performance.now();root.style.setProperty('--bump-tilt-x',String(pointer.x));root.style.setProperty('--bump-tilt-y',String(pointer.y));root.dataset.bumpGyroActive=String(enabled&&Math.abs(pointer.x)+Math.abs(pointer.y)>0);};
 const reset=()=>{baseline=null;pointer.x=pointer.y=0;win.cancelAnimationFrame(frame);paint();};
 const sample=event=>{
  if(!enabled||doc.hidden||media.matches||![event.beta,event.gamma].every(Number.isFinite))return;
  if(!baseline){baseline={beta:event.beta,gamma:event.gamma};publish('active');}
  Object.assign(pointer,orientationPointer(event,baseline,win.screen?.orientation?.angle??win.orientation??0));
  if(!frame&&win.performance.now()-lastPaint>32)frame=win.requestAnimationFrame(paint);
 };
 const listen=()=>{if(!listening){win.addEventListener('deviceorientation',sample,{passive:true});listening=true;}};
 const unlisten=()=>{if(listening){win.removeEventListener('deviceorientation',sample);listening=false;}};
 const remember=value=>{try{win.localStorage.setItem('bump-device-depth',value);}catch{}};
 const off=()=>{run++;enabled=false;unlisten();reset();remember('off');publish('off');return false;};
 const on=async()=>{
  if(!supported||!mobile()||media.matches){publish(media.matches?'reduced':'unsupported');return false;}
  const pending=++run;publish('requesting');
  try{if(needsPermission&&await win.DeviceOrientationEvent.requestPermission()!=='granted'){if(!disposed&&pending===run)publish('denied');return false;}}
  catch{if(!disposed&&pending===run)publish('denied');return false;}
  if(disposed||pending!==run)return false;
  enabled=true;reset();listen();remember('on');publish('waiting');return true;
 };
 activate=on;deactivate=off;
 const visibility=()=>{if(doc.hidden){unlisten();reset();}else if(enabled){reset();listen();}};
 const rotate=()=>reset();
 const policy=()=>{
  if(media.matches||!mobile()){enabled=false;unlisten();reset();publish(media.matches?'reduced':'unsupported');return;}
  let preference;try{preference=win.localStorage.getItem('bump-device-depth');}catch{}
  if(!supported){publish('unsupported');return;}
  if(preference==='off'){publish('off');return;}
  if(needsPermission){publish('permission');return;}
  void on();
 };
 let lastMobile=mobile();const resize=()=>{if(lastMobile!==mobile()){lastMobile=mobile();policy();}};
 doc.addEventListener('visibilitychange',visibility);win.addEventListener('orientationchange',rotate);win.addEventListener('resize',resize);coarse.addEventListener('change',policy);media.addEventListener('change',policy);policy();
 return()=>{disposed=true;run++;unlisten();win.cancelAnimationFrame(frame);enabled=false;Object.assign(pointer,neutral);state={status:'unsupported',mobile:false,enabled:false};delete root.dataset.bumpGyro;delete root.dataset.bumpGyroActive;root.style.removeProperty('--bump-tilt-x');root.style.removeProperty('--bump-tilt-y');doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('orientationchange',rotate);win.removeEventListener('resize',resize);coarse.removeEventListener('change',policy);media.removeEventListener('change',policy);activate=()=>Promise.resolve(false);deactivate=()=>{};};
}
